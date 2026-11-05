// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=readFileSync(new URL('./mobileCsv.template',import.meta.url),'utf8')
 .replace("import { Capacitor } from '@capacitor/core';",'const Capacitor={isNativePlatform:()=>globalThis.csvDeps.native};')
 .replace("import('@capacitor/filesystem')",'Promise.resolve(globalThis.csvDeps.fs)')
 .replace("import('@capacitor/share')",'Promise.resolve(globalThis.csvDeps.share)');
const {exportCsv}=await import('data:text/javascript,'+encodeURIComponent(stripTypeScriptTypes(source)));
function setup(){
 const writes=[],shares=[];
 globalThis.csvDeps={native:true,fs:{Directory:{Cache:'CACHE'},Encoding:{UTF8:'utf8'},Filesystem:{writeFile:async x=>{writes.push(x);return{uri:'file:///private/cache/report.csv'};}}},share:{Share:{share:async x=>shares.push(x)}}};
 return{writes,shares};
}
test('native CSV preserves Hindi and BOM and attaches a private UTF8 file',async()=>{
 const h=setup();await exportCsv('नाम,शहर\r\nअंकुर,लखनऊ\r\n','orders.csv');
 assert.deepEqual(h.writes,[{path:'orders.csv',data:'\uFEFFनाम,शहर\r\nअंकुर,लखनऊ\r\n',directory:'CACHE',encoding:'utf8',recursive:false}]);
 assert.deepEqual(h.shares[0].files,['file:///private/cache/report.csv']);assert.equal(h.shares[0].url,undefined);
});
test('unsafe paths fail before writing customer data',async()=>{
 const h=setup();for(const name of ['../x.csv','x/one.csv','x..csv','x.pdf','/x.csv'])await assert.rejects(exportCsv('private',name));
 assert.equal(h.writes.length,0);assert.equal(h.shares.length,0);
});
test('write failure prevents share and cancellation propagates to caller',async()=>{
 const h=setup();globalThis.csvDeps.fs.Filesystem.writeFile=async()=>{throw Error('disk');};
 await assert.rejects(exportCsv('data','orders.csv'),/disk/);assert.equal(h.shares.length,0);
 setup();globalThis.csvDeps.share.Share.share=async()=>{throw Error('cancelled');};
 await assert.rejects(exportCsv('data','orders.csv'),/cancelled/);
});
test('browser downloads and releases its object URL without invoking native plugins',async()=>{
 const h=setup();globalThis.csvDeps.native=false;let clicked=0,removed=0,released=0;
 const originalURL=globalThis.URL,originalDocument=globalThis.document,originalWindow=globalThis.window;
 globalThis.URL={createObjectURL:b=>{assert.equal(b.type,'text/csv;charset=utf-8');return'blob:csv';},revokeObjectURL:u=>{assert.equal(u,'blob:csv');released++;}};
 const a={style:{},click:()=>clicked++,remove:()=>removed++};
 globalThis.document={createElement:()=>a,body:{appendChild:()=>{}}};globalThis.window={setTimeout:fn=>fn()};
 try{await exportCsv('a,b','orders.csv');assert.equal(a.download,'orders.csv');assert.equal(clicked,1);assert.equal(removed,1);assert.equal(released,1);assert.equal(h.writes.length,0);}
 finally{globalThis.URL=originalURL;globalThis.document=originalDocument;globalThis.window=originalWindow;}
});
