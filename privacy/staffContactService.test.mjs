import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStaffPrivacyService,projectionId,staffSafeProjection,normalizeContactPhone,validStaffStatusTransition} from './staffContactService.mjs';

const STAMP=new Date('2026-11-04T10:00:00.000Z');
function fixture() {
 const docs=new Map(),changes=[];
 let tick=Date.parse(STAMP), audit=0;
 const db={
  doc(path){return {path,set:async data=>docs.set(path,data),delete:async()=>docs.delete(path)};},
  collection(path){return {doc:()=>db.doc(path+'/event'+(++audit))};},
  async runTransaction(work) {
   const pending=[];
   const tx={
    get:async ref=>({exists:docs.has(ref.path),data:()=>docs.get(ref.path)}),
    set:(ref,data)=>pending.push(()=>docs.set(ref.path,data)),
    delete:(ref)=>pending.push(()=>docs.delete(ref.path)),
    update:(ref,data)=>pending.push(()=>docs.set(ref.path,{...docs.get(ref.path),...data})),
    create:(ref,data)=>pending.push(()=>{if(docs.has(ref.path))throw Error('exists');docs.set(ref.path,data);})
   };
   const result=await work(tx);
   pending.forEach(f=>f());changes.push(pending.length);
   return result;
  }
 };
 const service=createStaffPrivacyService({db,now:()=>tick,timestamp:()=>new Date(tick)});
 const orderId='ADI-20261104-ABC123',sourceCollection='orders',uid='staffABC';
 const key=projectionId(sourceCollection,orderId);
 const auth={uid,token:{email:'staff@example.test'}},app={appId:'demo'};
 const data={sourceCollection,orderId};
 docs.set('users/'+uid,{role:'staff',active:true,permissions:{viewOrders:true,callCustomer:true,updateStatus:true}});
 docs.set('orders/'+orderId,{orderId,status:'pending',trackingToken:orderId+'_123456',customerName:'Customer A',
   customerPhone:'8896332000',trackingPin:'123456',city:'Lucknow',address:'Secret street',quantityKg:10,
   paymentNotes:'private payment note',userId:'customer123'});
 docs.set('order_tracking/'+orderId+'_123456',{orderId,status:'pending',paymentStatus:'pending_verification'});
 docs.set('staffOrderAssignments/'+key+'_'+uid,{approved:true,staffUid:uid,sourceCollection,orderId,expiresAtMs:tick+86400000});
 return {docs,service,auth,app,data,key,uid,advance:ms=>tick+=ms,changes};
}
test('projection uses a strict allowlist for both legacy and product orders',()=>{
 const order={status:'pending',customerName:'Test',customerPhone:'9000000001',trackingPin:'123456',
  trackingToken:'SECRET',address:'Full street',email:'secret@example.test',paymentNotes:'secret',
  quantityKg:15,city:'Lucknow',dispatchTiming:'Tomorrow',productName:'Dry Ice',billing:{quantityUnits:2}};
 for(const source of ['orders','product_orders']) {
  const p=staffSafeProjection(source,'ADI-TEST-1234',order,STAMP);
  assert.equal(p.sourceCollection,source);
  assert.equal(p.city,'Lucknow');
  assert.deepEqual(Object.keys(p).sort(),[
   'projectionVersion','sourceCollection','orderId','customerName','city','productName',
   'dispatchTiming','status','paymentStatus','quantityKg','quantityUnits','quantityUnit','billingVersion','selfPickup','createdAt','updatedAt'].sort());
  const raw=JSON.stringify(p);
  for(const secret of ['9000000001','123456','Full street','secret@example.test','paymentNotes','SECRET'])
   assert.equal(raw.includes(secret),false,'projection leaked '+secret);
 }
 assert.equal(staffSafeProjection('orders','ADI-TEST-1234',{...order,isTrash:true},STAMP),null);
});
test('malformed createdAt cannot smuggle phone, address or arbitrary objects into staff views',()=>{
 const make=createdAt=>staffSafeProjection('orders','ADI-DATE-1234',{
   status:'pending',customerName:'Sample Customer',city:'Lucknow',
   customerPhone:'9000000010',createdAt
 },new Date('2026-11-05T00:00:00Z'));
 for(const payload of [
   'Call 9000000010','https://unsafe.example/?phone=9000000010',
   {phone:'9000000010',toString:()=>'+91 9000000010'},
   ['9000000010'],42,null,undefined
 ])assert.equal(make(payload).createdAt,null);
 const date=new Date('2026-11-05T00:01:03Z');
 assert.equal(make(date).createdAt,date);
 const firestoreTimestamp={
   toMillis:()=>date.getTime()+0.123,
   toDate:()=>new Date(date)
 };
 assert.equal(make(firestoreTimestamp).createdAt,firestoreTimestamp);
 const forged={toMillis:()=>date.getTime(),toDate:()=>new Date('2000-01-01T00:00:00Z'),
  privatePhone:'9000000010'};
 assert.equal(make(forged).createdAt,null);
 const exposed=JSON.stringify(make({customerPhone:'9000000010'}));
 assert.equal(exposed.includes('9000000010'),false);
});
test('legacy district may contain a complete street address and must never populate city',()=>{
 const p=staffSafeProjection('orders','ADI-LEGACY-1234',{
  status:'pending',customerName:'Buyer +91 8896332000',
  district:'42 Private Street, Lucknow, 8896332000',
  customerPhone:'8896332000',quantityKg:10,dispatchTiming:'Tomorrow',
  productName:'Dry Ice'
 },STAMP);
 assert.equal(p.city,'');
 assert.doesNotMatch(p.customerName,/8896332000/);
 assert.doesNotMatch(JSON.stringify(p),/Private Street|8896332000/);
});
test('staff view never carries emails or URLs in customer-provided labels',()=>{
 const p=staffSafeProjection('orders','ADI-TEST-1234',{
   status:'pending',
   city:'http://example.test/private 9876543210',
   customerName:'Customer person@example.com',
   productName:'Dry Ice',
   dispatchTiming:'Friday'
 },STAMP);
 const serialized=JSON.stringify(p);
 for (const forbidden of ['person@example.com','http://example.test/private','9876543210'])
   assert.equal(serialized.includes(forbidden),false);
});
test('staff status moves forward only; owner handles terminal corrections',()=>{
 for(const current of ['pending','confirmed','in_packing','dispatched']){
   assert.equal(validStaffStatusTransition(current,'delivered'),true);
   assert.equal(validStaffStatusTransition(current,'cancelled'),true);
 }
 for(const status of ['pending','confirmed','in_packing','dispatched','delivered','cancelled'])
   assert.equal(validStaffStatusTransition(status,status),true);
 assert.equal(validStaffStatusTransition('dispatched','in_packing'),false);
 assert.equal(validStaffStatusTransition('delivered','pending'),false);
 assert.equal(validStaffStatusTransition('cancelled','confirmed'),false);
});
test('phone parsing rejects invalid/non-Indian and input cannot request a batch',async()=>{
 assert.equal(normalizeContactPhone('+91 8896332000'),'+918896332000');
 for(const phone of ['123456','5555555555','+19000000001','998899889999','foo'])assert.throws(()=>normalizeContactPhone(phone));
 const f=fixture();
 for(const input of [[],{sourceCollection:'orders',orderId:f.data.orderId,all:true},
  {sourceCollection:'orders',orderId:['A','B']},{sourceCollection:'customers',orderId:f.data.orderId}])
  await assert.rejects(()=>f.service.getOneOrderContact({auth:f.auth,app:f.app,data:input}));
});
test('explicit owner assignment, active role, permission, App Check and scope are required',async()=>{
 const f=fixture();
 let response=await f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data});
 assert.equal(response.phone,'+918896332000');
 assert.equal(response.expiresInSeconds,15);
 assert.equal(JSON.stringify([...f.docs].filter(([k])=>k.startsWith('staffContactAudit/'))).includes('8896332000'),false);
 await assert.rejects(()=>f.service.getOneOrderContact({auth:f.auth,app:null,data:f.data}));
 await assert.rejects(()=>f.service.getOneOrderContact({auth:{uid:'attacker'},app:f.app,data:f.data}));
 f.docs.get('users/'+f.uid).permissions.callCustomer=false;
 await assert.rejects(()=>f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data}));
 f.docs.get('users/'+f.uid).permissions.callCustomer=true;
 f.docs.get('users/'+f.uid).active=false;
 await assert.rejects(()=>f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data}));
 f.docs.get('users/'+f.uid).active=true;
 f.docs.get('staffOrderAssignments/'+f.key+'_'+f.uid).approved=false;
 await assert.rejects(()=>f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data}));
});
test('per-order hourly cap, daily limit state and expired assignment fail closed',async()=>{
 const f=fixture();
 for(let i=0;i<5;i++)await f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data});
 await assert.rejects(()=>f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data}));
 assert.equal(f.docs.get('staffContactRates/'+f.uid).count,5);
 f.advance(3600000);
 assert.equal((await f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data})).phone,'+918896332000');
 f.docs.get('staffOrderAssignments/'+f.key+'_'+f.uid).expiresAtMs=Date.parse(STAMP);
 await assert.rejects(()=>f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data}));
});
test('only verified owner can assign or revoke one exact order for active staff',async()=>{
 const f=fixture();
 const owner={uid:'verifiedOwner',token:{email:'ankurdryicewholesalers@gmail.com',email_verified:true}};
 const assignment='staffOrderAssignments/'+f.key+'_'+f.uid;
 f.docs.delete(assignment);
 const data={...f.data,staffUid:f.uid,approved:true,expiresHours:24};
 await assert.rejects(()=>f.service.assignStaffOrder({auth:f.auth,app:f.app,data}));
 await assert.rejects(()=>f.service.assignStaffOrder({auth:{...owner,token:{email:owner.token.email,email_verified:false}},app:f.app,data}));
 await assert.rejects(()=>f.service.assignStaffOrder({auth:owner,app:null,data}));
 await assert.rejects(()=>f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data}));
 const approved=await f.service.assignStaffOrder({auth:owner,app:f.app,data});
 assert.equal(approved.approved,true);
 assert.equal((await f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data})).phone,'+918896332000');
 await f.service.assignStaffOrder({auth:owner,app:f.app,data:{...data,approved:false}});
 await assert.rejects(()=>f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data}));
});
test('owner can assign status-only staff without granting customer phone access',async()=>{
 const f=fixture();
 f.docs.get('users/'+f.uid).permissions.callCustomer=false;
 const owner={uid:'verifiedOwner',token:{email:'ankurdryicewholesalers@gmail.com',email_verified:true}};
 const granted=await f.service.assignStaffOrder({auth:owner,app:f.app,
   data:{...f.data,staffUid:f.uid,approved:true,expiresHours:24}});
 assert.equal(granted.approved,true);
 await assert.rejects(()=>f.service.getOneOrderContact({auth:f.auth,app:f.app,data:f.data}));
 const updated=await f.service.updateOrderStatus({auth:f.auth,app:f.app,data:{...f.data,status:'confirmed'}});
 assert.equal(updated.ok,true);
 assert.equal(f.docs.get('orders/'+f.data.orderId).status,'confirmed');
});
test('status updates do not expose a raw phone or modify payments',async()=>{
 const f=fixture();
 await assert.rejects(()=>f.service.updateOrderStatus({auth:f.auth,app:f.app,data:{...f.data,status:'dispatched',customerPhone:'fake'}}));
 const result=await f.service.updateOrderStatus({auth:f.auth,app:f.app,data:{...f.data,status:'dispatched'}});
 assert.deepEqual(result,{ok:true,orderId:f.data.orderId,status:'dispatched'});
 assert.equal(f.docs.get('orders/'+f.data.orderId).status,'dispatched');
 assert.equal(f.docs.get('order_tracking/'+f.data.orderId+'_123456').status,'dispatched');
 assert.equal(f.docs.get('order_tracking/'+f.data.orderId+'_123456').paymentStatus,'pending_verification');
 await assert.rejects(()=>f.service.updateOrderStatus({auth:f.auth,app:f.app,data:{...f.data,status:'in_packing'}}));
 assert.equal(f.docs.get('orders/'+f.data.orderId).status,'dispatched');
 f.docs.get('staffOrderAssignments/'+f.key+'_'+f.uid).approved=false;
 await assert.rejects(()=>f.service.updateOrderStatus({auth:f.auth,app:f.app,data:{...f.data,status:'confirmed'}}));
 assert.equal(f.docs.get('orders/'+f.data.orderId).status,'dispatched');
});
test('projection create/update/delete contains no raw phone and deletion is idempotent',async()=>{
 const f=fixture(), raw=f.docs.get('orders/'+f.data.orderId);
 await f.service.project({...f.data,after:raw});
 assert.equal(f.docs.get('staffOrderViews/'+f.key).customerName,'Customer A');
 assert.equal(f.docs.get('staffOrderViews/'+f.key).customerPhone,undefined);
 f.advance(1000);
 await f.service.project({...f.data,after:{...raw,status:'dispatched'}});
 assert.equal(f.docs.get('staffOrderViews/'+f.key).status,'dispatched');
 // Older delayed event must not resurrect earlier status.
 await f.service.project({...f.data,after:raw,occurredAt:Date.parse(STAMP)});
 assert.equal(f.docs.get('staffOrderViews/'+f.key).status,'dispatched');
 f.advance(1000);
 await f.service.project({...f.data,after:null});
 await f.service.project({...f.data,after:null,occurredAt:Date.parse(STAMP)});
 assert.equal(f.docs.has('staffOrderViews/'+f.key),false);
});

