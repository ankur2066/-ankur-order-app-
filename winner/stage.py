#!/usr/bin/env python3
"""Stage Daily Winner Rules against the privacy reviewed named-DB Rules.
NO deployment config emitted, no live records written.
"""
from pathlib import Path
import argparse,hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[1]
def stage(base,out):
    rules=Path(base).read_text(encoding='utf-8')
    out.mkdir(parents=True,exist_ok=False)
    anchor='    match /orders/{orderId} {'
    assert rules.count(anchor)==1
    fragment="""    // One per India date, server-written. No number, address or customer UID.
    match /dailyWinners/{dateKey} {
      allow get: if dateKey.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$') &&
        resource.data.get('active', false) == true;
      allow list, create, update, delete: if false;
    }
    match /dailyWinnerPrivate/{dateKey} {
      allow get, list: if isOwner();
      allow create, update, delete: if false;
    }
    match /dailyWinnerAudit/{auditId} {
      allow get, list: if isOwner();
      allow create, update, delete: if false;
    }
"""
    rules=rules.replace(anchor,fragment+anchor,1)
    (out/'firestore.rules').write_text(rules,encoding='utf-8')
    fx=out/'functions';fx.mkdir()
    for name in ['index.mjs','dailyWinnerService.mjs']:
        shutil.copyfile(ROOT/'winner'/name,fx/name)
    (fx/'package.json').write_text(json.dumps({
      'name':'ankur-winner-review-only','private':True,'type':'module',
      'main':'index.mjs','engines':{'node':'22'},
      'dependencies':{
        'firebase-admin':'^13.0.0',
        'firebase-functions':'^6.0.0'
      }},indent=2)+'\n')
    (out/'REVIEW_ONLY.json').write_text(json.dumps({
      'deploymentApproved':False,'defaultEnabled':False,'requiresOwnerConsent':True,
      'autoSchedule':'21:00 Asia/Kolkata; deploy only after explicit approval',
      'database':'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673',
      'rulesSha256':hashlib.sha256(rules.encode()).hexdigest(),
      'note':'NEVER publish or deploy this artifact without a current-rule diff and approved migration. No firebase.json emitted.'
    },indent=2)+'\n')
    print('PASS: staged Daily Winner privately, no firebase deployment')
if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--base',required=True)
    p.add_argument('--output',required=True)
    a=p.parse_args()
    stage(a.base,Path(a.output))
