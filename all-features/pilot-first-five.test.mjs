import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const src=readFileSync(new URL('./templates/pilotRollout.template',import.meta.url),'utf8');
const core=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(stripTypeScriptTypes(src)));
const hub=readFileSync(new URL('./templates/FeatureHub.template',import.meta.url),'utf8');
const wire=readFileSync(new URL('./wire_additions.py',import.meta.url),'utf8');
const app=readFileSync(new URL('./apply_patch.py',import.meta.url),'utf8');
const five=['calculator','rates','faq','support','service-area'];
const manifest=ids=>({schemaVersion:1,channel:'pilot',minVersionCode:56,enabledFeatureIds:ids});

test('initial five are exactly the approved client-safe tools; later modules are hidden',()=>{
 assert.deepEqual([...core.PILOT_FIRST_FIVE],five);
 assert.equal(core.PILOT_ALL_IDS.length,14);
 assert.match(hub,/pilotIds\.includes\(f\.id\)/);
 assert.match(hub,/role==='admin'/);
 assert.match(hub,/f\.id==='video'/);
 assert.match(hub,/window\.setInterval/);
 assert.match(hub,/visibilitychange/);
 assert.match(app,/pilotRollout\.template/);
});
test('remote manifest can reveal approved features one batch at a time, without remote code',()=>{
 assert.deepEqual(core.parsePilotManifest(manifest(five)),five);
 const next=[...five,'loyalty','partner','subscriptions'];
 assert.deepEqual(core.parsePilotManifest(manifest(next)),next);
 assert.deepEqual(core.parsePilotManifest(manifest([])),[]);
 for(const bad of [
  null,[],{},manifest(['calculator','calculator']),manifest(['admin']),manifest(['bogus']),
  {...manifest(five),schemaVersion:2},{...manifest(five),channel:'public'},
  {...manifest(five),minVersionCode:57},{...manifest(five),minVersionCode:0},
  {...manifest(five),enabledFeatureIds:'calculator'},manifest(new Array(15).fill('faq'))
 ])assert.equal(core.parsePilotManifest(bad),null);
});
test('network failures, redirects and oversized payload cannot activate additional features',async()=>{
 const next=manifest([...five,'referral']);
 assert.equal(await core.fetchPilotFeatures(async()=>{throw Error('offline');}),null);
 assert.equal(await core.fetchPilotFeatures(async()=>({ok:false})),null);
 assert.equal(await core.fetchPilotFeatures(async()=>({ok:true,redirected:true})),null);
 assert.equal(await core.fetchPilotFeatures(async()=>({ok:true,headers:{get:()=> '9000'}})),null);
 assert.equal(await core.fetchPilotFeatures(async()=>({ok:true,text:async()=> 'x'.repeat(4200)})),null);
 let requested;
 const result=await core.fetchPilotFeatures(async(url,options)=>{
  requested={url,options};return {ok:true,text:async()=>JSON.stringify(next)};
 });
 assert.deepEqual(result,next.enabledFeatureIds);
 assert.equal(requested.url,'https://ankurdryice.store/app-updates/pilot-features.json');
 assert.equal(requested.options.cache,'no-store');
 assert.equal(requested.options.credentials,'omit');
 assert.equal(requested.options.redirect,'error');
});
test('calculator fills the original booking form after switching from AI Features',()=>{
 assert.match(hub,/ankur-open-calculator-booking/);
 assert.match(wire,/setCurrentTab\('home'\)/);
 assert.match(wire,/ankur\.pending\.calculated\.kg/);
 assert.match(wire,/window\.sessionStorage\.removeItem/);
 assert.match(wire,/Number\.isInteger\(kg\)&&kg>=10&&kg<=5000/);
 assert.match(hub,/result\.aboveMaximum/);
});
test('five screens keep truthful customer communication and no live order mutations',()=>{
 assert.match(hub,/number and WhatsApp use separate numbers|Call and WhatsApp use separate numbers/);
 assert.match(hub,/tel:\+919580882066/);
 assert.match(hub,/wa\.me\/918896332066/);
 assert.match(hub,/Never use an airtight container/);
 assert.match(hub,/A listed district is not a delivery availability or timing guarantee/);
 assert.match(hub,/not a final quote/);
 assert.match(hub,/subscribeToRates/);
 assert.doesNotMatch(hub,/setDoc\(|updateDoc\(|deleteDoc\(/);
});
