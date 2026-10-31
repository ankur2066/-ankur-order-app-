#!/usr/bin/env python3
"""Package a complete backend for review; performs no network or deployment."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import zipfile

DATABASE = 'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673'
ARCHIVE_BLOB = '7e790aa79f80db6bd93fdf5d04db4209772047aa'


def package(root, output):
    root = root.resolve()
    source = (root / 'Ankur_Order_App_Upload_GitHub.zip').read_bytes()
    blob = hashlib.sha1(b'blob ' + str(len(source)).encode() + b'\0' + source).hexdigest()
    if blob != ARCHIVE_BLOB:
        raise ValueError('Original source archive does not match the reviewed baseline')
    cli = json.loads((root / 'firebase.json').read_text())
    if cli.get('firestore', {}).get('database') != DATABASE:
        raise ValueError('Explicit reviewed named database is required; no default fallback')
    inputs = {
        'runtime/firebase-functions/' + name: 'firebase-functions/' + name
        for name in ('index.js', 'notificationPush.js', 'pickupPolicy.js', 'package.json', 'package-lock.json')
    }
    inputs.update({
        'review/firestore.source-only.rules': 'firestore.rules',
        'review/firebase.source-only.json': 'firebase.json',
        'review/firestore-push-fragment.rules': 'notifications/firestore-push-fragment.rules',
        'review/ISSUE-11-AUDIT.md': 'notifications/ISSUE-11-AUDIT.md',
        'review/live_readonly_audit.py': 'notifications/live_readonly_audit.py',
        'review/CLOUD-SHELL-HINDI.md': 'notifications/CLOUD-SHELL-HINDI.md',
        'review/RELEASE-STATUS-HINDI.md': 'notifications/RELEASE-STATUS-HINDI.md',
    })
    files = {}
    for destination, relative in inputs.items():
        path = root / relative
        if path.is_symlink() or not path.resolve().is_relative_to(root) or not path.is_file():
            raise ValueError('Required regular package input missing: ' + relative)
        files[destination] = path.read_bytes()
    manifest_package = json.loads(files['runtime/firebase-functions/package.json'])
    lock = json.loads(files['runtime/firebase-functions/package-lock.json'])
    if lock.get('packages', {}).get('', {}).get('dependencies') != manifest_package.get('dependencies'):
        raise ValueError('Runtime dependency lock does not match package.json')
    commit = os.environ.get('GITHUB_SHA', 'local-unverified')
    if commit != 'local-unverified' and not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('Invalid CI source commit')
    files['NOT-DEPLOYED.md'] = (
        '# Backend review package — NOT DEPLOYED\n\n'
        'This is not an Android APK or an approved production release.\n'
        'The runtime includes index.js, notificationPush.js, pickupPolicy.js and a dependency lock.\n'
        'No credentials, node_modules, signing keys or business documents are packaged.\n\n'
        'The review/ Rules and Firebase configuration are generated from the source archive,\n'
        'not captured from production. Do not overwrite live Rules or deploy an entire codebase\n'
        'from these files. No executable deployment configuration is placed at package root.\n'
        'The runtime also exports the existing changeSelfPickup callable; its deployed version\n'
        'and database must be inventoried before selecting any deployment changes.\n\n'
        'Required before owner approval: authenticated live project/named-database inventory,\n'
        'current Rules/functions diff, billing plan and expected cost, exact resource rollback,\n'
        'and an authorized test order/devices. Live FCM receipt remains unverified.\n\n'
        'Source commit: ' + commit + '\n'
    ).encode()
    manifest = {
        'artifactType': 'review-only-not-deployed', 'sourceCommit': commit,
        'sourceArchiveGitBlob': blob, 'liveTargetVerified': False,
        'deploymentApproved': False,
        'targetFromSource': {'projectId': 'ankur-dryice-app', 'databaseId': DATABASE},
        'files': {name: {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
                  for name, data in sorted(files.items())},
    }
    files['manifest.json'] = (json.dumps(manifest, indent=2, sort_keys=True) + '\n').encode()
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('xb') as stream, zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data)
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('.'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        result = package(args.root, args.output)
    except (ValueError, OSError) as error:
        parser.exit(1, str(error) + '\n')
    print('Packaged', len(result['files']), 'review files; no deployment performed.')
