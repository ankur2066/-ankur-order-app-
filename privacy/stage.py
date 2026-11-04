#!/usr/bin/env python3
"""STAGED ONLY. Compose least-privilege Rules against reviewed feature Rules.
Never deploy or change the live named database from this script.
"""
from pathlib import Path
import argparse,hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[1]
def stage(base_path,out):
    base=Path(base_path).read_text(encoding='utf-8')
    out.mkdir(parents=True,exist_ok=False)
    assert base.count("function teamPermission(name) {")==1
    before="""return isFieldTeam() && teamData().get('permissions', {}) is map &&
        teamData().get('permissions', {}).get(name, true) == true;"""
    after="""return isFieldTeam() &&
        teamData().get('active', false) == true &&
        teamData().get('permissions', {}) is map &&
        teamData().get('permissions', {}).get(name, false) == true;"""
    assert base.count(before)==1, 'Team permissions must match reviewed baseline'
    rules=base.replace(before,after,1)
    # Firestore Rules are OR-composed across match blocks. Do not just add a
    # restrictive matching block while old staff grants still exist.
    legacy="isAdmin() || canViewOrders() ||"
    product="isOwner() || canViewOrders() ||"
    assert rules.count(legacy)==2, 'Unexpected legacy raw-order match count'
    assert rules.count(product)==1, 'Unexpected product raw-order match count'
    rules=rules.replace(legacy,"isAdmin() ||",2)
    rules=rules.replace(product,"isOwner() ||",1)
    anchor="    match /orders/{orderId} {"
    assert rules.count(anchor)==1
    additions="""
    // Staff projections are created ONLY by trusted Cloud Functions.
    // No PII, tracking PIN/token, exact address, private payment note or phone.
    match /staffOrderViews/{key} {
      allow get, list: if isOwner() || canViewOrders();
      allow create, update, delete: if false;
    }
    // Owner-controlled authorization per (collection, order, staff UID).
    match /staffOrderAssignments/{key} {
      allow get, list, create, update, delete: if isOwner();
    }
    match /staffContactRates/{key} {
      allow read, write: if false;
    }
    match /staffContactAudit/{key} {
      allow get, list: if isOwner();
      allow create, update, delete: if false;
    }

"""
    rules=rules.replace(anchor,additions+anchor,1)
    (out/'firestore.rules').write_text(rules,encoding='utf-8')
    functions=out/'functions';functions.mkdir()
    for name in ['index.mjs','staffContactService.mjs']:
        shutil.copyfile(ROOT/'privacy'/name,functions/name)
    (functions/'package.json').write_text(json.dumps({
      'name':'ankur-staff-privacy-review-only','private':True,'type':'module',
      'main':'index.mjs','engines':{'node':'22'},
      'dependencies':{'firebase-admin':'^13.0.0','firebase-functions':'^6.0.0'}
    },indent=2)+'\n')
    (out/'REVIEW_ONLY.json').write_text(json.dumps({
      'productionDeploymentApproved':False,'clientCutoverComplete':False,
      'legacyStaffReadWillBeRemoved':True,
      'requires':'Owner-approved migration, backfill, endpoint QA, Firebase named-DB backup+rollback, physical device smoke tests',
      'namedDatabase':'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673',
      'firestoreRulesSha256':hashlib.sha256(rules.encode()).hexdigest(),
      'note':'NO firebase.json is emitted to prevent accidental deployment'
    },indent=2)+'\n')
    print('Staged privacy Rules and functions. Production deployment NOT authorized.')
if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--base',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    stage(args.base,args.output)
