import test from 'node:test';
import assert from 'node:assert/strict';
import {auditStaffProjections} from './projectionAudit.mjs';
import {staffSafeProjection} from './staffContactService.mjs';

function mock(){
 const docs=new Map();
 const updatedAt=new Date('2026-11-05T00:20:00.000Z');
 const order=(id)=>({
   status:'pending',customerName:'Synthetic buyer',city:'Lucknow',
   quantityKg:10,productName:'Dry Ice',
   customerPhone:'9000000010',trackingPin:'123456',
   createdAt:new Date('2026-11-05T00:00:00Z')
 });
 const add=(id,change={})=>{
   const source='orders',base=order(id);
   docs.set(source+'/'+id,base);
   docs.set('staffOrderViews/'+source+'_'+id,
     {...staffSafeProjection(source,id,base,updatedAt),...change});
 };
 add('ADI-SAFE-0001');
 add('ADI-STALE-0002',{status:'dispatched'});
 add('ADI-UNSAFE-0003',{customerPhone:'9000000010'});
 add('ADI-INVALID-0004',{orderId:'ADI-WRONG-0004'});
 const missing=order('ADI-ORPHAN-0005');
 docs.set('staffOrderViews/orders_ADI-ORPHAN-0005',
   staffSafeProjection('orders','ADI-ORPHAN-0005',missing,updatedAt));
 const db={
  doc:path=>({get:async()=>({
   exists:docs.has(path),data:()=>docs.get(path)
  })}),
  collection:name=>{
    let after='',page=150;
    const q={
      orderBy:key=>{assert.equal(key,'__name__');return q;},
      limit:n=>{page=n;return q;},
      startAfter:snapshot=>{after=snapshot.id;return q;},
      get:async()=>{
       const arr=[...docs].filter(([key])=>key.startsWith(name+'/'))
        .map(([key,value])=>({id:key.slice(name.length+1),data:()=>value}))
        .filter(item=>item.id>after)
        .sort((a,b)=>a.id.localeCompare(b.id)).slice(0,page);
       return {empty:arr.length===0,docs:arr};
      }
    };
    return q;
  }
 };
 return {db,docs};
}
test('read-only audit classifies safe, stale, unsafe and orphan projections without PII',async()=>{
 const {db,docs}=mock();
 const before=JSON.stringify([...docs]);
 const result=await auditStaffProjections({db,pageSize:2});
 assert.deepEqual(result,{
   mode:'read-only',scanned:5,safe:1,unsafe:1,orphan:1,stale:1,invalid:1,
   sourceScanned:4,eligible:4,excluded:0,missing:0,invalidSource:0,
   sourceCounts:{orders:4,product_orders:0},ready:false
 });
 assert.equal(JSON.stringify([...docs]),before,'auditor must never modify Firestore data');
 assert.equal(JSON.stringify(result).includes('9000000010'),false);
 assert.equal(JSON.stringify(result).includes('Synthetic buyer'),false);
});
test('read-only audit flags unrecognized timestamp data and prevents false readiness',async()=>{
 const {db,docs}=mock();
 docs.set('staffOrderViews/orders_ADI-SAFE-0001',{
   ...docs.get('staffOrderViews/orders_ADI-SAFE-0001'),
   createdAt:{customerPhone:'9000000010'}
 });
 const result=await auditStaffProjections({db});
 assert.equal(result.safe,0);
 assert.equal(result.unsafe,2);
 assert.equal(result.ready,false);
});
test('maximum scan limit is enforced without exposing customer identifiers',async()=>{
 const {db}=mock();
 await assert.rejects(
  ()=>auditStaffProjections({db,pageSize:2,maxScan:2}),
  error=>error.message==='Audit maximum scans exceeded'
 );
});
test('empty audit is not a backfill-parity success',async()=>{
 const {db,docs}=mock();docs.clear();
 const result=await auditStaffProjections({db});
 assert.equal(result.scanned,0);
 assert.equal(result.ready,false);
});

test('clean two-collection backfill passes only with complete canonical parity',async()=>{
 const {db,docs}=mock();docs.clear();
 const base={status:'pending',customerName:'Test',city:'Lucknow',quantityKg:10,
   customerPhone:'9000000010',createdAt:new Date('2026-11-05T02:00:00Z')};
 for(const [source,id] of [['orders','ADI-CLEAN-0001'],['product_orders','APO-CLEAN-0002']]){
   const record={...base};
   docs.set(source+'/'+id,record);
   docs.set('staffOrderViews/'+source+'_'+id,
     staffSafeProjection(source,id,record,new Date('2026-11-05T02:01:00Z')));
 }
 const original=JSON.stringify([...docs]);
 const result=await auditStaffProjections({db,pageSize:1});
 assert.equal(result.scanned,2);
 assert.equal(result.sourceScanned,2);
 assert.equal(result.eligible,2);
 assert.equal(result.safe,2);
 assert.equal(result.missing,0);
 assert.equal(result.ready,true);
 assert.equal(JSON.stringify([...docs]),original);
});
test('one missing projection fails readiness even if all inspected views look safe',async()=>{
 const {db,docs}=mock();docs.clear();
 const base={status:'pending',customerName:'Test',city:'Lucknow',quantityKg:10,
   customerPhone:'9000000010'};
 for(const id of ['ADI-CLEAN-0001','ADI-MISSING-0002'])docs.set('orders/'+id,{...base});
 docs.set('staffOrderViews/orders_ADI-CLEAN-0001',
   staffSafeProjection('orders','ADI-CLEAN-0001',base,new Date()));
 const result=await auditStaffProjections({db,pageSize:1});
 assert.equal(result.scanned,1);
 assert.equal(result.safe,1);
 assert.equal(result.sourceScanned,2);
 assert.equal(result.eligible,2);
 assert.equal(result.missing,1);
 assert.equal(result.ready,false);
 assert.equal(JSON.stringify(result).includes('9000000010'),false);
});
test('invalid canonical record fails closed instead of silently disappearing',async()=>{
 const {db,docs}=mock();docs.clear();
 const base={status:'pending',customerName:'Test',city:'Lucknow'};
 docs.set('orders/ADI-BAD-0001',{...base,status:'illegal_status'});
 docs.set('orders/ADI-GOOD-0002',base);
 docs.set('staffOrderViews/orders_ADI-GOOD-0002',
   staffSafeProjection('orders','ADI-GOOD-0002',base,new Date()));
 const result=await auditStaffProjections({db});
 assert.equal(result.invalidSource,1);
 assert.equal(result.eligible,1);
 assert.equal(result.safe,1);
 assert.equal(result.ready,false);
});
test('combined source and projection scans respect maximum read cap',async()=>{
 const {db}=mock();
 await assert.rejects(()=>auditStaffProjections({db,maxScan:6,pageSize:2}),
   error=>error.message==='Audit maximum scans exceeded');
});
