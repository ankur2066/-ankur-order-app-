/** Named-database synthetic Firestore rules for public winner and owner audit. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire((process.env.ANKUR_RULES_QA_ROOT||'/workspace/rules-qa')+'/package.json');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,getDocs,collection,setDoc}=require('firebase/firestore');
const DB='ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';
let env;
const guest=()=>env.unauthenticatedContext().firestore(DB);
const staff=()=>env.authenticatedContext('staff',{email:'staff@example.test',email_verified:true}).firestore(DB);
const owner=()=>env.authenticatedContext('owner',{email:'ankurdryicewholesalers@gmail.com',email_verified:true}).firestore(DB);
before(async()=>{
 assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:8085$/);
 env=await initializeTestEnvironment({projectId:'demo-ankur-winner-rules',
  firestore:{host:'127.0.0.1',port:8085,rules:readFileSync(process.env.ANKUR_WINNER_RULES,'utf8')}});
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore(DB);
  await setDoc(doc(db,'dailyWinners','2026-11-05'),{
   active:true,date:'2026-11-05',name:'Synthetic Winner',city:'Lucknow',
   giftLabel:'खास गिफ्ट'});
  await setDoc(doc(db,'dailyWinners','2026-11-04'),{
   active:false,date:'2026-11-04',name:'Unpublished',city:'Lucknow'});
  await setDoc(doc(db,'dailyWinnerPrivate','2026-11-05'),{
   orderId:'ADI-TEST',customerKey:'u:person',revision:1});
  await setDoc(doc(db,'dailyWinnerAudit','audit1'),{date:'2026-11-05',revision:1});
 });
});
after(()=>env?.cleanup());
test('all viewers can look up one active safe winner; unpublished winners stay private',async()=>{
 for(const db of [guest(),staff(),owner()]){
  const v=await assertSucceeds(getDoc(doc(db,'dailyWinners','2026-11-05')));
  assert.equal(v.data().city,'Lucknow');
  assert.equal(v.data().customerPhone,undefined);
  await assertFails(getDoc(doc(db,'dailyWinners','2026-11-04')));
  await assertFails(getDocs(collection(db,'dailyWinners')));
 }
});
test('no client role may forge or overwrite a winner; owner uses the trusted callable',async()=>{
 for(const db of [guest(),staff(),owner()]){
  await assertFails(setDoc(doc(db,'dailyWinners','2026-11-05'),{active:true,name:'Attacker'}));
  await assertFails(setDoc(doc(db,'dailyWinners','2026-11-06'),{active:true,name:'Attacker'}));
  await assertFails(setDoc(doc(db,'dailyWinnerPrivate','2026-11-05'),{orderId:'changed'}));
  await assertFails(setDoc(doc(db,'dailyWinnerAudit','bad'),{phone:'9000000001'}));
 }
});
test('owner alone may inspect private winner verification and audit records',async()=>{
 for(const path of ['dailyWinnerPrivate/2026-11-05','dailyWinnerAudit/audit1']){
  await assertSucceeds(getDoc(doc(owner(),path)));
  await assertFails(getDoc(doc(guest(),path)));
  await assertFails(getDoc(doc(staff(),path)));
 }
});
