#!/usr/bin/env python3
"""Initial control-plane evidence from the owner's authenticated Cloud Shell.

Uses only allowlisted HTTP GETs. Never reads business documents or deploys.
The access token and raw API responses are never printed or saved.
"""
import datetime
import hashlib
import json
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request

PROJECT = 'ankur-dryice-app'
PROJECT_NUMBER = '928793147689'
DATABASE = 'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673'
PACKAGE = 'com.ankurdryice.events'
MAX_PAGES = 20
MAX_BYTES = 4 * 1024 * 1024
PROJECT_PATH = 'projects/' + PROJECT
PATHS = {
    'firebase.googleapis.com': [
        r'/v1beta1/projects',
        r'/v1beta1/' + PROJECT_PATH,
        r'/v1beta1/' + PROJECT_PATH + r'/androidApps',
    ],
    'firestore.googleapis.com': [r'/v1/' + PROJECT_PATH + '/databases/' + DATABASE],
    'cloudfunctions.googleapis.com': [r'/v[12]/' + PROJECT_PATH + r'/locations/-/functions'],
    'firebaserules.googleapis.com': [
        r'/v1/' + PROJECT_PATH + r'/releases',
        r'/v1/' + PROJECT_PATH + r'/rulesets/[A-Za-z0-9_-]+',
    ],
    'cloudbilling.googleapis.com': [r'/v1/' + PROJECT_PATH + r'/billingInfo'],
    'serviceusage.googleapis.com': [r'/v1/projects/' + PROJECT_NUMBER + r'/services/fcm\.googleapis\.com'],
}


def allowed_url(url):
    try:
        parsed = urllib.parse.urlsplit(url)
        port = parsed.port
    except ValueError:
        return False
    if (parsed.scheme != 'https' or parsed.username or parsed.password
            or port is not None or parsed.fragment):
        return False
    if not any(re.fullmatch(pattern, parsed.path) for pattern in PATHS.get(parsed.hostname, [])):
        return False
    return all(key in ('pageSize', 'pageToken')
               for key, _ in urllib.parse.parse_qsl(parsed.query, keep_blank_values=True))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward an Authorization header to a redirect target.


class Reader:
    def __init__(self, token, opener=None):
        self._token = token
        self._opener = opener or urllib.request.build_opener(NoRedirect())

    def get(self, url):
        if not allowed_url(url):
            raise ValueError('URL outside the fixed read-only audit scope')
        request = urllib.request.Request(url, method='GET', headers={
            'Authorization': 'Bearer ' + self._token, 'Accept': 'application/json',
        })
        try:
            with self._opener.open(request, timeout=25) as response:
                raw = response.read(MAX_BYTES + 1)
                if len(raw) > MAX_BYTES:
                    return {'state': 'unavailable', 'reason': 'response_size_limit'}
                data = json.loads(raw)
                if not isinstance(data, dict):
                    return {'state': 'unavailable', 'reason': 'invalid_response'}
                return {'state': 'ok', 'data': data}
        except urllib.error.HTTPError as error:
            return {'state': 'unavailable', 'httpStatus': error.code}
        except (urllib.error.URLError, TimeoutError, OSError, ValueError):
            return {'state': 'unavailable', 'reason': 'network_or_response_error'}


def listed(reader, url, key):
    items, unreachable, page_token = [], [], ''
    for _ in range(MAX_PAGES):
        query = {'pageSize': 100}
        if page_token:
            query['pageToken'] = page_token
        result = reader.get(url + '?' + urllib.parse.urlencode(query))
        if result['state'] != 'ok':
            return {**result, 'state': 'partial' if items else 'unavailable', 'items': items}
        data = result['data']
        page = data.get(key, [])
        if not isinstance(page, list) or not all(isinstance(item, dict) for item in page):
            return {'state': 'partial', 'reason': 'invalid_page', 'items': items}
        items.extend(page)
        unreachable.extend(data.get('unreachable', []))
        page_token = data.get('nextPageToken', '')
        if not page_token:
            return {'state': 'partial' if unreachable else 'ok', 'items': items,
                    'unreachableCount': len(unreachable)}
        if not isinstance(page_token, str):
            return {'state': 'partial', 'reason': 'invalid_page_token', 'items': items}
    return {'state': 'partial', 'reason': 'page_limit', 'items': items}


def status(result):
    return {key: value for key, value in result.items() if key not in ('data', 'items')}


def short_id(value):
    return value if isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9_-]{1,128}', value) else 'other_or_unset'


def function_summary(function):
    name = function.get('name', '').split('/')
    trigger = function.get('eventTrigger') or {}
    filters = {item.get('attribute'): item.get('value') for item in trigger.get('eventFilters', [])}
    resource = trigger.get('resource', '')
    document = filters.get('document', '')
    return {
        'name': short_id(name[-1]),
        'region': short_id(name[name.index('locations') + 1]) if 'locations' in name else 'unknown',
        'state': short_id(function.get('state') or function.get('status')),
        'environment': short_id(function.get('environment')),
        'entryPoint': short_id((function.get('buildConfig') or {}).get('entryPoint') or function.get('entryPoint')),
        'runtime': short_id((function.get('buildConfig') or {}).get('runtime') or function.get('runtime')),
        'hasEventTrigger': bool(trigger),
        'namedDatabaseFilterMatches': filters.get('database') == DATABASE,
        'namedDatabaseInV1Resource': '/databases/' + DATABASE + '/' in resource,
        'documentPattern': document if document in ('orders/{orderId}', 'order_tracking/{trackingToken}') else 'other_or_unset',
        'serviceAccountConfigured': bool((function.get('serviceConfig') or {}).get('serviceAccountEmail') or function.get('serviceAccountEmail')),
    }