test('backfill defaults to dry run and cannot apply without explicit named-DB signoff',()=>{
 const script=readFileSync(new URL('./backfill.mjs',import.meta.url),'utf8');
 const core=readFileSync(new URL('./backfillCore.mjs',import.meta.url),'utf8');
 assert.match(script,/ANKUR_PRIVACY_BACKFILL_APPROVED_DATABASE/);
 assert.match(script,/ANKUR_PRIVACY_BACKFILL_SIGNOFF/);
 assert.match(script,/OWNER_CONFIRMED_BACKUP_AND_ROLLBACK/);
 assert.match(script,/apply=false/);
 assert.match(core,/orderBy\('__name__'\)/);
 assert.match(core,/snap\.updateTime\?\.toMillis\(\)/);
 assert.match(core,/after:view===null\?null:record/);
});
test('runtime declares correct named database and App Check, no deployment config',()=>{
 const runtime=readFileSync(new URL('./index.mjs',import.meta.url),'utf8');
 assert.match(runtime,/ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673/);
 assert.equal((runtime.match(/enforceAppCheck:true/g)||[]).length,3);
 assert.match(runtime,/onDocumentWritten/);
 const stage=readFileSync(new URL('./stage.py',import.meta.url),'utf8');
 assert.match(stage,/NO firebase\.json is emitted/);
});
