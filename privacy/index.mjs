/**
 * STAGED REVIEW ONLY. Do not deploy until Rules, clients, migration and owner
 * approval are complete. Named Firestore DB; explicit App Check on callables.
 */
import {initializeApp,getApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onDocumentWritten} from 'firebase-functions/v2/firestore';
import {createStaffPrivacyService} from './staffContactService.mjs';
initializeApp();
const DATABASE='ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';
const options={region:'asia-southeast1',database:DATABASE,
  serviceAccount:'ankur-feature-suite@ankur-dryice-app.iam.gserviceaccount.com',
  minInstances:0,maxInstances:1,memory:'256MiB',timeoutSeconds:60};
const service=createStaffPrivacyService({
 db:getFirestore(getApp(),DATABASE),
 timestamp:()=>FieldValue.serverTimestamp()
});
for (const source of ['orders','product_orders']) {
  // Both triggers are declared explicitly below; no wildcard collection reads.
}
export const ankurStaffOrdersProjection=onDocumentWritten(
 {...options,document:'orders/{orderId}',retry:true},
 async event=>service.project({sourceCollection:'orders',
   orderId:event.params.orderId,after:event.data?.after?.data() ?? null,occurredAt:Date.parse(event.time)}));
export const ankurStaffProductProjection=onDocumentWritten(
 {...options,document:'product_orders/{orderId}',retry:true},
 async event=>service.project({sourceCollection:'product_orders',
   orderId:event.params.orderId,after:event.data?.after?.data() ?? null,occurredAt:Date.parse(event.time)}));
export const ankurGetOneOrderContact=onCall(
 {...options,enforceAppCheck:true},
 async request=>{
  try { return await service.getOneOrderContact({auth:request.auth,app:request.app,data:request.data}); }
  catch { throw new HttpsError('permission-denied','Contact request not allowed'); }
 });
export const ankurStaffUpdateOrderStatus=onCall(
 {...options,enforceAppCheck:true},
 async request=>{
  try { return await service.updateOrderStatus({auth:request.auth,app:request.app,data:request.data}); }
  catch { throw new HttpsError('permission-denied','Status update not allowed'); }
 });
