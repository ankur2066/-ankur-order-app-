/**
 * READ ONLY: audit existing staff-safe Firestore views before any production
 * cutover. No customer names, phones, addresses, order IDs or values in reports.
 * Inject the named-database Admin Firestore instance from an approved operator.
 */
import {projectionId,staffSafeProjection} from './staffContactService.mjs';

const ALLOWED=new Set([
  'projectionVersion','sourceCollection','orderId','customerName','city',
  'productName','dispatchTiming','status','paymentStatus','quantityKg',
  'quantityUnits','quantityUnit','billingVersion','selfPickup','createdAt','updatedAt'
]);
const COMPARE=[
  'projectionVersion','sourceCollection','orderId','customerName','city',
  'productName','dispatchTiming','status','paymentStatus','quantityKg',
  'quantityUnits','quantityUnit','billingVersion'
];
function safeDate(value) {
  if(value === null || value === undefined)return true;
  if(value instanceof Date)return Number.isFinite(value.getTime());
  if(!value || typeof value!=='object' || Array.isArray(value) ||
     typeof value.toMillis!=='function' || typeof value.toDate!=='function')
    return false;
  try { const d=value.toDate(),n=value.toMillis();
    return d instanceof Date && Number.isFinite(d.getTime()) &&
      Number.isFinite(n) && Math.abs(n-d.getTime())<1;
  } catch {return false;}
}
function equalPickup(a,b) {
  return a==null&&b==null ||
    a!=null&&b!=null && typeof a==='object' && !Array.isArray(a) &&
    Object.keys(a).every(k=>['status','receiptStatus'].includes(k)) &&
    a.status===b.status && a.receiptStatus===b.receiptStatus;
}
export async function auditStaffProjections({db,pageSize=150,maxScan=50000}={}) {
  if(!db || !Number.isSafeInteger(pageSize) || pageSize<1 || pageSize>500 ||
      !Number.isSafeInteger(maxScan)||maxScan<1)throw Error('Invalid audit options');
  const out={mode:'read-only',scanned:0,safe:0,unsafe:0,orphan:0,stale:0,invalid:0};
  let cursor=null;
  while(true){
    let query=db.collection('staffOrderViews').orderBy('__name__').limit(pageSize);
    if(cursor)query=query.startAfter(cursor);
    const page=await query.get();
    if(page.empty)break;
    for(const snap of page.docs){
      if(++out.scanned>maxScan)throw Error('Audit maximum scans exceeded');
      const view=snap.data();
      let source,id;
      try {
        if(!view || typeof view!=='object'||Array.isArray(view)||
           Object.keys(view).some(key=>!ALLOWED.has(key))||
           !safeDate(view.createdAt) || !safeDate(view.updatedAt))
          {out.unsafe++;continue;}
        source=view.sourceCollection;id=view.orderId;
        if(projectionId(source,id)!==snap.id) {out.invalid++;continue;}
      } catch {out.invalid++;continue;}
      const original=await db.doc(source+'/'+id).get();
      if(!original.exists || original.data()?.isTrash===true)
        {out.orphan++;continue;}
      let expected;
      try {expected=staffSafeProjection(source,id,original.data(),new Date(0));}
      catch {out.invalid++;continue;}
      if(!expected) {out.orphan++;continue;}
      const same=COMPARE.every(k=>view[k]===expected[k]) &&
        equalPickup(view.selfPickup,expected.selfPickup) &&
        (expected.createdAt==null && view.createdAt==null ||
          expected.createdAt!=null && view.createdAt!=null &&
          safeDate(expected.createdAt) &&
          Math.abs(expected.createdAt.getTime() -
            (typeof view.createdAt.toMillis==='function'
              ? view.createdAt.toMillis():view.createdAt.getTime()))<1);
      if(same)out.safe++;
      else out.stale++;
    }
    cursor=page.docs.at(-1);
    if(page.docs.length<pageSize)break;
  }
  // No views could mean backfill has not run; never certify a zero-row cutover.
  return {...out,ready:out.scanned>0 && out.scanned===out.safe};
}
