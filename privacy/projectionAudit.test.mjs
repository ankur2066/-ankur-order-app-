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
   ready:false
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
