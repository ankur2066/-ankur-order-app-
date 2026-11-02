import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {SourceTextModule, SyntheticModule, createContext} from 'node:vm';

const require=createRequire(resolve(process.env.ANKUR_CLIENT_QA||'/workspace/ankur-client-qa','package.json'));
const appRequire=createRequire(resolve(process.env.ANKUR_CLIENT_APP||'/workspace/ankur-audit-build','package.json'));
const React=require('react');
const {create,act}=require('react-test-renderer');
const {transformSync}=appRequire('esbuild');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const code=transformSync(readFileSync(new URL('./AppUpdateNotice.template',import.meta.url),'utf8'),{loader:'tsx',jsx:'automatic',format:'esm'}).code;
const first='https://ankurdryice.store/app-releases/Ankur-Dryice-v1.0.37-signed.apk';
const release=versionCode=>({versionCode,versionName:'1.0.'+versionCode,channel:'signed_apk',url:first});

async function harness(responses,native=true){
 let now=1000000;
 let checks=0;
 const events=new Map();
 const appListeners=new Map();
 const document={
   visibilityState:'visible',
   addEventListener(name,callback){events.set('document:'+name,callback);},
   removeEventListener(name){events.delete('document:'+name);}
 };
 const window={
   addEventListener(name,callback){events.set('window:'+name,callback);},
   removeEventListener(name){events.delete('window:'+name);}
 };
 const globals=createContext({document,window,Date:{now:()=>now}});
 const compiled=new SourceTextModule(code,{context:globals});
 await compiled.link(async name=>{
   const mocks={
     react:{...React,default:React},
     'react/jsx-runtime':require('react/jsx-runtime'),
     '@capacitor/core':{Capacitor:{isNativePlatform:()=>native,getPlatform:()=>'android'}},
     '@capacitor/app':{App:{addListener:async(name,callback)=>{
       appListeners.set(name,callback);
       return {remove:async()=>{appListeners.delete(name);}};
     }}},
     '../context/LanguageContext':{useLanguage:()=>({language:'en'})},
     '../services/appUpdate':{checkForUpdate:async()=>{checks++;return responses.shift()??null;}},
   };
   const exports=mocks[name];
   if(!exports)throw new Error('Unexpected native update notice import: '+name);
   return new SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context:globals});
 });
 await compiled.evaluate();
 let root;
 return{
   get checks(){return checks;},
   get text(){return JSON.stringify(root?.toJSON());},
   get root(){return root;},
   async mount(){await act(async()=>{root=create(React.createElement(compiled.namespace.AppUpdateNotice));});},
   async resume(name='window:focus'){now+=20000;await act(async()=>{events.get(name)?.();});},
   async burst(){await act(async()=>{events.get('window:focus')?.();events.get('document:visibilitychange')?.();});},
   async nativeResume(hidden=false,advance=20000){now+=advance;document.visibilityState=hidden?'hidden':'visible';await act(async()=>{appListeners.get('appStateChange')?.({isActive:true});});document.visibilityState='visible';},
   async nativeBackground(){await act(async()=>{appListeners.get('appStateChange')?.({isActive:false});});},
   async dismiss(){await act(async()=>{root.root.findByType('button').props.onClick();});},
   async close(){await act(async()=>root.unmount());await Promise.resolve();assert.equal(events.size,0);assert.equal(appListeners.size,0,'native listener cleaned up');},
 };
}

test('native update appears, Later persists for same version, newer release reopens, withdrawal clears link',async()=>{
 const h=await harness([release(37),release(37),release(38),null]);
 await h.mount();
 assert.match(h.text,/Ankur Dryice update available/);
 assert.equal(h.root.root.findByType('a').props.href,first);
 await h.dismiss();
 assert.equal(h.text,'null','Later hides the banner');
 await h.resume();
 assert.equal(h.text,'null','same release stays dismissed during resume');
 await h.resume('document:visibilitychange');
 assert.match(h.text,/1.0.38/,'newer release reopens notice');
 await h.resume();
 assert.equal(h.text,'null','withdrawn or invalid update must not retain old APK link');
 assert.equal(h.checks,4);
 await h.close();
});

test('quick focus/visibility burst is deduplicated; browser is not offered APK prompt',async()=>{
 const android=await harness([release(37),release(38)]);
 await android.mount();
 assert.equal(android.checks,1);
 await android.burst();
 assert.equal(android.checks,1,'burst must not cause an extra fetch');
 await android.close();
 const browser=await harness([release(37)],false);
 await browser.mount();
 assert.equal(browser.checks,0);
 assert.equal(browser.text,'null');
 await browser.close();
});

test('native Android appStateChange rechecks while WebView reports hidden; background does not request a manifest',async()=>{
 const h=await harness([release(37),release(38)]);
 await h.mount();
 assert.equal(h.checks,1);
 await h.nativeBackground();
 assert.equal(h.checks,1,'backgrounding the app must not fetch');
 await h.nativeResume(true);
 assert.equal(h.checks,2,'native resume must recheck even before document becomes visible');
 assert.match(h.text,/1.0.38/);
 await h.close();
});

test('native quick reopen checks again without duplicate foreground network calls',async()=>{
 const h=await harness([release(37),release(38)]);
 await h.mount();
 assert.equal(h.checks,1);
 await h.nativeBackground();
 await h.nativeResume(true,1000);
 assert.equal(h.checks,2,'a one-second genuine reopen should recheck');
 assert.match(h.text,/1.0.38/);
 await h.nativeResume(false,1000);
 assert.equal(h.checks,2,'repeat foreground event without background is throttled');
 await h.close();
});
