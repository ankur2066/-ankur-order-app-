/** All exploit reproductions below use synthetic documents in a demo emulator. */
import test, { before, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, getDocs, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
const baseline = process.env.ANKUR_RULES_BASELINE === '1';
const DB = 'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';
const OWNER = 'ankurdryicewholesalers@gmail.com';
const ID = 'ADI-20261031-ABCD';
const TOKEN = ID + '_123456';
let env;
const profile = uid => env.authenticatedContext(uid, {email: uid + '@example.test', email_verified: true}).firestore(DB);
const owner = verified => env.authenticatedContext('owner', {email: OWNER, email_verified: verified}).firestore(DB);
const guest = () => env.unauthenticatedContext().firestore(DB);
const order = (id = ID) => ({ orderId:id, trackingToken:id+'_123456', trackingPin:'123456',
  customerName:'Synthetic Test',customerPhone:'9999999999',district:'Test district',quantityKg:10,
  dispatchTiming:'Test slot',productName:'Dry Ice',dryIcePricePerKg:50,dryIceSubtotal:500,
  thermocolPricePerKg:10,thermocolSubtotal:100,transportPrice:0,totalAmount:600,
  status:'pending',paymentStatus:'pending_verification',paymentMethod:'manual_verification',userId:'guest',
  createdAt:serverTimestamp(),updatedAt:serverTimestamp() });
const tracking = o => ({ orderId:o.orderId, trackingToken:o.trackingToken,status:o.status,productName:o.productName,
  quantityKg:o.quantityKg,district:o.district,dispatchTiming:o.dispatchTiming,paymentStatus:o.paymentStatus,
  lastStatusUpdate:'Order received',createdAt:serverTimestamp(),updatedAt:serverTimestamp() });
const book = (o, t = tracking(o)) => { const db=guest(); const b=writeBatch(db);
  b.set(doc(db,'orders',o.orderId),o);b.set(doc(db,'order_tracking',o.trackingToken),t);return b.commit(); };
before(async () => {
  env=await initializeTestEnvironment({projectId:'demo-ankur-live-'+(baseline?'baseline':'candidate'),
    firestore:{host:'127.0.0.1',port:8080,rules:readFileSync(new URL(baseline?'firestore.baseline.rules':'firestore.candidate.rules',import.meta.url),'utf8')}});
  await env.withSecurityRulesDisabled(async ctx => {
    const db=ctx.firestore(DB);await setDoc(doc(db,'orders',ID),order());await setDoc(doc(db,'order_tracking',TOKEN),tracking(order()));
    for (const [uid,data] of Object.entries({ legacy:{role:'staff'}, delivery:{role:'delivery'},
      denied:{role:'staff',permissions:{viewOrders:false,updateStatus:false}},
      viewOnly:{role:'staff',permissions:{viewOrders:true,updateStatus:false}} })) await setDoc(doc(db,'users',uid),data);
  });
});
after(async()=>env?.cleanup());
test('captured self-promotion exploit reproduces only in baseline; proposed Rules block it',async()=>{
  const db=profile('attacker');const promotion=setDoc(doc(db,'users','attacker'),{role:'admin'});
  if(baseline){await assertSucceeds(promotion);await assertSucceeds(getDocs(collection(db,'orders')));}
  else {await assertFails(promotion);await assertFails(getDocs(collection(db,'orders')));}
});
test('only verified owner may manage privileged profiles in candidate',async()=>{
  await assertSucceeds(setDoc(doc(owner(true),'users','approvedTeam'),{role:'staff',permissions:{viewOrders:true}}));
  const write=setDoc(doc(owner(false),'users','unverifiedTeam'),{role:'staff'});
  await (baseline?assertSucceeds(write):assertFails(write));
});
test('legacy staff and delivery retain order reads and status updates',async()=>{
  for(const uid of ['legacy','delivery']){
    await assertSucceeds(getDoc(doc(profile(uid),'orders',ID)));
    await assertSucceeds(updateDoc(doc(profile(uid),'orders',ID),{status:'confirmed',updatedAt:serverTimestamp()}));
  }
});
test('explicit view denial and update denial are enforced in candidate',async()=>{
  const read=getDoc(doc(profile('denied'),'orders',ID));await (baseline?assertSucceeds(read):assertFails(read));
  await assertSucceeds(getDoc(doc(profile('viewOnly'),'orders',ID)));
  for(const path of ['orders/'+ID,'order_tracking/'+TOKEN]){
    const write=updateDoc(doc(profile('viewOnly'),path),{status:'dispatched',updatedAt:serverTimestamp(),...(path.startsWith('order_tracking')?{lastStatusUpdate:'Dispatch'}:{})});
    await (baseline?assertSucceeds(write):assertFails(write));
  }
});
test('customer profile edits work; own role/permission edits cannot escalate in candidate',async()=>{
  const db=profile('customer');await assertSucceeds(setDoc(doc(db,'users','customer'),{customerName:'Test',city:'Test',updatedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(db,'users','customer'),{customerName:'Updated',updatedAt:serverTimestamp()}));
  const write=updateDoc(doc(db,'users','customer'),{role:'staff',permissions:{viewOrders:true}});
  await (baseline?assertSucceeds(write):assertFails(write));
});
test('existing guest booking batch and secret tracking remain compatible',async()=>{
  const o=order('ADI-20261031-NORMAL');await assertSucceeds(book(o));
  await assertSucceeds(getDoc(doc(guest(),'order_tracking',o.trackingToken)));
  await assertFails(getDoc(doc(guest(),'orders',o.orderId)));
  await assertFails(getDocs(collection(guest(),'order_tracking')));
});
test('forged payment_verified booking is denied in candidate',async()=>{
  const o={...order('ADI-20261031-FORGE'),paymentStatus:'payment_verified'};
  await (baseline?assertSucceeds(book(o)):assertFails(book(o)));
});
test('tokens were blocked by baseline; candidate permits owner registration without token reads',async()=>{
  const path='push_owner_devices/testDevice123';const db=owner(true);
  const write=setDoc(doc(db,path),{token:'synthetic_'.repeat(12),platform:'android',updatedAt:serverTimestamp()});
  await (baseline?assertFails(write):assertSucceeds(write));
  await assertFails(getDoc(doc(db,path)));
});
test('unrelated product catalog and rate reads remain available',async()=>{
  await assertSucceeds(getDocs(collection(guest(),'products')));
  await assertSucceeds(getDocs(collection(guest(),'settings')));
  await assertFails(setDoc(doc(profile('legacy'),'settings','rates'),{dryIceRate:1}));
});
test('existing transport-total incompatibility remains visible; no pricing semantics silently changed',async()=>{
  const o={...order('ADI-20261031-TRANS'),transportPrice:5,totalAmount:650};
  await assertFails(book(o)); // old client treats transport as per kg; live Rules use a flat amount.
});
