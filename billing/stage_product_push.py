"""Create an isolated, review-only productpush package. No network or deployment."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def stage(output):
    worker=(ROOT/'notifications/notificationPush.js').read_text()
    marker='/**\n * New customer/owner-created order'
    assert worker.count(marker)==1, 'Audited worker helper boundary changed; review required'
    common=worker.split(marker)[0]+ '\nexport {TRIGGER,ownerDevices,teamDevices,customerDevices,sendNotification,store};\n'
    output.mkdir(parents=True,exist_ok=False)
    runtime=output/'functions';runtime.mkdir()
    files={'deliveryCommon.mjs':common,'productPush.mjs':(ROOT/'billing/productPush.mjs').read_text(),
      'index.js':"import {initializeApp} from 'firebase-admin/app';\ninitializeApp();\nexport {notifyNewAnkurProductOrder,notifyAnkurProductOrderProgress} from './productPush.mjs';\n",
      'package.json':json.dumps({'name':'ankur-productpush-review','private':True,'type':'module','main':'index.js','engines':{'node':'22'},'dependencies':{'firebase-admin':'^13.0.0','firebase-functions':'^6.0.0'}},indent=2)+'\n'}
    for name,body in files.items():(runtime/name).write_text(body)
    (output/'firebase.json').write_text(json.dumps({'functions':[{'source':'functions','codebase':'productpush','runtime':'nodejs22'}]},indent=2)+'\n')
    (output/'review-manifest.json').write_text(json.dumps({'deploymentApproved':False,'codebase':'productpush','projectId':'ankur-dryice-app','databaseId':'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673','onlyExports':['notifyNewAnkurProductOrder','notifyAnkurProductOrderProgress'],'existingOrderpushModified':False,'files':{name:hashlib.sha256(body.encode()).hexdigest() for name,body in files.items()}},indent=2)+'\n')
    print('Review-only productpush package:',output)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',required=True,type=Path);stage(parser.parse_args().output)
