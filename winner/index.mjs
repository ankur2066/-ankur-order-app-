/**
 * Staged deployment candidate ONLY. The named Firestore database, IAM and
 * scheduling must be reviewed and explicitly approved before deployment.
 */
import {initializeApp,getApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {createDailyWinnerService} from './dailyWinnerService.mjs';
initializeApp();
const DATABASE='ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';
const base={region:'asia-southeast1',serviceAccount:'ankur-feature-suite@ankur-dryice-app.iam.gserviceaccount.com',
 minInstances:0,maxInstances:1,memory:'256MiB',timeoutSeconds:60};
const service=createDailyWinnerService({
 db:getFirestore(getApp(),DATABASE),
 timestamp:()=>FieldValue.serverTimestamp()
});
export const ankurWinnerSettings=onCall({...base,enforceAppCheck:true},async request=>{
 try{return await service.settings({auth:request.auth,app:request.app,data:request.data});}
 catch{throw new HttpsError('permission-denied','Daily Winner settings denied');}
});
export const ankurWinnerManualPick=onCall({...base,enforceAppCheck:true},async request=>{
 try{return await service.choose({auth:request.auth,app:request.app,data:request.data});}
 catch{throw new HttpsError('failed-precondition','Daily Winner selection unavailable');}
});
export const ankurWinnerAutoDaily=onSchedule({
 ...base,schedule:'0 21 * * *',timeZone:'Asia/Kolkata',retryCount:0
},async()=>{
 const outcome=await service.choose({automatic:true,data:{}});
 console.info('Daily Winner review outcome',{result:outcome?.skipped?'skipped':outcome?.alreadySelected?'already_selected':'one_selected'});
});
