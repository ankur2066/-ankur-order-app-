/**
 * Pure named-database migration core. Admin SDK is injected; dry-run is the
 * only safe default. No customer name, address, phone or order value is logged.
 */
import {createStaffPrivacyService,staffSafeProjection} from './staffContactService.mjs';
export const SOURCES=['orders','product_orders'];
const PAGE=150;
export async function backfill({db,apply=false,log=()=>{}}) {
  const service=createStaffPrivacyService({db});
  const result={mode:apply?'apply':'dry-run',counts:{}};
  for (const source of SOURCES) {
    let scanned=0,eligible=0,excluded=0,written=0,removed=0,skipped=0,last=null;
    while (true) {
      let query=db.collection(source).orderBy('__name__').limit(PAGE);
      if(last)query=query.startAfter(last);
      const page=await query.get();
      if(page.empty)break;
      for(const snap of page.docs){
        scanned++;
        const record=snap.data();
        const view=staffSafeProjection(source,snap.id,record,new Date());
        if(view===null)excluded++;
        else eligible++;
        if(apply) {
          // Use authoritative document updateTime as event watermark.
          // Tombstone old unsafe views when the source is soft-deleted, too.
          const occurredAt=snap.updateTime?.toMillis();
          if(!Number.isSafeInteger(occurredAt))throw Error('Missing source updateTime');
          const outcome=await service.project({sourceCollection:source,orderId:snap.id,
            after:view===null?null:record,occurredAt});
          if(outcome.written)written++;
          else if(outcome.deleted)removed++;
          else skipped++;
        }
      }
      last=page.docs[page.docs.length-1];
      if(page.docs.length<PAGE)break;
    }
    result.counts[source]={scanned,eligible,excluded,written,removed,skipped};
    log(result.counts[source]&&{source,...result.counts[source]});
  }
  return result;
}
