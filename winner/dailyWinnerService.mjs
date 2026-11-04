/**
 * Daily Winner private review. NO PROD DEPLOYMENT.
 * One published record per India calendar date. Never award automatically:
 * final gift is a separate owner decision. Do not export contact identifiers.
 */
import {createHash,randomInt} from 'node:crypto';
const MS_DAY=86400000;
const INDIA_OFFSET=19800000;
const KEY=/^\d{4}-\d{2}-\d{2}$/;
const STATUS=new Set(['confirmed','in_packing','dispatched','delivered']);
const OWNER='ankurdryicewholesalers@gmail.com';
const safeLabel=(s,max=70)=>(typeof s==='string'?s:'')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[hidden]')
  .replace(/(?:\+?91[ -]?)?[6-9](?:[ -]?[0-9]){9}/g,'[hidden]')
  .replace(/https?:\/\/\S+/gi,'[hidden]').trim().slice(0,max);
export function indiaDay(nowMs=Date.now()){
 return new Date(nowMs+INDIA_OFFSET).toISOString().slice(0,10);
}
export function indiaDayRange(day){
 if(!KEY.test(day)||Number.isNaN(Date.parse(day+'T00:00:00Z'))||
    new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)throw Error('Invalid India date');
 const start=Date.parse(day+'T00:00:00Z')-INDIA_OFFSET;
 return {start,end:start+MS_DAY};
}
export function isTopCustomerDay(day,distribution='all3_top4'){
 const {start}=indiaDayRange(day);
 if(!['all3_top4','top3_all4'].includes(distribution))throw Error('Invalid rotation');
 const weekday=new Date(start+INDIA_OFFSET).getUTCDay();
 // Monday–Wednesday: 3 days; Thursday–Sunday: 4 days.
 const three=weekday>=1&&weekday<=3;
 return distribution==='all3_top4'?!three:three;
}
export function eligibleRetailOrder(source,orderId,order,rates){
 if(!['orders','product_orders'].includes(source)||!order||!STATUS.has(order.status)||
   order.isTrash===true||order.wholesale===true||order.isWholesale===true||
   ['wholesale','dealer','bulk','reseller'].includes(String(order.customerType||'').toLowerCase())||
   ['wholesale','bulk'].includes(String(order.priceTier||'').toLowerCase()))return null;
 const perKg=(Number(rates?.dryIceRate)||0)+(Number(rates?.thermocolRate)||0)+(Number(rates?.transportRate)||0);
 const quantity=source==='product_orders'&&order.billingVersion===2
   ?(order.billing?.unit==='kg'?order.billing.quantityUnits/1000:NaN):order.quantityKg;
 const total=source==='product_orders'&&order.billingVersion===2
   ?order.billing?.totalPaise/100:order.totalAmount;
 if(!Number.isFinite(perKg)||perKg<=0||!Number.isFinite(quantity)||quantity<=0||
    quantity>5000||!Number.isFinite(total)||total<=0||total+0.01<quantity*perKg)return null;
 if(source==='product_orders'&&!/dry\s*ice/i.test(String(order.productName||'')))return null;
 const name=safeLabel(order.customerName,70);
 // Legacy 'district' often contains a complete delivery address, never publish it.
 const city=safeLabel(order.city,45);
 if(!name||name.includes('[hidden]'))return null;
 const phone=String(order.customerPhone||'').replace(/\D/g,'');
 const uid=typeof order.userId==='string'&&!['','guest','owner_manual_entry'].includes(order.userId)
   ?'u:'+order.userId:(/^[6-9]\d{9}$/.test(phone.slice(-10))?'p:'+createHash('sha256').update(phone.slice(-10)).digest('hex'):null);
 if(!uid)return null; // No stable customer identity; do not enable anonymous gaming.
 return {source,orderId,customerKey:uid,name,city:city&&!/\d{5}/.test(city)?city:'उत्तर प्रदेश',
   quantityKg:quantity,createdAtMs:order.createdAt?.toMillis?.() ?? 0};
}
export function selectEligiblePool(rows,day,rates,distribution='all3_top4'){
 const {start,end}=indiaDayRange(day),counts=new Map(),today=new Map();
 for(const row of rows){
  const v=eligibleRetailOrder(row.source,row.orderId,row.order,rates);
  if(!v||!Number.isFinite(row.createdAtMs)||row.createdAtMs<start-30*MS_DAY||row.createdAtMs>=end)continue;
  counts.set(v.customerKey,(counts.get(v.customerKey)||0)+1);
  if(row.createdAtMs>=start&&row.createdAtMs<end){
    const existing=today.get(v.customerKey);
    if(!existing||v.orderId<existing.orderId)today.set(v.customerKey,v);
  }
 }
 const active=[...today.values()].sort((a,b)=>a.customerKey.localeCompare(b.customerKey));
 const top=[...today.keys()].sort((a,b)=>(counts.get(b)||0)-(counts.get(a)||0)||a.localeCompare(b)).slice(0,3);
 return {topCustomerDay:isTopCustomerDay(day,distribution),
   candidates:isTopCustomerDay(day,distribution)?active.filter(x=>top.includes(x.customerKey)):active,
   topCustomerKeys:top};
}
function requireOwner(auth){
 if(!auth?.uid||auth.token?.email!==OWNER||auth.token?.email_verified!==true)throw Error('Owner authorization required');
}
export function createDailyWinnerService({db,now=()=>Date.now(),randomPick=length=>randomInt(length),timestamp=()=>new Date(now())}){
 async function settings({auth,app,data}){
  requireOwner(auth);if(!app)throw Error('App Check required');
  if(!data||Object.keys(data).some(k=>!['enabled','mode','distribution'].includes(k))||
     typeof data.enabled!=='boolean'||!['auto','manual'].includes(data.mode)||
     !['all3_top4','top3_all4'].includes(data.distribution))throw Error('Invalid settings');
  await db.doc('settings/dailyWinner').set({...data,updatedAt:timestamp(),updatedBy:auth.uid});
  return {ok:true};
 }
 async function choose({auth,app,data,automatic=false}){
  if(!automatic){requireOwner(auth);if(!app)throw Error('App Check required');}
  if(!data||Object.keys(data).some(k=>!['day','source','orderId','override'].includes(k)))throw Error('Invalid selection');
  const day=data.day||indiaDay(now()),{start,end}=indiaDayRange(day);
  if(day>indiaDay(now())||start<Date.parse(indiaDay(now())+'T00:00:00Z')-INDIA_OFFSET-2*MS_DAY)throw Error('Day outside review window');
  const config=(await db.doc('settings/dailyWinner').get()).data();
  if(config?.enabled!==true)throw Error('Daily Winner not activated');
  if(automatic&&config.mode!=='auto')return {skipped:'manual_mode'};
  if(!automatic&&data.override===true&&config.mode!=='manual')throw Error('Switch to manual before an override');
  const rates=(await db.doc('settings/rates').get()).data();
  if(!rates)throw Error('Retail rate is unavailable');
  const rows=[];
  for(const source of ['orders','product_orders']){
    const snap=await db.collection(source).where('createdAt','>=',new Date(start-30*MS_DAY))
      .where('createdAt','<',new Date(end)).limit(1001).get();
    if(snap.docs.length>1000)throw Error('Too many orders; audited pagination required');
    for(const doc of snap.docs)rows.push({source,orderId:doc.id,order:doc.data(),
      createdAtMs:doc.data().createdAt?.toMillis?.()??0});
  }
  const pool=selectEligiblePool(rows,day,rates,config.distribution||'all3_top4');
  if(pool.candidates.length===0)return {skipped:'no_eligible_retail_orders'};
  const manualCandidate=!automatic&&data.source&&data.orderId
   ?pool.candidates.find(x=>x.source===data.source&&x.orderId===data.orderId):null;
  if(!automatic&&data.orderId&&!manualCandidate)throw Error('Selected order is not retail-eligible today');
  const chosen=manualCandidate||pool.candidates[randomPick(pool.candidates.length)];
  if(!chosen)throw Error('Selection error');
  const pub=db.doc('dailyWinners/'+day),priv=db.doc('dailyWinnerPrivate/'+day),
    audit=db.collection('dailyWinnerAudit').doc();
  return db.runTransaction(async tx=>{
   const existing=await tx.get(priv);
   if(existing.exists&&(!data.override||automatic))return {alreadySelected:true,date:day};
   const revision=(existing.data()?.revision||0)+1;
   const publicRecord={date:day,active:true,name:chosen.name,city:chosen.city,
    dateLabel:day,giftLabel:'खास गिफ्ट',revision,updatedAt:timestamp()};
   const privateRecord={date:day,source:chosen.source,orderId:chosen.orderId,
    customerKey:chosen.customerKey,mode:automatic?'auto':'manual',revision,
    topCustomerDay:pool.topCustomerDay,updatedBy:automatic?'scheduler':auth.uid,updatedAt:timestamp()};
   tx.set(pub,publicRecord);tx.set(priv,privateRecord);
   tx.create(audit,{date:day,revision,source:chosen.source,orderId:chosen.orderId,
    mode:privateRecord.mode,updatedBy:privateRecord.updatedBy,createdAt:timestamp()});
   return {ok:true,date:day,revision,topCustomerDay:pool.topCustomerDay};
  });
 }
 return {settings,choose};
}
