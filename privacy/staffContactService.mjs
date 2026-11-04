/**
 * Private review: staff-safe order projections and per-order contact authorization.
 * Firebase Admin SDK only; do not import into a browser/client bundle.
 * No production deployments, broad contact queries, or phone-number audit logs.
 */
const SOURCES = new Set(['orders', 'product_orders']);
const STATUS = new Set(['pending','confirmed','in_packing','dispatched','delivered','cancelled']);
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{4,64}$/.test(value);
const safeUid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
// User-supplied names/labels may themselves contain a phone. Redact apparent
// Indian mobile numbers in EVERY displayed free-text field.
const plain = (v, limit = 100) => typeof v === 'string'
  ? v.replace(/(?:\+?91[ -]?)?[6-9](?:[ -]?[0-9]){9}/g,'[redacted]').slice(0, limit)
  : '';
const validStatus = value => STATUS.has(value);
const deny = () => { throw Error('Not authorized for this order'); };
export function projectionId(source, orderId) {
  if (!SOURCES.has(source) || !safeId(orderId)) throw Error('Invalid order reference');
  return source + '_' + orderId;
}
export function normalizeContactPhone(value) {
  if (typeof value !== 'string') deny();
  const compact = value.replace(/[ \t()-]/g, '');
  if (!/^(?:\+91|91)?[6-9][0-9]{9}$/.test(compact)) deny();
  return '+91' + compact.slice(-10);
}
export function staffSafeProjection(source, orderId, record, updatedAt) {
  const key = projectionId(source, orderId);
  if (!record || record.isTrash === true) return null;
  if (!validStatus(record.status)) throw Error('Invalid order status');
  // Explicit allowlist. Never spread Firestore customer records into staff views.
  return {
    projectionVersion: 1,
    sourceCollection: source,
    orderId,
    customerName: plain(record.customerName, 100),
    // Do not fall back to district: some legacy code saves a FULL ADDRESS there.
    city: plain(record.city, 100),
    productName: plain(record.productName, 100),
    dispatchTiming: plain(record.dispatchTiming, 100),
    status: record.status,
    paymentStatus: plain(record.paymentStatus, 50),
    quantityKg: Number.isFinite(record.quantityKg) ? record.quantityKg : null,
    quantityUnits: Number.isFinite(record.billing?.quantityUnits) ? record.billing.quantityUnits : null,
    quantityUnit: ['kg','piece','box'].includes(record.billing?.unit) ? record.billing.unit : null,
    billingVersion: record.billingVersion === 2 ? 2 : 1,
    // The self-pickup UI needs operational state only, never contact/identity data.
    selfPickup: ['pickup_pending','pickup_completed'].includes(record.selfPickup?.status)
      ? {
        status: record.selfPickup.status,
        receiptStatus: plain(record.selfPickup?.receiptStatus, 40)
      } : null,
    createdAt: record.createdAt ?? null,
    updatedAt
  };
}
function staffOk(user, permission) {
  return user && ['staff','delivery'].includes(user.role) &&
    user.active === true && user.permissions?.viewOrders === true &&
    user.permissions?.[permission] === true;
}
function inputOrder(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(k => !['sourceCollection','orderId'].includes(k))) deny();
  const {sourceCollection, orderId} = input;
  return {sourceCollection, orderId, key: projectionId(sourceCollection, orderId)};
}
export function createStaffPrivacyService({db, now = () => Date.now(), timestamp = () => new Date(now())}) {
  async function project({sourceCollection, orderId, after, occurredAt}) {
    const key = projectionId(sourceCollection, orderId);
    const viewRef = db.doc('staffOrderViews/' + key);
    const markerRef = db.doc('staffProjectionWatermarks/' + key);
    const eventTimeMs = Number.isSafeInteger(occurredAt) && occurredAt >= 0 ? occurredAt : now();
    const view = staffSafeProjection(sourceCollection, orderId, after, timestamp());
    // Cloud Functions events may be delivered twice or out of order. A tombstone
    // watermark is retained after deletion to reject stale replayed events.
    return db.runTransaction(async tx => {
      const marker = await tx.get(markerRef);
      if (marker.exists && marker.data()?.eventTimeMs >= eventTimeMs) return {skipped:true};
      if (view === null) tx.delete(viewRef);
      else tx.set(viewRef,view);
      tx.set(markerRef,{eventTimeMs,sourceCollection,orderId});
      return view === null ? {deleted:true} : {written:true};
    });
  }
  async function getOneOrderContact({auth, app, data}) {
    if (!auth?.uid || !safeUid(auth.uid) || !app) deny();
    const {sourceCollection, orderId, key} = inputOrder(data);
    const current = now();
    const dayStartMs = Math.floor(current / 86400000) * 86400000;
    const hourStartMs = Math.floor(current / 3600000) * 3600000;
    const userRef = db.doc('users/' + auth.uid);
    const orderRef = db.doc(sourceCollection + '/' + orderId);
    const assignmentRef = db.doc('staffOrderAssignments/' + key + '_' + auth.uid);
    const dailyRef = db.doc('staffContactRates/' + auth.uid);
    const hourlyRef = db.doc('staffContactRates/' + auth.uid + '_' + key);
    const auditRef = db.collection('staffContactAudit').doc();
    return db.runTransaction(async tx => {
      const [userSnap, orderSnap, assignmentSnap, dailySnap, hourlySnap] = await Promise.all([
        tx.get(userRef), tx.get(orderRef), tx.get(assignmentRef), tx.get(dailyRef), tx.get(hourlyRef)
      ]);
      const user = userSnap.data();
      const order = orderSnap.data();
      const assignment = assignmentSnap.data();
      if (!staffOk(user,'callCustomer') || !orderSnap.exists || order?.isTrash === true ||
          !validStatus(order.status) || order.status === 'cancelled') deny();
      if (!assignmentSnap.exists || assignment?.approved !== true ||
          assignment?.staffUid !== auth.uid || assignment?.sourceCollection !== sourceCollection ||
          assignment?.orderId !== orderId || !Number.isSafeInteger(assignment?.expiresAtMs) ||
          assignment.expiresAtMs <= current) deny();
      const phone = normalizeContactPhone(order.customerPhone);
      const daily = dailySnap.data() || {};
      const hourly = hourlySnap.data() || {};
      const usedToday = daily.dayStartMs === dayStartMs ? daily.count || 0 : 0;
      const usedThisHour = hourly.hourStartMs === hourStartMs ? hourly.count || 0 : 0;
      if (usedToday >= 50 || usedThisHour >= 5) deny();
      tx.set(dailyRef,{dayStartMs,count:usedToday+1,updatedAt:timestamp()});
      tx.set(hourlyRef,{hourStartMs,count:usedThisHour+1,updatedAt:timestamp()});
      // Audit contains identifiers and a time only; NEVER a phone number.
      tx.create(auditRef,{staffUid:auth.uid,sourceCollection,orderId,kind:'contact_access',createdAt:timestamp()});
      return {phone,orderId,sourceCollection,expiresInSeconds:15};
    });
  }
  async function assignStaffOrder({auth, app, data}) {
    const verifiedOwner = auth?.uid && auth?.token?.email === 'ankurdryicewholesalers@gmail.com' &&
      auth?.token?.email_verified === true;
    if (!verifiedOwner || !app || !data || typeof data !== 'object' || Array.isArray(data)) deny();
    if (Object.keys(data).some(k => !['sourceCollection','orderId','staffUid','approved','expiresHours'].includes(k)) ||
        typeof data.approved !== 'boolean' || !safeUid(data.staffUid)) deny();
    const {sourceCollection,orderId,key} = inputOrder({
      sourceCollection:data.sourceCollection,orderId:data.orderId
    });
    const expiresHours = data.expiresHours === undefined ? 24 : data.expiresHours;
    if (!Number.isSafeInteger(expiresHours) || expiresHours < 1 || expiresHours > 168) deny();
    const assignmentRef=db.doc('staffOrderAssignments/'+key+'_'+data.staffUid);
    const staffRef=db.doc('users/'+data.staffUid);
    const orderRef=db.doc(sourceCollection+'/'+orderId);
    return db.runTransaction(async tx => {
      const [staffSnap,orderSnap] = await Promise.all([tx.get(staffRef),tx.get(orderRef)]);
      if (!orderSnap.exists || !validStatus(orderSnap.data()?.status) || orderSnap.data()?.isTrash === true) deny();
      if (data.approved && !staffOk(staffSnap.data(),'callCustomer')) deny();
      tx.set(assignmentRef,{
        sourceCollection,orderId,staffUid:data.staffUid,approved:data.approved,
        expiresAtMs:data.approved ? now()+expiresHours*3600000 : now(),
        approvedBy:auth.uid,updatedAt:timestamp()
      });
      return {ok:true,sourceCollection,orderId,staffUid:data.staffUid,approved:data.approved};
    });
  }
  async function updateOrderStatus({auth,app,data}) {
    if (!auth?.uid || !safeUid(auth.uid) || !app) deny();
    if (!data || Object.keys(data).some(k => !['sourceCollection','orderId','status'].includes(k))) deny();
    const {sourceCollection,orderId} = inputOrder({sourceCollection:data.sourceCollection,orderId:data.orderId});
    if (!validStatus(data.status)) deny();
    const userRef=db.doc('users/'+auth.uid), orderRef=db.doc(sourceCollection+'/'+orderId);
    const assignmentRef=db.doc('staffOrderAssignments/'+projectionId(sourceCollection,orderId)+'_'+auth.uid);
    return db.runTransaction(async tx=>{
      const [userSnap,orderSnap,assignmentSnap]=await Promise.all([
        tx.get(userRef),tx.get(orderRef),tx.get(assignmentRef)]);
      const user=userSnap.data(), order=orderSnap.data(), assignment=assignmentSnap.data();
      if (!staffOk(user,'updateStatus') || !orderSnap.exists || order?.isTrash === true ||
          !assignmentSnap.exists || assignment?.approved !== true || assignment?.staffUid !== auth.uid ||
          assignment?.sourceCollection !== sourceCollection || assignment?.orderId !== orderId ||
          !Number.isSafeInteger(assignment?.expiresAtMs) || assignment.expiresAtMs <= now() ||
          !validStatus(order?.status) || typeof order?.trackingToken!=='string' ||
          !/^[A-Za-z0-9_-]{14,80}$/.test(order.trackingToken)) deny();
      const trackingRef=db.doc((sourceCollection==='orders'?'order_tracking':'product_order_tracking')+'/'+order.trackingToken);
      const tracker=await tx.get(trackingRef);
      if (!tracker.exists || tracker.data()?.orderId !== orderId) deny();
      // Both snapshots atomically preserve the original status/tracking relationship.
      tx.update(orderRef,{status:data.status,updatedAt:timestamp()});
      tx.update(trackingRef,{status:data.status,lastStatusUpdate:'Order status updated',updatedAt:timestamp()});
      return {ok:true,orderId,status:data.status};
    });
  }
  return {project,getOneOrderContact,updateOrderStatus,assignStaffOrder};
}
