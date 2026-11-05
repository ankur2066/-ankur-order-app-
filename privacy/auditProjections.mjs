/**
 * Read-only named-DB staff-view audit CLI. Intended for an operator with
 * an authorized Firebase Admin identity. NEVER modifies production records.
 * Prints aggregate anomaly counts only, no identifiers or source values.
 * Usage:
 * ANKUR_PRIVACY_AUDIT_APPROVED_DATABASE=ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673
 * GOOGLE_CLOUD_PROJECT=ankur-dryice-app node auditProjections.mjs --read-only
 */
import {pathToFileURL} from 'node:url';
import {initializeApp,getApps,getApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {auditStaffProjections} from './projectionAudit.mjs';
export const PROJECT='ankur-dryice-app';
export const DATABASE='ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';

export function assertAuditOnly({argv,env}){
  if(argv.length!==1 || argv[0]!=='--read-only')throw Error('Read-only flag required');
  if(env.ANKUR_PRIVACY_AUDIT_APPROVED_DATABASE!==DATABASE)
    throw Error('Exact named database confirmation required');
  if(env.GOOGLE_CLOUD_PROJECT!==PROJECT && env.GCLOUD_PROJECT!==PROJECT)
    throw Error('Explicit target project required');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  // Validate before creating any network-capable Firebase Admin client.
  assertAuditOnly({argv:process.argv.slice(2),env:process.env});
  if(getApps().length===0)initializeApp({projectId:PROJECT});
  const db=getFirestore(getApp(),DATABASE);
  try {
    const result=await auditStaffProjections({db});
    // Only aggregate counters cross the process output boundary.
    console.log(JSON.stringify(result));
    if(!result.ready)process.exitCode=2;
  } catch {
    // SDK errors sometimes include sensitive document paths; do not echo them.
    console.error('Read-only audit failed. Check access, data integrity and scan limits.');
    process.exitCode=3;
  }
}
