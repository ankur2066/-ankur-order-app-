import test from 'node:test';
import assert from 'node:assert/strict';
import {backfill} from './backfillCore.mjs';

function scenario(){
  const docs=new Map(), writes=[];
  const updatedMs=Date.parse('2026-11-04T10:00:00Z');
  const initial={
    'orders/LEGACY-1111':{status:'pending',orderId:'LEGACY-1111',customerName:'Normal',customerPhone:'9000000001',city:'Lucknow',quantityKg:10},
    'orders/TRASH-2222':{status:'pending',orderId:'TRASH-2222',isTrash:true,customerPhone:'9000000002'},
    'product_orders/PRODUCT-3333':{status:'confirmed',orderId:'PRODUCT-3333',billingVersion:1,customerName:'Legacy product',customerPhone:'9000000003',quantityKg:20},
    'staffOrderViews/orders_TRASH-2222':{customerPhone:'9000000002',status:'pending',orderId:'TRASH-2222'},
    'staffProjectionWatermarks/orders_TRASH-2222':{eventTimeMs:updatedMs-1000}
  };
  Object.entries(initial).forEach(([k,v])=>docs.set(k,v));
  const db={
    doc:path=>({path}),
    runTransaction:async fn=>{
      const changes=[];
      const tx={
        get:async ref=>({exists:docs.has(ref.path),data:()=>docs.get(ref.path)}),
        set:(ref,value)=>changes.push(()=>{docs.set(ref.path,value);writes.push({op:'set',path:ref.path});}),
        delete:ref=>changes.push(()=>{docs.delete(ref.path);writes.push({op:'delete',path:ref.path});})
      };
      const result=await fn(tx);
      changes.forEach(f=>f());
      return result;
    },
    collection:source=>{
      let after='',size=150;
      const q={
        orderBy:(x)=>{assert.equal(x,'__name__');return q;},
        limit:(n)=>{size=n;return q;},
        startAfter:(doc)=>{after=doc.id;return q;},
        get:async()=>{
          const page=[...docs].filter(([path])=>path.startsWith(source+'/'))
            .map(([path,value])=>({id:path.slice(source.length+1),data:()=>value,
              updateTime:{toMillis:()=>updatedMs}}))
            .filter(doc=>doc.id>after).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,size);
          return {empty:page.length===0,docs:page};
        }
      };
      return q;
    }
  };
  return {db,docs,writes,updatedMs};
}
test('dry run reads both order types without writing phone-bearing projections',async()=>{
  const s=scenario(),log=[];
  const result=await backfill({db:s.db,log:line=>log.push(line)});
  assert.equal(result.mode,'dry-run');
  assert.deepEqual(result.counts.orders,{scanned:2,eligible:1,excluded:1,written:0,removed:0,skipped:0});
  assert.equal(result.counts.product_orders.eligible,1);
  assert.equal(s.writes.length,0);
  assert.equal(s.docs.get('staffOrderViews/orders_TRASH-2222').customerPhone,'9000000002');
  assert.equal(JSON.stringify(log).includes('9000000002'),false);
});
test('apply removes stale safe view of soft-deleted orders and maps legacy products',async()=>{
  const s=scenario();
  const result=await backfill({db:s.db,apply:true});
  assert.equal(result.mode,'apply');
  assert.equal(result.counts.orders.removed,1);
  assert.equal(result.counts.orders.written,1);
  assert.equal(result.counts.product_orders.written,1);
  assert.equal(s.docs.has('staffOrderViews/orders_TRASH-2222'),false);
  const product=s.docs.get('staffOrderViews/product_orders_PRODUCT-3333');
  assert.equal(product.sourceCollection,'product_orders');
  assert.equal(product.billingVersion,1);
  assert.equal(product.customerPhone,undefined);
  assert.equal(s.docs.get('staffOrderViews/orders_LEGACY-1111').customerPhone,undefined);
});
test('newer event watermark prevents stale backfill overwrites',async()=>{
  const s=scenario();
  s.docs.set('staffOrderViews/orders_LEGACY-1111',{status:'dispatched',sourceCollection:'orders'});
  s.docs.set('staffProjectionWatermarks/orders_LEGACY-1111',{eventTimeMs:s.updatedMs+1000});
  const result=await backfill({db:s.db,apply:true});
  assert.equal(result.counts.orders.skipped,1);
  assert.equal(s.docs.get('staffOrderViews/orders_LEGACY-1111').status,'dispatched');
  assert.equal(s.writes.some(x=>x.path==='staffOrderViews/orders_LEGACY-1111'),false);
});
