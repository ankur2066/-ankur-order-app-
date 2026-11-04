import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleRetailOrder,isTopCustomerDay,indiaDay,indiaDayRange,
 selectEligiblePool,createDailyWinnerService} from './dailyWinnerService.mjs';
const rates={dryIceRate:50,thermocolRate:10,transportRate:0};
const DATE='2026-11-05',TIME=Date.parse('2026-11-05T05:00:00Z');
const owner={uid:'owner-review',token:{email:'ankurdryicewholesalers@gmail.com',email_verified:true}};
const timestamp=ms=>({toMillis:()=>ms});
function order({uid='A',qty=10,total=600,source='orders',status='confirmed',
  date=DATE,wholesale=false,name,city='Lucknow',extra={}}={}){
 const id='ADI-'+uid.replace(/\W/g,'').slice(0,4)+'-'+Math.round(qty)+'-'+String(total);
 return {source,orderId:id,order:{
  userId:uid,customerName:name||uid,customerPhone:'9000000001',
  city,quantityKg:qty,totalAmount:total,productName:'Dry Ice',
  status,wholesale,createdAt:timestamp(Date.parse(date+'T05:00:00Z')),...extra
 },createdAtMs:Date.parse(date+'T05:00:00Z')};
}
test('date selection is India-local, not UTC; pattern is 3 all / 4 top',()=>{
 assert.equal(indiaDay(Date.parse('2026-11-04T19:00:00Z')),DATE);
 assert.deepEqual(indiaDayRange(DATE),{
  start:Date.parse('2026-11-04T18:30:00Z'),
  end:Date.parse('2026-11-05T18:30:00Z')
 });
 assert.equal(isTopCustomerDay('2026-11-02'),false); // Monday
 assert.equal(isTopCustomerDay('2026-11-04'),false);
 assert.equal(isTopCustomerDay('2026-11-05'),true); // Thursday
 assert.equal(isTopCustomerDay('2026-11-08'),true);
 assert.equal(isTopCustomerDay('2026-11-05','top3_all4'),false);
 assert.throws(()=>indiaDayRange('2026-02-31'),/Invalid/);
});
test('only retail-rate customer purchases eligible; no wholesale, discount or forged amounts',()=>{
 const cheap=order({uid:'bulk',qty:500,total:7000});
 assert.equal(eligibleRetailOrder(cheap.source,cheap.orderId,cheap.order,rates),null,
  '500kg wholesale rate must not win');
 for(const bad of [{total:599},{wholesale:true},{status:'pending'},
  {extra:{customerType:'dealer'}},{extra:{priceTier:'wholesale'}},
  {extra:{isTrash:true}}]){
  const x=order(bad);
  assert.equal(eligibleRetailOrder(x.source,x.orderId,x.order,rates),null);
 }
 const retailer=order({qty:10,total:650});
 assert.equal(eligibleRetailOrder(retailer.source,retailer.orderId,retailer.order,rates).quantityKg,10);
 const pyro=order({qty:10,total:900,extra:{productName:'Dry Ice + Pyro add-on'}});
 assert.ok(eligibleRetailOrder(pyro.source,pyro.orderId,pyro.order,rates));
});
test('unit products without honest KG totals cannot win',()=>{
 const wrong=order({source:'product_orders',extra:{billingVersion:2,
  billing:{unit:'piece',quantityUnits:2,totalPaise:90000}}});
 assert.equal(eligibleRetailOrder(wrong.source,wrong.orderId,wrong.order,rates),null);
 const right=order({source:'product_orders',extra:{billingVersion:2,
  billing:{unit:'kg',quantityUnits:10000,totalPaise:60000}}});
 assert.ok(eligibleRetailOrder(right.source,right.orderId,right.order,rates));
});
test('top customers are ranked by retail purchase count, NEVER KG volume',()=>{
 const day=DATE;
 const history=[order({uid:'A',date:'2026-10-25'}),
  order({uid:'A',date:'2026-10-26'}),
  order({uid:'A',date:'2026-10-27'}),
  order({uid:'B',date:'2026-10-25'}),
  order({uid:'C',date:'2026-10-26'})];
 const today=[order({uid:'A'}),order({uid:'B',qty:500,total:30000}),
  order({uid:'C'}),order({uid:'D'})];
 const pool=selectEligiblePool([...history,...today],day,rates);
 assert.equal(pool.topCustomerDay,true);
 assert.deepEqual(pool.candidates.map(x=>x.customerKey),['u:A','u:B','u:C']);
 assert.equal(pool.candidates.length,3);
 const all=selectEligiblePool([...history,...today],'2026-11-02',rates);
 assert.equal(all.topCustomerDay,false);
 const allToday=[...today].map(x=>({...x,createdAtMs:Date.parse('2026-11-02T05:00:00Z'),
  order:{...x.order,createdAt:timestamp(Date.parse('2026-11-02T05:00:00Z'))}}));
 assert.equal(selectEligiblePool([...history,...allToday],'2026-11-02',rates).candidates.length,4);
});
function mock(){
 const documents=new Map(),now=TIME;
 const db={
  doc:path=>({path,get:async()=>({exists:documents.has(path),data:()=>documents.get(path)})}),
  collection:source=>{
   if(source==='dailyWinnerAudit')return {doc:()=>({path:'dailyWinnerAudit/audit'+documents.size})};
   const constraints=[];
   const query={
    where:(key,op,value)=>{constraints.push({key,op,value});return query;},
    limit:n=>{query.n=n;return query;},
    get:async()=>({docs:[...documents.entries()].filter(([path,data])=>{
      if(!path.startsWith(source+'/'))return false;
      return constraints.every(({key,op,value})=>{
       const left=data[key]?.toMillis?.()??0,right=value.getTime();
       return op==='>='?left>=right:left<right;
      });
     }).slice(0,query.n||1001).map(([path,data])=>({id:path.split('/')[1],data:()=>data}))})
   };return query;
  },
  runTransaction:async fn=>{
   const modifications=[];
   const tx={
    get:async ref=>({exists:documents.has(ref.path),data:()=>documents.get(ref.path)}),
    set:(ref,value)=>modifications.push(()=>documents.set(ref.path,value)),
    create:(ref,value)=>modifications.push(()=>{if(documents.has(ref.path))throw Error('exists');documents.set(ref.path,value)})
   };
   const output=await fn(tx);
   modifications.forEach(f=>f());
   return output;
  }
 };
 db.doc=(path)=>({
  path,get:async()=>({exists:documents.has(path),data:()=>documents.get(path)}),
  set:async data=>documents.set(path,data)
 });
 const service=createDailyWinnerService({db,now:()=>now,randomPick:()=>0,timestamp:()=>new Date(now)});
 documents.set('settings/rates',rates);
 documents.set('settings/dailyWinner',{enabled:true,mode:'auto',distribution:'all3_top4'});
 return {db,service,documents};
}
test('only verified owner can turn winner settings on and schedule refuses manual mode',async()=>{
 const x=mock();
 await assert.rejects(()=>x.service.settings({auth:{uid:'staff'},app:{},data:{enabled:true,mode:'auto',distribution:'all3_top4'}}));
 await assert.rejects(()=>x.service.settings({auth:owner,app:null,data:{enabled:true,mode:'auto',distribution:'all3_top4'}}));
 await x.service.settings({auth:owner,app:{},data:{enabled:true,mode:'manual',distribution:'all3_top4'}});
 assert.deepEqual(await x.service.choose({automatic:true,data:{day:DATE}}),{skipped:'manual_mode'});
});
test('one public winner per day, idempotent retry, sanitized view without phone',async()=>{
 const x=mock();
 const first=order({uid:'A'});
 x.documents.set('orders/'+first.orderId,first.order);
 const result=await x.service.choose({automatic:true,data:{day:DATE}});
 assert.equal(result.ok,true);
 const pub=x.documents.get('dailyWinners/'+DATE);
 assert.equal(pub.active,true);
 assert.equal(pub.giftLabel,'खास गिफ्ट');
 assert.equal(JSON.stringify(pub).includes('9000000001'),false);
 const second=await x.service.choose({automatic:true,data:{day:DATE}});
 assert.equal(second.alreadySelected,true);
 assert.equal(x.documents.get('dailyWinnerPrivate/'+DATE).revision,1);
});
test('owner manual override changes one published winner with audited revision',async()=>{
 const x=mock();
 const a=order({uid:'A'}),b=order({uid:'B'});
 x.documents.set('orders/'+a.orderId,a.order);
 x.documents.set('orders/'+b.orderId,b.order);
 await x.service.choose({automatic:true,data:{day:DATE}});
 await x.service.settings({auth:owner,app:{},data:{enabled:true,mode:'manual',distribution:'all3_top4'}});
 const result=await x.service.choose({auth:owner,app:{},data:{day:DATE,source:'orders',orderId:b.orderId,override:true}});
 assert.equal(result.revision,2);
 assert.equal(x.documents.get('dailyWinnerPrivate/'+DATE).orderId,b.orderId);
 assert.equal(x.documents.get('dailyWinners/'+DATE).name,'B');
 assert.equal([...x.documents.keys()].filter(x=>x.startsWith('dailyWinners/')).length,1);
});
test('no fake winner when only wholesale orders exist; future dates rejected',async()=>{
 const x=mock(),cheap=order({uid:'bulk',qty:500,total:1000});
 x.documents.set('orders/'+cheap.orderId,cheap.order);
 assert.deepEqual(await x.service.choose({automatic:true,data:{day:DATE}}),
  {skipped:'no_eligible_retail_orders'});
 await assert.rejects(()=>x.service.choose({automatic:true,data:{day:'2026-11-06'}}),/outside/);
});