def rules_summary(reader):
    releases = listed(reader, 'https://firebaserules.googleapis.com/v1/' + PROJECT_PATH + '/releases', 'releases')
    if releases['state'] != 'ok':
        return status(releases)
    expected = PROJECT_PATH + '/releases/cloud.firestore/' + DATABASE
    matches = [release for release in releases['items'] if release.get('name') == expected]
    if len(matches) != 1:
        return {'state': 'unavailable', 'reason': 'exact_named_database_release_not_found'}
    ruleset = matches[0].get('rulesetName', '')
    if not re.fullmatch(PROJECT_PATH + r'/rulesets/[A-Za-z0-9_-]+', ruleset):
        return {'state': 'unavailable', 'reason': 'unexpected_ruleset_resource'}
    result = reader.get('https://firebaserules.googleapis.com/v1/' + ruleset)
    if result['state'] != 'ok':
        return status(result)
    files = (result['data'].get('source') or {}).get('files', [])
    if not files or not all(isinstance(file.get('content'), str) for file in files):
        return {'state': 'unavailable', 'reason': 'rules_source_missing'}
    content = '\n'.join(file['content'] for file in files)
    return {'state': 'ok', 'release': expected, 'ruleset': ruleset,
            'sourceSha256': hashlib.sha256(content.encode()).hexdigest(),
            'fileCount': len(files),
            'collectionMentionsNotAuthorizationProof': {
                path: path in content for path in
                ('push_owner_devices', 'push_team_devices', 'order_push_subscriptions')
            }}


def collect(reader):
    report = {
        'schema': 'ankur-control-plane-audit-v1',
        'collectedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'readOnly': True,
        'target': {'projectId': PROJECT, 'projectNumber': PROJECT_NUMBER, 'databaseId': DATABASE, 'packageName': PACKAGE},
        'notVerified': ['Firebase plugin connection', 'deployed source diff and full Rules authorization',
                        'FCM send permission or delivery logs', 'App Check enforcement', 'IAM role bindings',
                        'Firebase Spark/Blaze plan or deployment cost', 'phone receipt and duplicate behavior'],
    }
    projects = listed(reader, 'https://firebase.googleapis.com/v1beta1/projects', 'results')
    report['accessibleFirebaseProjects'] = {**status(projects),
        'countObserved': len(projects.get('items', [])),
        'targetObserved': any(item.get('projectId') == PROJECT for item in projects.get('items', []))}
    project = reader.get('https://firebase.googleapis.com/v1beta1/' + PROJECT_PATH)
    if project['state'] != 'ok':
        report['project'] = status(project)
        return report
    data = project['data']
    if data.get('projectId') != PROJECT or str(data.get('projectNumber')) != PROJECT_NUMBER:
        report['project'] = {'state': 'unavailable', 'reason': 'target_mismatch_no_further_reads'}
        return report
    report['project'] = {'state': 'ok', 'sourceIdentifiersMatch': True}

    database = reader.get('https://firestore.googleapis.com/v1/' + PROJECT_PATH + '/databases/' + DATABASE)
    if database['state'] == 'ok' and database['data'].get('name') == PROJECT_PATH + '/databases/' + DATABASE:
        report['database'] = {'state': 'ok', 'nameMatches': True,
                              'locationId': short_id(database['data'].get('locationId')),
                              'type': short_id(database['data'].get('type'))}
    else:
        report['database'] = status(database) if database['state'] != 'ok' else {'state': 'unavailable', 'reason': 'database_name_mismatch'}

    for version in ('v1', 'v2'):
        functions = listed(reader, 'https://cloudfunctions.googleapis.com/' + version + '/' + PROJECT_PATH + '/locations/-/functions', 'functions')
        report['functions_' + version] = {**status(functions),
            'functions': [function_summary(function) for function in functions.get('items', [])]}
    report['rules'] = rules_summary(reader)
    apps = listed(reader, 'https://firebase.googleapis.com/v1beta1/' + PROJECT_PATH + '/androidApps', 'apps')
    report['androidApp'] = {**status(apps),
        'matchingPackageCountObserved': sum(app.get('packageName') == PACKAGE for app in apps.get('items', []))}
    billing = reader.get('https://cloudbilling.googleapis.com/v1/' + PROJECT_PATH + '/billingInfo')
    report['billing'] = status(billing)
    if billing['state'] == 'ok':
        enabled = billing['data'].get('billingEnabled')
        report['billing'] = {'state': 'ok', 'billingEnabled': enabled} if isinstance(enabled, bool) else {'state': 'unavailable', 'reason': 'billing_status_missing'}
    fcm = reader.get('https://serviceusage.googleapis.com/v1/projects/' + PROJECT_NUMBER + '/services/fcm.googleapis.com')
    report['fcmApi'] = {**status(fcm), **({'serviceState': short_id(fcm['data'].get('state'))} if fcm['state'] == 'ok' else {})}
    return report


def main():
    try:
        command = subprocess.run(['gcloud', 'auth', 'print-access-token', '--quiet'],
                                 capture_output=True, text=True, timeout=45, check=False)
        token = command.stdout.strip()
        if command.returncode or not token:
            raise RuntimeError('Cloud Shell authentication unavailable')
    except (OSError, subprocess.SubprocessError, RuntimeError):
        print(json.dumps({'state': 'unavailable', 'reason': 'authorize_existing_account_in_cloud_shell'}, indent=2))
        return 1
    print(json.dumps(collect(Reader(token)), indent=2, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
