import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
async function harness(config,fail){
 const calls=[];const bindings={'firebase/firestore':{doc:(_db,...path)=>path.join('/'),getDoc:async ref=>{calls.push(['read',ref]);if(fail==='read')throw Error('read failed');return{data:()=>config};}},'firebase/functions':{getFunctions:(_app,region)=>{assert.equal(region,'asia-southeast1');return{};},httpsCallable:(_fn,name)=>async data=>{calls.push(['call',name,data]);if(fail==='call')throw Error('call failed');return{data:{ok:true}};}},'../firebase':{app:{},db:{}}};
 const context=createContext({console});const source=stripTypeScriptTypes(readFileSync(new URL('./templates/inventoryDispatch.template',import.meta.url),'utf8'));const m=new SourceTextModule(source,{context});await m.link(name=>new SyntheticModule(Object.keys(bindings[name]),function(){for(const[k,v]of Object.entries(bindings[name]))this.setExport(k,v);},{context}));await m.evaluate();return{run:m.namespace.tryInventoryDispatch,calls};
}
test('optional inventory leaves non-dispatch and absent/disabled config on existing batch path',async()=>{
 for(const config of [undefined,{}, {enabled:false,inventoryEnabled:true},{enabled:true,inventoryEnabled:false}]){const h=await harness(config);assert.equal(await h.run('ADI-TEST','confirmed'),false);assert.equal(h.calls.length,0);assert.equal(await h.run('ADI-TEST','dispatched'),false);assert.equal(h.calls.length,1);}
});
test('enabled dispatch delegates only order ID to named-region trusted callable',async()=>{
 const h=await harness({enabled:true,inventoryEnabled:true});assert.equal(await h.run('APO-20261106-00000001','dispatched'),true);assert.equal(JSON.stringify(h.calls),JSON.stringify([['read','settings/featureSuite'],['call','ankurFeatureAction',{action:'stockDispatch',data:{orderId:'APO-20261106-00000001'}}]]));
});
test('settings/read or callable failure never falls back to untracked batch',async()=>{for(const step of ['read','call']){const h=await harness({enabled:true,inventoryEnabled:true},step);await assert.rejects(()=>h.run('ADI-TEST','dispatched'),new RegExp(step+' failed'));}});
