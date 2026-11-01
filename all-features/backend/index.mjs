import {initializeApp,getApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onDocumentUpdated} from 'firebase-functions/v2/firestore';
import {createFeatureService} from './featureService.mjs';
initializeApp();
const DATABASE='ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';
const options={region:'asia-southeast1',minInstances:0,maxInstances:1,memory:'256MiB',timeoutSeconds:60};
const db=getFirestore(getApp(),DATABASE);
const service=createFeatureService({db,timestamp:()=>FieldValue.serverTimestamp()});
export const ankurFeatureAction=onCall({...options,enforceAppCheck:true},async request=>{
 try{return await service(request.auth,request.data);}catch(e){console.warn('Feature action denied',{action:String(request.data?.action||'').slice(0,40)});throw new HttpsError('failed-precondition','Action could not be completed. Check your access, configuration and submitted values.');}
});
async function delivered(event){
 const before=event.data?.before?.data(),order=event.data?.after?.data();if(!before||!order||before.status==='delivered'||order.status!=='delivered'||order.isTrash)return;
 const config=await db.doc('settings/featureSuite').get();if(config.data()?.enabled!==true)return;
 const id=event.params.orderId;const ref=db.doc('invoices/'+id);
 await db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists)return;
 const amount=order.billingVersion===2?order.billing.totalPaise:Math.round(order.totalAmount*100);if(!Number.isSafeInteger(amount)||amount<=0||amount>9900000)throw Error('Invalid receipt total');
 tx.create(ref,{orderId:id,userId:order.userId,title:'Commercial Receipt',taxInvoice:false,customerName:order.customerName,productName:order.productName||'Dry Ice',quantity:order.billingVersion===2?order.billing.quantityUnits/(order.billing.unit==='kg'?1000:1):order.quantityKg,unit:order.billingVersion===2?order.billing.unit:'kg',totalPaise:amount,createdAt:FieldValue.serverTimestamp()});});
}
export const ankurDeliveredReceipt=onDocumentUpdated({...options,database:DATABASE,document:'orders/{orderId}',retry:true},delivered);
export const ankurProductDeliveredReceipt=onDocumentUpdated({...options,database:DATABASE,document:'product_orders/{orderId}',retry:true},delivered);
