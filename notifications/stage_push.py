#!/usr/bin/env python3
"""Stage only three reviewed notification Functions; never deploys or uses network."""
import argparse
import hashlib
import json
from pathlib import Path

PROJECT = 'ankur-dryice-app'
DATABASE = 'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673'

def stage(package, output):
    package = package.resolve()
    manifest = json.loads((package / 'manifest.json').read_text())
    if manifest['artifactType'] != 'review-only-not-deployed' or manifest['deploymentApproved'] is not False:
        raise ValueError('Expected a review package, not implicit deployment authority')
    if manifest['targetFromSource'] != {'projectId': PROJECT, 'databaseId': DATABASE}:
        raise ValueError('Target mismatch')
    required = {'index.js': 'pushOnly.js', 'notificationPush.js': 'notificationPush.js',
                'package.json': 'package.json', 'package-lock.json': 'package-lock.json'}
    data = {}
    for destination, source in required.items():
        relative = 'runtime/firebase-functions/' + source
        path = package / relative
        if path.is_symlink() or not path.resolve().is_relative_to(package):
            raise ValueError('Only regular package files may be staged')
        content = path.read_bytes()
        if hashlib.sha256(content).hexdigest() != manifest['files'][relative]['sha256']:
            raise ValueError('Package file hash mismatch: ' + source)
        data[destination] = content
    pkg = json.loads(data['package.json'])
    if pkg.get('main', 'index.js') != 'index.js' or pkg.get('type') != 'module':
        raise ValueError('Unexpected runtime entry point')
    output.mkdir(parents=True, exist_ok=False)
    runtime = output / 'functions'
    runtime.mkdir()
    for name, content in data.items():
        (runtime / name).write_bytes(content)
    (output / 'firebase.json').write_text(json.dumps({'functions': [{
        'source': 'functions', 'codebase': 'orderpush', 'runtime': 'nodejs22',
        'ignore': ['node_modules', '.git', '*.log']
    }]}, indent=2) + '\n')
    (output / 'stage-manifest.json').write_text(json.dumps({
        'projectId': PROJECT, 'databaseId': DATABASE, 'sourceCommit': manifest['sourceCommit'],
        'deploymentApproved': False, 'codebase': 'orderpush',
        'onlyExports': ['notifyNewAnkurOrder', 'notifyAnkurOrderProgress', 'notifyAnkurSelfPickup'],
        'workerSha256': hashlib.sha256(data['notificationPush.js']).hexdigest(),
    }, indent=2) + '\n')
    return output

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--package', required=True, type=Path)
    p.add_argument('--output', required=True, type=Path)
    a = p.parse_args()
    try:
        result = stage(a.package, a.output)
    except (OSError, ValueError, KeyError) as e:
        p.exit(1, str(e) + '\n')
    print('Staged three notification exports only; no deployment:', result)
