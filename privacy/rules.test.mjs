/** Isolated named-database Firestore security checks, synthetic data only. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire((process.env.ANKUR_RULES_QA_ROOT||'/workspace/rules-qa')+'/package.json');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,query,where,updateDoc,serverTimestamp}=require('firebase/firestore');
const DB='ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';
let env;
const owner=verified=>env.authenticatedContext('owner',{email:'ankurdryicewholesalers@gmail.com',email_verified:verified}).firestore(DB);
const user=uid=>env.authenticatedContext(uid).firestore(DB);
const guest=()=>env.unauthenticatedContext().firestore(DB);
const id='ADI-20261104-ABC123',productId='APO-20261104-ABC123';
const legacy={orderId:id,userId:'buyer',status:'pending',customerPhone:'9000000010',trackingPin:'123456',trackingToken:id+'_123456'};
const product={...legacy,orderId:productId,trackingToken:productId+'_123456'};
const view=(source,orderId)=>({projectionVersion:1,sourceCollection:source,orderId,status:'pending',customerName:'Demo',city:'Lucknow',productName:'Dry Ice',dispatchTiming:'Tomorrow',paymentStatus:'pending_verification',quantityKg:10,quantityUnits:null,updatedAt:new Date()});
before(async()=>{
 assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:8085$/);
 env=await initializeTestEnvironment({projectId:'demo-ankur-staff-privacy',
  firestore:{host:'127.0.0.1',port:8085,rules:readFileSync(process.env.ANKUR_PRIVACY_RULES,'utf8')}});
 await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore(DB);
   for(const [p,data] of Object.entries({
    ['orders/'+id]:legacy,['product_orders/'+productId]:product,
    ['staffOrderViews/orders_'+id]:view('orders',id),
    ['staffOrderViews/product_orders_'+productId]:view('product_orders',productId),
    'users/activeStaff':{role:'staff',active:true,permissions:{viewOrders:true,callCustomer:true,updateStatus:true}},
    'users/inactiveStaff':{role:'staff',active:false,permissions:{viewOrders:true,callCustomer:true}},
    'users/noPermission':{role:'staff',active:true,permissions:{viewOrders:false,callCustomer:true}},
    'users/legacyStaff':{role:'delivery'},
    'users/buyer':{role:'customer'}
   }))await setDoc(doc(db,p),data);
 });
});
after(()=>env?.cleanup());
test('verified owner reads raw orders and customer can read only their own',async()=>{
 for(const path of ['orders/'+id,'product_orders/'+productId]){
  await assertSucceeds(getDoc(doc(owner(true),path)));
  await assertFails(getDoc(doc(owner(false),path)));
  await assertSucceeds(getDoc(doc(user('buyer'),path)));
  await assertFails(getDoc(doc(user('outsider'),path)));
  await assertFails(getDoc(doc(guest(),path)));
 }
 await assertSucceeds(getDocs(collection(owner(true),'orders')));
 await assertSucceeds(getDocs(query(collection(user('buyer'),'orders'),where('userId','==','buyer'))));
 await assertFails(getDocs(collection(user('buyer'),'orders')));
});
test('staff can read sanitized views but never raw phone-bearing order collections',async()=>{
 const db=user('activeStaff');
 for(const path of ['orders/'+id,'product_orders/'+productId]){
  await assertFails(getDoc(doc(db,path)));
  const root=path.split('/')[0];
  await assertFails(getDocs(collection(db,root)));
 }
 for(const path of ['staffOrderViews/orders_'+id,'staffOrderViews/product_orders_'+productId]){
  const found=await assertSucceeds(getDoc(doc(db,path)));
  assert.equal(found.data()?.customerPhone,undefined);
 }
 const list=await assertSucceeds(getDocs(collection(db,'staffOrderViews')));
 assert.equal(list.size,2);
});
test('revoked, unconfigured, missing permission and unauthenticated principals denied',async()=>{
 for(const uid of ['inactiveStaff','noPermission','legacyStaff','outsider']){
  const db=user(uid);
  await assertFails(getDocs(collection(db,'staffOrderViews')));
  await assertFails(getDoc(doc(db,'staffOrderViews/orders_'+id)));
 }
 await assertFails(getDoc(doc(guest(),'staffOrderViews/orders_'+id)));
 await assertFails(getDocs(collection(guest(),'staffOrderViews')));
});
test('no client may publish a forged safe view or read phone/audit/rate documents',async()=>{
 const active=user('activeStaff');
 await assertFails(setDoc(doc(active,'staffOrderViews/forged'),{customerPhone:'9000000010'}));
 await assertFails(setDoc(doc(active,'staffOrderAssignments/orders_'+id+'_activeStaff'),{approved:true}));
 await assertFails(getDoc(doc(active,'staffOrderAssignments/orders_'+id+'_activeStaff')));
 await assertFails(getDocs(collection(active,'staffContactAudit')));
 await assertFails(getDoc(doc(active,'staffContactRates/activeStaff')));
 await assertFails(setDoc(doc(owner(true),'staffContactAudit/fake'),{phone:'9000000010'}));
 await assertSucceeds(setDoc(doc(owner(true),'staffOrderAssignments/orders_'+id+'_activeStaff'),{approved:true,staffUid:'activeStaff',sourceCollection:'orders',orderId:id,expiresAtMs:Date.now()+86400000}));
});
test('staff cannot write raw order or tracking docs, even with updateStatus permission',async()=>{
 const db=user('activeStaff');
 for(const path of ['orders/'+id,'product_orders/'+productId]) {
   await assertFails(updateDoc(doc(db,path),{status:'confirmed',updatedAt:serverTimestamp()}));
 }
 // Direct tracking mutation is forbidden too; server callable updates both.
 for(const path of ['order_tracking/'+id+'_123456','product_order_tracking/'+productId+'_123456']) {
   await assertFails(updateDoc(doc(db,path),{status:'dispatched',updatedAt:serverTimestamp()}));
 }
});
test('status update privileges remain separate from read privileges and require active explicit grants',async()=>{
 const disabled=user('inactiveStaff');
 await assertFails(updateDoc(doc(disabled,'orders',id),{status:'confirmed',updatedAt:serverTimestamp()}));
 const notAllowed=user('noPermission');
 await assertFails(updateDoc(doc(notAllowed,'orders',id),{status:'confirmed',updatedAt:serverTimestamp()}));
});
