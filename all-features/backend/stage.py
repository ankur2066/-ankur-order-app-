"""Stage reviewed optional feature runtime and additive Rules. Never deploy."""
from pathlib import Path
import argparse,json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[2]
def stage(out):
    out.mkdir(parents=True,exist_ok=False);runtime=out/'functions';runtime.mkdir()
    for name in ['index.mjs','featureService.mjs']:shutil.copyfile(ROOT/'all-features/backend'/name,runtime/name)
    (runtime/'package.json').write_text(json.dumps({'name':'ankur-feature-suite-review','private':True,'type':'module','main':'index.mjs','engines':{'node':'22'},'dependencies':{'firebase-admin':'^13.0.0','firebase-functions':'^6.0.0'}},indent=2)+'\n')
    base=(ROOT/'billing/review/firestore.product-billing.rules').read_text();fragment=(ROOT/'all-features/backend/feature-fragment.rules').read_text();anchor='    // COLLECTION ACCESS RULES';assert base.count(anchor)==1
    rules=base.replace(anchor,fragment+'\n'+anchor,1);(out/'firestore.rules').write_text(rules)
    (out/'firebase.json').write_text(json.dumps({'functions':[{'source':'functions','codebase':'featuresuite','runtime':'nodejs22'}],'firestore':[{'database':'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673','rules':'firestore.rules'}]},indent=2)+'\n')
    (out/'REVIEW.json').write_text(json.dumps({'deploymentApproved':False,'existingFunctionsModified':False,'rulesSha256':hashlib.sha256(rules.encode()).hexdigest(),'activation':'settings/featureSuite enabled flag is absent/off by default','requiredIamReview':'New runtime service account and named-database transactional writes require least-privilege review before deployment.'},indent=2)+'\n')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);stage(p.parse_args().output)
