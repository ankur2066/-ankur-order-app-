import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

const source=readFileSync(new URL('./appUpdate.template',import.meta.url),'utf8');
const notice=readFileSync(new URL('./AppUpdateNotice.template',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');
const update=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(stripTypeScriptTypes(source)));
const play='https://play.google.com/store/apps/details?id=com.ankurdryice.events';
const apk='https://ankurdryice.store/app-releases/Ankur-Dryice-v1.0.44-signed.apk';
const mk=(url,versionCode=44,channel='signed_apk')=>({versionCode,versionName:'1.0.44',channel,url,notes:'Booking and Tracking improvements'});

test('version checker accepts only newer known verified destinations',()=>{
 assert.equal(update.ANDROID_VERSION_CODE,43);
 assert.equal(update.validateUpdateManifest(mk(apk))?.url,apk);
 assert.equal(update.validateUpdateManifest(mk(play,44,'play'))?.url,play);
 assert.equal(update.validateUpdateManifest(mk(apk,43)),null);
 assert.equal(update.validateUpdateManifest(mk(apk,42)),null);
 assert.equal(update.validateUpdateManifest(mk(apk,43.5)),null);
 assert.equal(update.validateUpdateManifest(mk(apk,99999999)),null);
});

test('block arbitrary and unsafe APK destinations, redirects and malformed content',()=>{
 for(const url of ['http://ankurdryice.store/app-releases/app.apk','https://attacker.example/app.apk',
 'https://ankurdryice.store.evil.example/app-releases/app.apk',
 'https://ankurdryice.store/other/app.apk',
 'https://ankurdryice.store/app-releases/app.apk?redirect=https://evil.example',
 'https://ankurdryice.store/app-releases/app.txt',
 'https://user:pass@ankurdryice.store/app-releases/app.apk',
 'https://ankurdryice.store:444/app-releases/app.apk',
 'javascript:alert(1)',
 'https://ankurdryice.store/app-releases/%2fmalicious.apk',
 'https://ankurdryice.store/app-releases/subdir/file.apk',
 'https://ankurdryice.store/app-releases//file.apk',
 'https://ankurdryice.store/app-releases/x%2eapk',
 'https://ankurdryice.store/app-releases/file.APK']){
  assert.equal(update.validateUpdateManifest(mk(url)),null,url);
 }
 assert.equal(update.validateUpdateManifest(mk(apk,43,'play')),null,'wrong Play channel');
 assert.equal(update.validateUpdateManifest({...mk(apk),notes:{html:'danger'}})?.notes,undefined);
 assert.equal(update.validateUpdateManifest({versionCode:43,versionName:'../../foo',channel:'signed_apk',url:apk}),null);
});

test('app-open update check fails closed when manifest is absent/offline and never redirects',async()=>{
 assert.equal(await update.checkForUpdate(async()=>{throw Error('offline');}),null);
 assert.equal(await update.checkForUpdate(async()=>({ok:false,status:404})),null);
 assert.equal(await update.checkForUpdate(async()=>({ok:true,text:async()=>'{not-json'})),null);
 assert.equal(await update.checkForUpdate(async()=>({ok:true,text:async()=> 'x'.repeat(8200)})),null);
 assert.equal(await update.checkForUpdate(async()=>({ok:true,redirected:true,text:async()=>JSON.stringify(mk(apk))})),null);
 let readBody=false;
 assert.equal(await update.checkForUpdate(async()=>({
   ok:true,
   headers:{get:key=>key==='content-length'?'9000':null},
   text:async()=>{readBody=true;return JSON.stringify(mk(apk));}
 })),null);
 assert.equal(readBody,false,'oversized declared body must not be read');
 let requested;
 const out=await update.checkForUpdate(async(url,options)=>{requested={url,options};return{ok:true,text:async()=>JSON.stringify(mk(apk))};});
 assert.equal(out?.versionCode,44);
 assert.equal(requested.url,'https://ankurdryice.store/app-updates/android-stable.json');
 assert.equal(requested.options.redirect,'error');
 assert.equal(requested.options.cache,'no-store');
});

test('native only, nonblocking, bilingual notice and no silent installer permissions',()=>{
 assert.match(notice,/Capacitor\.isNativePlatform\(\)/);
 assert.match(notice,/Capacitor\.getPlatform\(\)!=='android'/);
 assert.match(notice,/useLanguage\(\)/);
 assert.match(notice,/onClick=\{\(\)=>setDismissed\(true\)\}/);
 assert.match(notice,/document\.addEventListener\('visibilitychange',onResume\)/);
 assert.match(notice,/window\.addEventListener\('focus',onResume\)/);
 assert.match(notice,/App\.addListener\('appStateChange'/);
 assert.match(notice,/nativeForeground/);
 assert.match(notice,/nativeListener\.remove\(\)/);
 assert.match(notice,/if\(!info\)\{setRelease\(null\);return;\}/,'withdrawn/invalid releases must clear stale notice');
 assert.match(notice,/rel="noopener noreferrer"/);
 assert.doesNotMatch(notice,/REQUEST_INSTALL_PACKAGES|ACTION_INSTALL_PACKAGE|PackageInstaller|download\(/);
 assert.match(workflow,/versionCode 43/);
 assert.match(workflow,/versionName "1\.0\.43-season-test"/);
});
