import {createLoyaltyService} from './loyaltyService.mjs';
import {randomInt,randomBytes,createHash} from 'node:crypto';
const OWNER='ankurdryicewholesalers@gmail.com';
export function createFeatureService({db,now=()=>Date.now(),timestamp=()=>new Date()}){
 const loyalty=createLoyaltyService({db,timestamp});
 const owner=auth=>auth?.token?.email===OWNER&&auth.token.email_verified===true;
 const requireUser=auth=>{if(!auth?.uid)throw Error('Sign in required');return auth.uid;};
 const requireOwner=auth=>{if(!owner(auth))throw Error('Owner access required');};
 const statusPermission=team=>{const p=team?.permissions;return ['staff','delivery'].includes(team?.role)&&(p===undefined||(p!==null&&typeof p==='object'&&!Array.isArray(p)&&(!Object.hasOwn(p,'updateStatus')||p.updateStatus===true)));};
 const text=(value,max=300)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw Error('Invalid text');return value.trim();};
 const integer=(v,min=0,max=9900000)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('Invalid number');return v;};
 const code=v=>{if(typeof v!=='string'||! /^[A-Za-z0-9_-]{3,64}$/.test(v))throw Error('Invalid identifier');return v;};
 const publicRequest=(auth,data)=>({userId:requireUser(auth),customerName:text(data.customerName,100),customerPhone:(()=>{if(!/^[6-9]\d{9}$/.test(data.customerPhone))throw Error('Invalid phone');return data.customerPhone;})(),address:text(data.address),quantityKg:integer(data.quantityKg,10,5000)});
 return async function perform(auth,input){
  const {action,data={}}=input||{};if(!['promoBooking','promoQuote'].includes(action))requireUser(auth);
  const config=await db.doc('settings/featureSuite').get();if(config.data()?.enabled!==true)throw Error('Feature suite not enabled');
  if(['loyaltyPolicy','loyaltyReconcile','loyaltyRedeem','loyaltyReview'].includes(action))return loyalty.action(auth,action,data);
  if(action==='promoBooking'||action==='promoQuote'){
   const preview=action==='promoQuote';
   if(!preview&&(typeof data.requestId!=='string'||! /^[a-f0-9]{32}$/.test(data.requestId)))throw Error('Invalid request key');
   const buyer=auth?.uid||'guest',quantity=Number(data.quantityKg);if(!Number.isFinite(quantity)||quantity<10||quantity>5000||Math.abs(quantity-Math.round(quantity*1000)/1000)>1e-9)throw Error('Invalid quantity');
   const input=preview?{quantityKg:quantity}:{...publicRequest({uid:buyer},{...data,quantityKg:10}),quantityKg:quantity};const promoCode=code(String(data.code||'').toUpperCase());
   const fingerprint=createHash('sha256').update(JSON.stringify({input,code:promoCode,dispatchTiming:data.dispatchTiming})).digest('hex');
   const requestKey=createHash('sha256').update(buyer+'|'+String(data.requestId||'preview')).digest('hex');const requestRef=db.doc('promoRequests/'+requestKey);
   return db.runTransaction(async tx=>{const previous=preview?null:await tx.get(requestRef);if(previous?.exists){if(previous.data().fingerprint!==fingerprint)throw Error('Request key already used');return previous.data().result;}
    const promoRef=db.doc('promos/'+promoCode);const [promoSnap,ratesSnap,redemption]=await Promise.all([tx.get(promoRef),tx.get(db.doc('settings/rates')),auth?.uid?tx.get(db.doc('promoRedemptions/'+promoCode+'_'+createHash('sha256').update(buyer).digest('hex'))):Promise.resolve(null)]);
    const promo=promoSnap.data(),r=ratesSnap.data();if(!promo?.active||promo.kind!=='fixed'||promo.startsAtMs>now()||promo.endsAtMs<now()||!Number.isSafeInteger(promo.endsAtMs)||!Number.isSafeInteger(promo.startsAtMs))throw Error('Promotion unavailable');
    if(redemption?.exists)throw Error('Promotion already used');if(!Number.isSafeInteger(promo.usageLimit)||promo.usageLimit<1||!Number.isSafeInteger(promo.usageCount)||promo.usageCount<0||promo.usageCount>=promo.usageLimit)throw Error('Promotion limit reached');
    if(!r)throw Error('Approved rates unavailable');for(const k of ['dryIceRate','thermocolRate'])if(!Number.isFinite(r[k])||r[k]<0)throw Error('Invalid rates');const transport=r.transportRate||0;if(!Number.isFinite(transport)||transport<0)throw Error('Invalid transport');
    const baseTotalPaise=integer(Math.round(input.quantityKg*(r.dryIceRate+r.thermocolRate+transport)*100),1);if(baseTotalPaise<integer(promo.minimumPaise))throw Error('Minimum amount required');const discountPaise=Math.min(integer(promo.valuePaise,1),baseTotalPaise-1),totalPaise=baseTotalPaise-discountPaise;
    if(preview)return{baseTotalPaise,discountPaise,totalPaise};
    if(data.expectedTotalPaise!==totalPaise||(data.expectedBaseTotalPaise!==undefined&&data.expectedBaseTotalPaise!==baseTotalPaise))throw Error('Rates changed; review the updated amount');
    const orderId='ADI-'+new Date(now()).toISOString().slice(0,10).replaceAll('-','')+'-'+requestKey.slice(0,8).toUpperCase(),trackingPin=String(randomInt(100000,1000000)),trackingToken=orderId+'_'+trackingPin;
    const order={...input,orderId,trackingPin,trackingToken,userId:buyer,district:input.address.slice(0,100),city:input.address.slice(0,100),dispatchTiming:text(data.dispatchTiming,100),productName:'ड्राई आइस (Dry Ice)',dryIcePricePerKg:r.dryIceRate,thermocolPricePerKg:r.thermocolRate,transportPrice:transport,dryIceSubtotal:Math.round(input.quantityKg*r.dryIceRate*100)/100,thermocolSubtotal:Math.round(input.quantityKg*r.thermocolRate*100)/100,baseTotalAmount:baseTotalPaise/100,discountAmount:discountPaise/100,promoCode,totalAmount:totalPaise/100,status:'pending',paymentStatus:'pending_verification',paymentMethod:'paytm_business_upi',createdAt:timestamp(),updatedAt:timestamp()};
    tx.create(db.doc('orders/'+orderId),order);tx.create(db.doc('order_tracking/'+trackingToken),{orderId,trackingToken,status:'pending',paymentStatus:'pending_verification',quantityKg:input.quantityKg,productName:order.productName,district:order.district,dispatchTiming:order.dispatchTiming,lastStatusUpdate:'Order received.',createdAt:timestamp(),updatedAt:timestamp()});tx.update(promoRef,{usageCount:promo.usageCount+1});
    if(auth?.uid)tx.create(db.doc('promoRedemptions/'+promoCode+'_'+createHash('sha256').update(buyer).digest('hex')),{userId:buyer,orderId,createdAt:timestamp()});
    const result={orderId,trackingPin,totalAmount:order.totalAmount,baseTotalAmount:order.baseTotalAmount,discountAmount:order.discountAmount};tx.create(requestRef,{result,userId:buyer,fingerprint,createdAt:timestamp()});return result;
   });
  }
  if(action==='preferences'){
   if(typeof data.orderUpdates!=='boolean'||typeof data.promos!=='boolean')throw Error('Invalid preferences');
   await db.doc('userPrefs/'+auth.uid).set({orderUpdates:data.orderUpdates,promos:data.promos,updatedAt:timestamp()});return {ok:true};
  }
  if(action==='referralClaim'){
   const referrerId=code(data.referrerId);if(referrerId===auth.uid)throw Error('Self referral denied');
   return db.runTransaction(async tx=>{const ref=db.doc('referrals/'+auth.uid),old=await tx.get(ref);if(old.exists)return{ok:true};
    const [legacy,products]=await Promise.all([tx.get(db.collection('orders').where('userId','==',auth.uid).limit(2)),tx.get(db.collection('product_orders').where('userId','==',auth.uid).limit(2))]);
    const orders=[...legacy.docs,...products.docs];if(orders.length!==1||orders[0].data().status!=='delivered')throw Error('First delivered order required');
    tx.create(ref,{userId:auth.uid,referrerId,orderId:orders[0].id,status:'pending_owner_review',creditPaise:0,createdAt:timestamp()});return{ok:true};});
  }
  if(action==='referralReview'){
   requireOwner(auth);const userId=code(data.userId);if(!['verified','rejected'].includes(data.status))throw Error('Invalid review');
   await db.doc('referrals/'+userId).update({status:data.status,reviewedBy:auth.uid,reviewedAt:timestamp()});return{ok:true};
  }
  if(action==='partnerApply'){
   const value=publicRequest(auth,data);const ref=db.doc('partnerApplications/'+auth.uid);
   await db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists)throw Error('Application already submitted');tx.create(ref,{...value,status:'pending',createdAt:timestamp()});});return{ok:true};
  }
  if(action==='partnerApprove'){
   requireOwner(auth);const uid=text(data.userId,128);await db.doc('partners/'+uid).set({userId:uid,status:data.approved===true?'approved':'revoked',updatedAt:timestamp()});return{ok:true};
  }
  if(action==='bulkRequest'){
   const value=publicRequest(auth,data);const ref=db.collection('bulkOrders').doc();await db.runTransaction(async tx=>{const partner=await tx.get(db.doc('partners/'+auth.uid));if(partner.data()?.status!=='approved')throw Error('Approved partner required');tx.create(ref,{...value,note:String(data.note||'').slice(0,500),status:'pending_owner_quote',quotedTotalPaise:null,createdAt:timestamp()});});return{id:ref.id};
  }
  if(action==='bulkQuote'){
   requireOwner(auth);const id=code(data.id);await db.doc('bulkOrders/'+id).update({quotedTotalPaise:integer(data.totalPaise,1),status:'quoted',updatedAt:timestamp()});return{ok:true};
  }
  if(action==='subscriptionRequest'){
   const value=publicRequest(auth,data);if(!['weekly','monthly'].includes(data.cadence))throw Error('Invalid cadence');const ref=db.collection('subscriptions').doc();await ref.create({...value,cadence:data.cadence,approved:false,active:true,executionEnabled:false,createdAt:timestamp()});return{id:ref.id};
  }
  if(action==='subscriptionPause'||action==='subscriptionResume'){
   const ref=db.doc('subscriptions/'+code(data.id));await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists||snap.data().userId!==auth.uid)throw Error('Subscription unavailable');tx.update(ref,action==='subscriptionResume'?{active:true,approved:false,executionEnabled:false,updatedAt:timestamp()}:{active:false,updatedAt:timestamp()});});return{ok:true};
  }
  if(action==='subscriptionApprove'){
   requireOwner(auth);const ref=db.doc('subscriptions/'+code(data.id));const nextDueMs=integer(data.nextDueMs,now(),now()+366*86400000);
   await ref.update({approved:true,executionEnabled:data.executionEnabled===true,nextDueMs,dispatchTiming:text(data.dispatchTiming,100),updatedAt:timestamp()});return{ok:true};
  }
  if(action==='runSubscription'){
   requireOwner(auth);const ref=db.doc('subscriptions/'+code(data.id));const result=await db.runTransaction(async tx=>{
    const snap=await tx.get(ref),s=snap.data();if(!s?.approved||!s.active||!s.executionEnabled||s.nextDueMs>now())throw Error('Subscription not due');
    const period=String(s.nextDueMs),execution=db.doc('subscriptionExecutions/'+ref.id+'_'+period);const old=await tx.get(execution);if(old.exists)return old.data();
    const ratesSnap=await tx.get(db.doc('settings/rates'));if(!ratesSnap.exists)throw Error('Approved rates unavailable');const r=ratesSnap.data();for(const k of ['dryIceRate','thermocolRate'])if(!Number.isFinite(r[k])||r[k]<0)throw Error('Invalid rates');
    const qty=integer(s.quantityKg,10,5000),transport=r.transportRate||0;if(!Number.isFinite(transport)||transport<0)throw Error('Invalid transport rate');
    const total=Math.round(qty*(r.dryIceRate+r.thermocolRate+transport)*100)/100;if(total<=0||total>99000)throw Error('Invalid total');
    const orderId='ADI-'+new Date(now()).toISOString().slice(0,10).replaceAll('-','')+'-'+randomBytes(4).toString('hex').toUpperCase();const trackingPin=String(randomInt(100000,1000000)),trackingToken=orderId+'_'+trackingPin;
    const order={subscriptionId:ref.id,subscriptionPeriod:period,orderId,trackingPin,trackingToken,customerName:s.customerName,customerPhone:s.customerPhone,address:s.address,district:s.address.slice(0,100),city:s.address.slice(0,100),quantityKg:qty,dispatchTiming:s.dispatchTiming,productName:'Dry Ice',dryIcePricePerKg:r.dryIceRate,thermocolPricePerKg:r.thermocolRate,transportPrice:transport,dryIceSubtotal:Math.round(qty*r.dryIceRate*100)/100,thermocolSubtotal:Math.round(qty*r.thermocolRate*100)/100,totalAmount:total,status:'pending',paymentStatus:'pending_verification',paymentMethod:'paytm_business_upi',userId:s.userId,createdAt:timestamp(),updatedAt:timestamp()};
    const due=new Date(s.nextDueMs);if(s.cadence==='weekly')due.setUTCDate(due.getUTCDate()+7);else{const day=due.getUTCDate();due.setUTCDate(1);due.setUTCMonth(due.getUTCMonth()+1);const end=new Date(Date.UTC(due.getUTCFullYear(),due.getUTCMonth()+1,0)).getUTCDate();due.setUTCDate(Math.min(day,end));}
    tx.create(db.doc('orders/'+orderId),order);tx.create(db.doc('order_tracking/'+trackingToken),{orderId,trackingToken,quantityKg:qty,productName:'Dry Ice',district:order.district,dispatchTiming:s.dispatchTiming,status:'pending',paymentStatus:'pending_verification',lastStatusUpdate:'Order received.',createdAt:timestamp(),updatedAt:timestamp()});
    tx.create(execution,{orderId,period,userId:s.userId,createdAt:timestamp()});tx.update(ref,{nextDueMs:due.getTime(),updatedAt:timestamp()});return{orderId};});return result;
  }
  if(action==='stockOpening'){
   requireOwner(auth);if(!['kg','piece','box','package'].includes(data.unit))throw Error('Invalid stock unit');const sku=code(data.sku),quantityUnits=integer(data.quantityUnits,0,100000000);const ref=db.doc('stock/'+sku);await db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists)throw Error('Opening already configured; use audited adjustment');tx.create(ref,{sku,availableUnits:quantityUnits,configured:true,enabled:data.enabled===true,unit:text(data.unit,16),updatedAt:timestamp()});tx.create(db.doc('stockMovements/opening_'+sku),{sku,deltaUnits:quantityUnits,reason:'opening',actor:auth.uid,createdAt:timestamp()});});return{ok:true};
  }
  if(action==='stockAdjust'){
   requireOwner(auth);const sku=code(data.sku),key=code(data.requestId),delta=integer(data.deltaUnits,-100000000,100000000),reason=text(data.reason);return db.runTransaction(async tx=>{const ref=db.doc('stock/'+sku),movement=db.doc('stockMovements/adjust_'+key);const [stock,old]=await Promise.all([tx.get(ref),tx.get(movement)]);if(old.exists)return{ok:true};if(!stock.exists)throw Error('Stock not configured');const availableUnits=integer(stock.data().availableUnits+delta,0,100000000);tx.update(ref,{availableUnits,updatedAt:timestamp()});tx.create(movement,{sku,deltaUnits:delta,reason,actor:auth.uid,createdAt:timestamp()});return{ok:true};});
  }
  if(action==='inventorySettings'){
   requireOwner(auth);if(typeof data.inventoryEnabled!=='boolean')throw Error('Invalid inventory switch');
   await db.doc('settings/featureSuite').set({inventoryEnabled:data.inventoryEnabled,inventoryUpdatedAt:timestamp(),inventoryUpdatedBy:auth.uid},{merge:true});return{ok:true};
  }
  if(action==='stockDispatch'){
   const id=code(data.orderId);return db.runTransaction(async tx=>{
    const product=id.startsWith('APO-'),orderRef=db.doc((product?'product_orders/':'orders/')+id),ledger=db.doc('stockMovements/dispatch_'+id);
    const [setting,order,movement,staff]=await Promise.all([tx.get(db.doc('settings/featureSuite')),tx.get(orderRef),tx.get(ledger),owner(auth)?Promise.resolve(null):tx.get(db.doc('users/'+auth.uid))]);
    const config=setting.data();if(config?.enabled!==true||config.inventoryEnabled!==true)throw Error('Inventory dispatch not enabled');
    if(!owner(auth)&&!statusPermission(staff.data()))throw Error('Dispatch access denied');
    const o=order.data();if(!o||o.isTrash)throw Error('Order cannot dispatch');
    if(movement.exists){if(movement.data().orderId!==id||!['dispatched','delivered'].includes(o.status))throw Error('Dispatch ledger requires reconciliation');return{duplicate:true};}
    if(!['pending','confirmed','in_packing'].includes(o.status))throw Error('Order cannot dispatch');
    const productKey=o.productId?code(o.productId):'legacy_'+createHash('sha256').update(text(o.productName,100)).digest('hex').slice(0,20);
    const mapping=await tx.get(db.doc('stockMappings/'+productKey));if(!mapping.exists)throw Error('SKU mapping required');const sku=code(mapping.data().sku);
    if(data.sku!==undefined&&code(data.sku)!==sku)throw Error('SKU mapping mismatch');
    const stockRef=db.doc('stock/'+sku),stock=await tx.get(stockRef),s=stock.data();if(s?.configured!==true||s.enabled!==true)throw Error('Stock disabled');
    const units=o.billingVersion===2?o.billing?.quantityUnits:Math.round(o.quantityKg*1000),unit=o.billingVersion===2?o.billing?.unit:'kg';
    integer(units,1,100000000);const balance=integer(s.availableUnits,0,100000000);if(s.unit!==unit)throw Error('Unit mismatch');if(balance<units)throw Error('Insufficient stock');
    if(typeof o.trackingToken!=='string'||!o.trackingToken.startsWith(id+'_')||!/^\d{6}$/.test(o.trackingToken.slice(id.length+1)))throw Error('Tracking missing');
    const tracking=db.doc((product?'product_order_tracking/':'order_tracking/')+o.trackingToken),projection=await tx.get(tracking);
    if(!projection.exists||projection.data().orderId!==id||projection.data().status!==o.status)throw Error('Tracking requires reconciliation');
    tx.update(stockRef,{availableUnits:balance-units,updatedAt:timestamp()});tx.create(ledger,{orderId:id,sku,deltaUnits:-units,reason:'dispatch',actor:auth.uid,createdAt:timestamp()});tx.update(orderRef,{status:'dispatched',updatedAt:timestamp()});tx.update(tracking,{status:'dispatched',lastStatusUpdate:'Order dispatched.',updatedAt:timestamp()});return{ok:true};});
  }
  if(action==='stockMapping'){requireOwner(auth);const key=data.legacyName?'legacy_'+createHash('sha256').update(text(data.legacyName,100)).digest('hex').slice(0,20):code(data.productId);await db.doc('stockMappings/'+key).set({sku:code(data.sku),updatedAt:timestamp()});return{ok:true};}
  if(action==='eta'){
   const id=code(data.orderId);if(!owner(auth)){const staff=await db.doc('users/'+auth.uid).get();if(!statusPermission(staff.data()))throw Error('ETA access denied');}
   const etaMs=integer(data.etaMs,now(),now()+7*86400000),privateRef=db.doc((id.startsWith('APO-')?'product_orders/':'orders/')+id);await db.runTransaction(async tx=>{const order=await tx.get(privateRef);if(!order.exists)throw Error('Order not found');const token=order.data().trackingToken;const tracking=db.doc((id.startsWith('APO-')?'product_order_tracking/':'order_tracking/')+token);const p=await tx.get(tracking);if(!p.exists)throw Error('Tracking missing');const eta={etaMs,etaUpdatedAt:timestamp(),etaSource:'manual'};tx.update(privateRef,eta);tx.update(tracking,eta);});return{ok:true};
  }
  if(action==='promoSave'){
   requireOwner(auth);const promoCode=code(data.code.toUpperCase());const payload={code:promoCode,active:data.active===true,kind:'fixed',valuePaise:integer(data.valuePaise,1),minimumPaise:integer(data.minimumPaise),maximumPaise:integer(data.valuePaise,1),usageLimit:integer(data.usageLimit,1,1000000),startsAtMs:integer(data.startsAtMs,0,Number.MAX_SAFE_INTEGER),endsAtMs:integer(data.endsAtMs,0,Number.MAX_SAFE_INTEGER),updatedAt:timestamp()};if(payload.endsAtMs<=payload.startsAtMs)throw Error('Invalid promo period');await db.runTransaction(async tx=>{const ref=db.doc('promos/'+promoCode),old=await tx.get(ref);tx.set(ref,{...payload,usageCount:old.data()?.usageCount||0});});return{ok:true};
  }
  throw Error('Unsupported action');
 };
}
