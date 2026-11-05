import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
async function harness(native,plugin={},window={}){
 const context=createContext({window,AbortController,setTimeout,clearTimeout,Error,Array});
 const source=stripTypeScriptTypes(readFileSync(new URL('./voiceInput.template',import.meta.url),'utf8'));
 const module=new SourceTextModule(source,{context});
 await module.link(async name=>{
  const values=name==='@capacitor/core'?{Capacitor:{isNativePlatform:()=>native}}:{SpeechRecognition:plugin};
  return new SyntheticModule(Object.keys(values),function(){for(const [key,value] of Object.entries(values))this.setExport(key,value);},{context});
 });await module.evaluate();return module.namespace.captureSpeech;
}
test('native microphone requests permission only when invoked, then returns Hindi transcript',async()=>{
 const calls=[];const capture=await harness(true,{
  available:async()=>({available:true}),checkPermissions:async()=>({speechRecognition:'prompt'}),
  requestPermissions:async()=>{calls.push('permission');return{speechRecognition:'granted'};},
  start:async options=>{calls.push(options);return{matches:[' आज कितनी बुकिंग है? ']};}
 });assert.deepEqual(calls,[]);
 assert.equal(await capture(new AbortController().signal),'आज कितनी बुकिंग है?');
 assert.equal(calls[1].language,'hi-IN');assert.equal(calls[1].popup,true);assert.equal(calls[1].partialResults,false);
});
test('denied permission or absent recognizer never starts recording',async()=>{
 let started=0;
 for(const available of [true,false]){
  const capture=await harness(true,{available:async()=>({available}),checkPermissions:async()=>({speechRecognition:'denied'}),requestPermissions:async()=>({speechRecognition:'denied'}),start:async()=>{started++;}});
  await assert.rejects(()=>capture(new AbortController().signal),available?/permission/:/unavailable/);
 }assert.equal(started,0);
});
test('screen cancellation stops native capture and discards late recognition',async()=>{
 let finish,stops=0;const pending=new Promise(r=>{finish=r;});
 const capture=await harness(true,{available:async()=>({available:true}),checkPermissions:async()=>({speechRecognition:'granted'}),start:()=>pending,stop:async()=>{stops++;}});
 const controller=new AbortController(),result=capture(controller.signal);
 await new Promise(r=>setImmediate(r));controller.abort();finish({matches:['late text']});
 await assert.rejects(()=>result,/cancelled/);assert.equal(stops,1);
});
test('browser recognition returns text and closes; unsupported browser fails clearly',async()=>{
 let recognizer,aborts=0;
 class Recognition{constructor(){recognizer=this;}start(){this.onresult({results:[[{transcript:'test question'}]]});}abort(){aborts++;}}
 const capture=await harness(false,{}, {SpeechRecognition:Recognition});
 assert.equal(await capture(new AbortController().signal),'test question');assert.equal(recognizer.lang,'hi-IN');assert.equal(aborts,1);
 const unsupported=await harness(false);await assert.rejects(()=>unsupported(new AbortController().signal),/unavailable/);
});
test('mic only fills the draft; send remains explicit and disabled during capture',()=>{
 const ui=readFileSync(new URL('./AIChat.template',import.meta.url),'utf8');
 const dictation=ui.split('const dictate=async()=>{')[1].split('const sendMessage')[0];
 assert.match(dictation,/setInput/);assert.doesNotMatch(dictation,/fetch\(|sendMessage\(/);
 assert.match(ui,/disabled=\{loading \|\| listening \|\| !input.trim\(\)\}/);
 assert.match(ui,/voiceSession.current\?\.abort\(\)/);
});
