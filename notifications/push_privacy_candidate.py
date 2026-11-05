#!/usr/bin/env python3
"""Package notification hardening for code review ONLY, without deployment or credentials."""
import argparse, hashlib, json, os, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'notifications'/'notificationPush.js'
ENTRY=ROOT/'notifications'/'pushOnly.template'
EXPECTED=['notifyNewAnkurOrder','notifyAnkurOrderProgress','notifyAnkurSelfPickup']
DATABASE='ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673'

def prepare(output:Path, commit:str='unknown'):
    source=SOURCE.read_bytes()
    entry=ENTRY.read_bytes()
    text=source.decode('utf-8')
    bootstrap=entry.decode('utf-8')
    if DATABASE not in text: raise ValueError('Named database not pinned')
    if "d.data()?.active === true" not in text or "d.data()?.permissions?.viewOrders === true" not in text:
        raise ValueError('Worker must fail closed on inactive/legacy team users')
    if 'current.lastStatusUpdate ||' in text or 'order.city || order.district' in text:
        raise ValueError('Customer free text would leak into FCM notification')
    if 'request.resource' in text: raise ValueError('Unexpected data-write rules in notification worker')
    exports=re.findall(r'export const (\w+)\s*=',text)
    if exports!=EXPECTED: raise ValueError('Unexpected notification worker exports: '+str(exports))
    if not all(name in bootstrap for name in EXPECTED):raise ValueError('Invalid isolated entrypoint')
    output.mkdir(parents=True,exist_ok=False)
    out=output/'source'
    out.mkdir()
    (out/'notificationPush.js').write_bytes(source)
    (out/'index.js').write_bytes(entry)
    (output/'REVIEW_ONLY.json').write_text(json.dumps({
        'deploymentApproved':False,'projectId':'ankur-dryice-app','databaseId':DATABASE,
        'region':'asia-southeast1','codebase':'orderpush','sourceCommit':commit,
        'notificationWorkerSha256':hashlib.sha256(source).hexdigest(),
        'entrypointSha256':hashlib.sha256(entry).hexdigest(),
        'exports':EXPECTED,
        'requires':'fresh live inventory, current source comparison, owner-approved isolated redeploy and physical devices',
        'productionModified':False
    },indent=2)+'\n')
    # Deliberately omit firebase.json, service-account credentials and package manifests:
    # output is NOT independently deployable.
    return output

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    p=prepare(args.output,os.environ.get('GITHUB_SHA','unknown'))
    print('REVIEW ONLY notification worker SHA:',json.loads((p/'REVIEW_ONLY.json').read_text())['notificationWorkerSha256'])
