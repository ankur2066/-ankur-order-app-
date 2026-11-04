/**
 * Named-DB staff-safe projection backfill, source-only. DRY RUN DEFAULT.
 * NEVER run --apply without a production backup, owner consent, rollback
 * approval, deployed server Functions/Rules, and an offline emulator rehearsal.
 * Uses authoritative Admin SDK only. Does NOT print customer PII.
 */
import {pathToFileURL} from 'node:url';
import {initializeApp,getApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createStaffPrivacyService,staffSafeProjection} from './staffContactService.mjs';

export const DATABASE='ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';
export const SOURCES=['orders','product_orders'];
const PAGE=150;
export function assertBackfillAuthorization({apply,env}) {
  if (apply && (env.ANKUR_PRIVACY_BACKFILL_APPROVED_DATABASE !== DATABASE ||
      env.ANKUR_PRIVACY_BACKFILL_SIGNOFF !== 'OWNER_CONFIRMED_BACKUP_AND_ROLLBACK')) {
    throw Error('Apply denied: explicit named DB and owner sign-off are required');
  }
}
export async function backfill({db,apply=false,log=()=>{}}) {
  const service=createStaffPrivacyService({db});
  const result={mode:apply?'apply':'dry-run',counts:{}};
  for (const source of SOURCES) {
    let scanned=0,eligible=0,excluded=0,written=0,skipped=0,last=null;
    while (true) {
      let query=db.collection(source).orderBy('__name__').limit(PAGE);
      if (last)query=query.startAfter(last);
      const page=await query.get();
      if (page.empty) break;
      for(const snap of page.docs){
        scanned++;
        const record=snap.data();
        const view=staffSafeProjection(source,snap.id,record,new Date());
        if (view === null) {excluded++;continue;}
        eligible++;
        if (apply) {
          // Use authoritative document updateTime as event watermark, so a
          // concurrent live order update cannot be replaced by a stale scan.
          const occurredAt=snap.updateTime?.toMillis();
          if (!Number.isSafeInteger(occurredAt)) throw Error('Missing source updateTime');
          const status=await service.project({sourceCollection:source,orderId:snap.id,
            after:record,occurredAt});
          if(status.written)written++;
          else skipped++;
        }
      }
      last=page.docs[page.docs.length-1];
      if(page.docs.length<PAGE)break;
    }
    result.counts[source]={scanned,eligible,excluded,written,skipped};
    log({source,scanned,eligible,excluded,written,skipped});
  }
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const apply=process.argv.includes('--apply');
  assertBackfillAuthorization({apply,env:process.env});
  initializeApp();
  const db=getFirestore(getApp(),DATABASE);
  const summary=await backfill({db,apply,log:row=>console.log(JSON.stringify(row))});
  console.log(JSON.stringify({completed:summary.mode,counts:summary.counts}));
}
