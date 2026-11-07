import crypto from 'node:crypto';

export const money = value => {
  if (!Number.isInteger(value) || value < 0 || value > 9_900_000) throw new Error('invalid-paise');
  return value;
};

export function quotePromo({baseTotalPaise,promo,nowMs,usageCount,userRedeemed=false}) {
  money(baseTotalPaise);
  if (!promo || promo.active !== true) throw new Error('promo-inactive');
  if (promo.startsAtMs > nowMs || promo.endsAtMs < nowMs) throw new Error('promo-expired');
  if (userRedeemed) throw new Error('promo-already-used');
  if (!Number.isInteger(promo.usageLimit) || usageCount >= promo.usageLimit) throw new Error('promo-limit');
  if (baseTotalPaise < money(promo.minimumPaise)) throw new Error('promo-minimum');
  const raw = promo.kind === 'fixed' ? money(promo.valuePaise) : Math.floor(baseTotalPaise * promo.basisPoints / 10000);
  const discountPaise = Math.min(baseTotalPaise, money(Math.min(raw, promo.maximumPaise)));
  return {baseTotalPaise,discountPaise,totalPaise:baseTotalPaise-discountPaise,nextUsageCount:usageCount+1};
}

export function commercialReceipt(order) {
  if (order.status !== 'delivered') throw new Error('not-delivered');
  money(order.totalPaise);
  return Object.freeze({id:`RECEIPT-${order.orderId}`,orderId:order.orderId,customerName:order.customerName,quantityKg:order.quantityKg,totalPaise:order.totalPaise,deliveredAt:order.deliveredAt,title:'Commercial Receipt',taxInvoice:false});
}

export function referralAttribution({newUserId,referrerId,eligibleOrderId,existing}) {
  if (!newUserId || !referrerId || newUserId === referrerId) throw new Error('invalid-referral');
  if (existing) return existing;
  return Object.freeze({id:newUserId,newUserId,referrerId,eligibleOrderId,status:'pending_owner_review',creditPaise:0});
}

export function dispatchStock({orderId,sku,quantityUnits,stock,ledger}) {
  if (!sku || !Number.isInteger(quantityUnits) || quantityUnits <= 0) throw new Error('invalid-movement');
  const movementId=`dispatch_${orderId}_${sku}`;
  if (ledger[movementId]) return {stock,ledger,movement:ledger[movementId],duplicate:true};
  if (stock.configured !== true || stock.enabled !== true) throw new Error('stock-unconfigured');
  if (!Number.isInteger(stock.availableUnits) || stock.availableUnits < quantityUnits) throw new Error('insufficient-stock');
  const movement=Object.freeze({id:movementId,orderId,sku,deltaUnits:-quantityUnits,reason:'dispatch'});
  return {stock:{...stock,availableUnits:stock.availableUnits-quantityUnits},ledger:{...ledger,[movementId]:movement},movement,duplicate:false};
}

export function recurringExecution({subscription,periodKey,existingOrder,approvedQuote,makePin}) {
  if (existingOrder) return {order:existingOrder,duplicate:true};
  if (subscription.approved !== true || subscription.active !== true || subscription.executionEnabled !== true) throw new Error('subscription-disabled');
  money(approvedQuote.totalPaise);
  const orderId=`SUB-${periodKey}-${subscription.id}`;
  const pin=String(makePin()).padStart(6,'0').slice(-6);
  return {duplicate:false,order:{orderId,userId:subscription.userId,quantityKg:subscription.quantityKg,totalPaise:approvedQuote.totalPaise,status:'pending',paymentStatus:'pending_verification',trackingPin:pin,periodKey,autoCharge:false},tracking:{orderId,trackingPin:pin,status:'pending'}};
}

export function partnerBulkRequest({userId,partner,quantityKg,note}) {
  if (!partner || partner.userId !== userId || partner.status !== 'approved') throw new Error('partner-required');
  if (!Number.isInteger(quantityKg) || quantityKg < 10 || quantityKg > 10000) throw new Error('invalid-quantity');
  return {userId,quantityKg,note:String(note||'').slice(0,500),status:'pending_owner_quote',quotedTotalPaise:null};
}

export const stableEventId = (...parts) => crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0,32);
