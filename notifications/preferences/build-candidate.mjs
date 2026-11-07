import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export function preferenceCandidate(source){
 const anchor='async function customerDevices(trackingToken) {';
 if(source.split(anchor).length!==2)throw Error('Review worker helper boundary before staging preferences');
 const candidate=source.replace(anchor,'async function rawCustomerDevices(trackingToken) {').replace("body = stringify(current.lastStatusUpdate || 'Your Ankur Dryice order status was updated.', 170);","body = 'Order ' + orderId + ' · ' + title;");
 return candidate+`\n// REVIEW CANDIDATE ONLY: not deployed; original worker source remains intact.\nasync function customerDevices(trackingToken) {\n if(!trackingToken||! /^[A-Za-z0-9_-]{14,48}$/.test(trackingToken))return [];\n try {\n const orderId=trackingToken.slice(0,trackingToken.lastIndexOf('_'));\n const order=await store().collection('orders').doc(orderId).get(),uid=order.data()?.userId;\n if(uid&&uid!=='guest'&&uid!=='owner_manual_entry'){const prefs=await store().collection('userPrefs').doc(uid).get();if(prefs.data()?.orderUpdates===false)return [];}\n return await rawCustomerDevices(trackingToken);\n } catch { return []; }\n}\n`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const source=readFileSync(new URL('../notificationPush.js',import.meta.url),'utf8'),out=resolve(process.argv[2]||'preferences-review');mkdirSync(out,{recursive:false});mkdirSync(out+'/functions');
 const candidate=preferenceCandidate(source);writeFileSync(out+'/functions/notificationPush.js',candidate);writeFileSync(out+'/functions/index.js',"import {initializeApp} from 'firebase-admin/app';initializeApp();export {notifyNewAnkurOrder,notifyAnkurOrderProgress,notifyAnkurSelfPickup} from './notificationPush.js';\n");
 writeFileSync(out+'/functions/package.json',JSON.stringify({name:'ankur-legacy-preferences-review',private:true,type:'module',main:'index.js',engines:{node:'22'},dependencies:{'firebase-admin':'^13.0.0','firebase-functions':'^6.0.0'}},null,2));
 writeFileSync(out+'/REVIEW.json',JSON.stringify({deploymentApproved:false,originalWorkerModified:false,sourceSha256:createHash('sha256').update(source).digest('hex'),candidateSha256:createHash('sha256').update(candidate).digest('hex'),deploymentBoundary:'Requires separately approved exact existing-orderpush runtime update. Not a new duplicate trigger codebase.',guestPreferences:'Device-local/native unregister; no private public topic.'},null,2));
}
