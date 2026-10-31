"""Offline safety tests: no authentication, network or live Firebase operations."""
import contextlib
import io
import json
import unittest
import urllib.error
import urllib.parse
from unittest.mock import patch

import live_readonly_audit as audit


class FakeReader:
    def __init__(self, replacements=None):
        project = audit.PROJECT_PATH
        self.calls = []
        self.pages = {
            'https://firebase.googleapis.com/v1beta1/projects': {'results': [{'projectId': audit.PROJECT}]},
            'https://firebase.googleapis.com/v1beta1/' + project: {'projectId': audit.PROJECT, 'projectNumber': audit.PROJECT_NUMBER},
            'https://firestore.googleapis.com/v1/' + project + '/databases/' + audit.DATABASE: {
                'name': project + '/databases/' + audit.DATABASE, 'locationId': 'asia-south1', 'type': 'FIRESTORE_NATIVE'},
            'https://cloudfunctions.googleapis.com/v1/' + project + '/locations/-/functions': {'functions': []},
            'https://cloudfunctions.googleapis.com/v2/' + project + '/locations/-/functions': {'functions': [{
                'name': project + '/locations/asia-south1/functions/notifyNewAnkurOrder',
                'state': 'ACTIVE', 'environment': 'GEN_2',
                'buildConfig': {'runtime': 'nodejs22', 'entryPoint': 'notifyNewAnkurOrder',
                                'environmentVariables': {'SECRET': 'PRIVATE_BUILD_SECRET'}},
                'serviceConfig': {'environmentVariables': {'TOKEN': 'PRIVATE_RUNTIME_TOKEN'},
                                  'serviceAccountEmail': 'PRIVATE_ACCOUNT_EMAIL'},
                'eventTrigger': {'eventFilters': [{'attribute': 'database', 'value': audit.DATABASE},
                                                  {'attribute': 'document', 'value': 'orders/{orderId}'}]},
            }]},
            'https://firebaserules.googleapis.com/v1/' + project + '/releases': {'releases': [
                {'name': project + '/releases/cloud.firestore', 'rulesetName': project + '/rulesets/default'},
                {'name': project + '/releases/cloud.firestore/' + audit.DATABASE, 'rulesetName': project + '/rulesets/named'},
            ]},
            'https://firebaserules.googleapis.com/v1/' + project + '/rulesets/named': {
                'source': {'files': [{'name': 'firestore.rules', 'content': '// PRIVATE_RULES_CONTENT\n// push_owner_devices'}]}},
            'https://firebase.googleapis.com/v1beta1/' + project + '/androidApps': {'apps': [
                {'packageName': audit.PACKAGE, 'apiKey': 'PRIVATE_API_KEY'},
            ]},
            'https://cloudbilling.googleapis.com/v1/' + project + '/billingInfo': {
                'billingEnabled': True, 'billingAccountName': 'PRIVATE_BILLING_ACCOUNT'},
            'https://serviceusage.googleapis.com/v1/projects/' + audit.PROJECT_NUMBER + '/services/fcm.googleapis.com': {'state': 'ENABLED'},
        }
        self.pages.update(replacements or {})

    def get(self, url):
        assert audit.allowed_url(url), 'unapproved read: ' + url
        self.calls.append(url)
        base = url.split('?')[0]
        data = self.pages[base]
        if isinstance(data, list):
            data = data.pop(0)
        return data if 'httpStatus' in data else {'state': 'ok', 'data': data}


