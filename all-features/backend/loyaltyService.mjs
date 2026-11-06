import {createHash} from 'node:crypto';
const OWNER='ankurdryicewholesalers@gmail.com';
const integer=(n,min=0,max=1000000000)=>{if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('Invalid points');return n;};
const key=s=>{if(typeof s!=='string'||! /^[A-Za-z0-9_-]{1,128}$/.test(s))throw Error('Invalid account or record');return s;};
const text=s=>{if(typeof s!=='string'||!s.trim()||s.trim().length>300)throw Error('Reason required');return s.trim();};
const owner=auth=>auth?.token?.email===OWNER&&auth.token.email_verified===true;
function balance(snapshot){const d=snapshot.data()||{};return{points:integer(d.points??0),reservedPoints:integer(d.reservedPoints??0),redeemedPoints:integer(d.redeemedPoints??0),lifetimeEarned:integer(d.lifetimeEarned??0)};}
export function createLoyaltyService({db,timestamp=()=>new Date()}){
 async function award({orderId,collection='orders',actor='server'}){
  key(orderId);if(!['orders','product_orders'].includes(collection))throw Error('Invalid order collection');
  return db.runTransaction(async tx=>{
   const entry=db.doc('loyaltyEntries/award_'+collection+'_'+orderId),[config,policySnap,orderSnap,old]=await Promise.all([tx.get(db.doc('settings/featureSuite')),tx.get(db.doc('settings/loyaltyPolicy')),tx.get(db.doc(collection+'/'+orderId)),tx.get(entry)]);
   if(old.exists)return{duplicate:true};const policy=policySnap.data(),o=orderSnap.data();
   if(config.data()?.enabled!==true||policy?.enabled!==true||!o||o.isTrash||o.status!=='delivered'||o.paymentStatus!=='payment_verified'||!o.userId||['guest','owner_manual_entry'].includes(o.userId))return{eligible:false};
   const points=integer(policy.pointsPerDeliveredOrder,1,1000000),minimum=integer(policy.minimumOrderPaise,0,9900000),amount=o.billingVersion===2?o.billing?.totalPaise:Math.round(o.totalAmount*100);
   integer(amount,1,9900000);if(amount<minimum)return{eligible:false};const uid=key(o.userId),wallet=db.doc('loyaltyLedger/'+uid),snap=await tx.get(wallet),b=balance(snap);
   tx.set(wallet,{...b,userId:uid,points:integer(b.points+points),lifetimeEarned:integer(b.lifetimeEarned+points),updatedAt:timestamp()});
   tx.create(entry,{userId:uid,orderId,sourceCollection:collection,kind:'delivered_award',points,qualifyingTotalPaise:amount,policy:{pointsPerDeliveredOrder:points,minimumOrderPaise:minimum},actor,createdAt:timestamp()});return{awarded:true,points};
  });
 }
 async function action(auth,name,data){
  if(!auth?.uid)throw Error('Sign in required');const uid=key(auth.uid);const requireOwner=()=>{if(!owner(auth))throw Error('Owner required');};
  if(name==='loyaltyPolicy'){
   requireOwner();if(typeof data.enabled!=='boolean')throw Error('Invalid policy');
   const p=data.enabled?{enabled:true,pointsPerDeliveredOrder:integer(data.pointsPerDeliveredOrder,1,1000000),minimumOrderPaise:integer(data.minimumOrderPaise,0,9900000),redemptionMinimumPoints:integer(data.redemptionMinimumPoints,1)}:{enabled:false};
   await db.doc('settings/loyaltyPolicy').set({...p,updatedBy:uid,updatedAt:timestamp()},{merge:true});return{ok:true};
  }
  if(name==='loyaltyReconcile'){requireOwner();return award({orderId:key(data.orderId),collection:data.collection||(data.orderId?.startsWith('APO-')?'product_orders':'orders'),actor:uid});}
  if(name==='loyaltyRedeem'){
   if(typeof data.requestId!=='string'||! /^[a-f0-9]{32}$/.test(data.requestId))throw Error('Invalid request key');const points=integer(data.points,1),reason=text(data.reason),id=createHash('sha256').update(uid+'|'+data.requestId).digest('hex'),request=db.doc('loyaltyRedemptions/'+id);
   return db.runTransaction(async tx=>{
    const [previous,policySnap,walletSnap,config]=await Promise.all([tx.get(request),tx.get(db.doc('settings/loyaltyPolicy')),tx.get(db.doc('loyaltyLedger/'+uid)),tx.get(db.doc('settings/featureSuite'))]);
    if(config.data()?.enabled!==true)throw Error('Feature suite not enabled');
    if(previous.exists){const old=previous.data();if(old.points!==points||old.reason!==reason)throw Error('Request key already used');return{id,status:old.status};}
    const policy=policySnap.data();if(policy?.enabled!==true)throw Error('Rewards unavailable');if(points<integer(policy.redemptionMinimumPoints,1))throw Error('Minimum redemption required');const b=balance(walletSnap);if(b.points<points)throw Error('Insufficient verified points');
    tx.update(db.doc('loyaltyLedger/'+uid),{points:b.points-points,reservedPoints:integer(b.reservedPoints+points),updatedAt:timestamp()});tx.create(request,{userId:uid,points,reason,status:'pending_owner_review',createdAt:timestamp()});return{id,status:'pending_owner_review'};
   });
  }
  if(name==='loyaltyReview'){
   requireOwner();const id=key(data.id),note=text(data.note),status=data.status;if(!['fulfilled','rejected'].includes(status))throw Error('Invalid review');
   return db.runTransaction(async tx=>{
    const request=db.doc('loyaltyRedemptions/'+id),snap=await tx.get(request);if(!snap.exists)throw Error('Request missing');const r=snap.data();
    if(r.status===status&&r.reviewNote===note)return{ok:true};if(r.status!=='pending_owner_review')throw Error('Request already reviewed');
    const wallet=db.doc('loyaltyLedger/'+key(r.userId)),walletSnap=await tx.get(wallet),b=balance(walletSnap),points=integer(r.points,1);if(b.reservedPoints<points)throw Error('Ledger requires reconciliation');
    tx.update(wallet,{points:integer(b.points+(status==='rejected'?points:0)),reservedPoints:b.reservedPoints-points,redeemedPoints:integer(b.redeemedPoints+(status==='fulfilled'?points:0)),updatedAt:timestamp()});
    tx.update(request,{status,reviewNote:note,reviewedBy:uid,reviewedAt:timestamp()});tx.create(db.doc('loyaltyEntries/redeem_'+id),{userId:r.userId,kind:status==='fulfilled'?'redemption_fulfilled':'redemption_rejected',points,requestId:id,actor:uid,createdAt:timestamp()});return{ok:true};
   });
  }
  throw Error('Unsupported loyalty action');
 }
 return{award,action};
}