class AuditTests(unittest.TestCase):
    def test_only_fixed_control_plane_paths_are_allowed(self):
        for url in [
            'https://firestore.googleapis.com/v1/' + audit.PROJECT_PATH + '/databases/' + audit.DATABASE + '/documents/orders',
            'https://firestore.googleapis.com/v1/' + audit.PROJECT_PATH + '/databases/(default)',
            'https://cloudfunctions.googleapis.com/v2/' + audit.PROJECT_PATH + '/locations/asia-south1/functions/name:call',
            'https://fcm.googleapis.com/v1/' + audit.PROJECT_PATH + '/messages:send',
            'https://firebaserules.googleapis.com/v1/' + audit.PROJECT_PATH + '/releases/name',
            'https://firebase.googleapis.com/v1beta1/projects/other-project',
            'http://firebase.googleapis.com/v1beta1/projects',
            'https://firebase.googleapis.com.evil.test/v1beta1/projects',
            'https://firebase.googleapis.com:invalid/v1beta1/projects',
            'https://attacker@firebase.googleapis.com/v1beta1/projects',
            'https://firebase.googleapis.com/v1beta1/projects?access_token=secret',
        ]:
            with self.subTest(url=url):
                self.assertFalse(audit.allowed_url(url))

    def test_metadata_report_excludes_credentials_and_raw_sources(self):
        reader = FakeReader()
        report = audit.collect(reader)
        encoded = json.dumps(report)
        self.assertNotIn('PRIVATE_', encoded)
        self.assertTrue(report['readOnly'])
        self.assertTrue(report['project']['sourceIdentifiersMatch'])
        self.assertEqual(report['database']['state'], 'ok')
        self.assertEqual(report['androidApp']['matchingPackageCountObserved'], 1)
        self.assertTrue(report['functions_v2']['functions'][0]['namedDatabaseFilterMatches'])
        self.assertEqual(report['billing'], {'state': 'ok', 'billingEnabled': True})
        self.assertEqual(report['rules']['fileCount'], 1)
        self.assertFalse(any('rulesets/default' in url or '/documents/' in url for url in reader.calls))
        self.assertIn('phone receipt and duplicate behavior', report['notVerified'])

    def test_wrong_project_number_stops_before_resource_reads(self):
        reader = FakeReader({'https://firebase.googleapis.com/v1beta1/' + audit.PROJECT_PATH: {
            'projectId': audit.PROJECT, 'projectNumber': 'wrong'}})
        report = audit.collect(reader)
        self.assertEqual(report['project']['reason'], 'target_mismatch_no_further_reads')
        self.assertEqual(len(reader.calls), 2)

    def test_default_rules_release_never_substitutes_for_named_database(self):
        url = 'https://firebaserules.googleapis.com/v1/' + audit.PROJECT_PATH + '/releases'
        reader = FakeReader({url: {'releases': [
            {'name': audit.PROJECT_PATH + '/releases/cloud.firestore', 'rulesetName': audit.PROJECT_PATH + '/rulesets/default'}]}})
        report = audit.collect(reader)
        self.assertEqual(report['rules']['reason'], 'exact_named_database_release_not_found')
        self.assertFalse(any('/rulesets/' in url for url in reader.calls))

    def test_denied_functions_and_billing_stay_unavailable_not_empty_or_free(self):
        reader = FakeReader({
            'https://cloudfunctions.googleapis.com/v2/' + audit.PROJECT_PATH + '/locations/-/functions': {'state': 'unavailable', 'httpStatus': 403},
            'https://cloudbilling.googleapis.com/v1/' + audit.PROJECT_PATH + '/billingInfo': {'state': 'unavailable', 'httpStatus': 403},
        })
        report = audit.collect(reader)
        self.assertEqual(report['functions_v2']['state'], 'unavailable')
        self.assertEqual(report['billing'], {'state': 'unavailable', 'httpStatus': 403})

    def test_paginated_results_and_unreachable_regions_are_not_reported_as_complete(self):
        url = 'https://cloudfunctions.googleapis.com/v2/' + audit.PROJECT_PATH + '/locations/-/functions'
        reader = FakeReader({url: [
            {'functions': [], 'nextPageToken': 'page/2?opaque'},
            {'functions': [{'name': 'second'}], 'unreachable': ['asia-south1']},
        ]})
        result = audit.listed(reader, url, 'functions')
        self.assertEqual(result['state'], 'partial')
        self.assertEqual(result['unreachableCount'], 1)
        self.assertEqual(len(result['items']), 1)
        self.assertIn('pageToken=page%2F2%3Fopaque', reader.calls[1])

    def test_http_reader_sends_get_without_body_and_never_outputs_error_payload(self):
        class Opener:
            def open(self, request, timeout):
                self.request = request
                raise urllib.error.HTTPError(request.full_url, 403, 'PRIVATE_REASON', {}, io.BytesIO(b'PRIVATE_ERROR_BODY'))
        opener = Opener()
        result = audit.Reader('PRIVATE_ACCESS_TOKEN', opener).get('https://firebase.googleapis.com/v1beta1/projects')
        self.assertEqual(result, {'state': 'unavailable', 'httpStatus': 403})
        self.assertEqual(opener.request.get_method(), 'GET')
        self.assertIsNone(opener.request.data)
        self.assertEqual(opener.request.get_header('Authorization'), 'Bearer PRIVATE_ACCESS_TOKEN')
        self.assertIsNone(audit.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.test'))

    def test_authentication_failure_does_not_print_cli_error_or_start_login(self):
        with patch.object(audit.subprocess, 'run') as run:
            run.return_value.returncode = 1
            run.return_value.stdout = ''
            run.return_value.stderr = 'PRIVATE_AUTH_ERROR'
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                self.assertEqual(audit.main(), 1)
            self.assertNotIn('PRIVATE_', output.getvalue())
            self.assertEqual(run.call_args.args[0], ['gcloud', 'auth', 'print-access-token', '--quiet'])


if __name__ == '__main__':
    unittest.main()
