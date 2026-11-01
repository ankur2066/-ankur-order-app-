import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';

async function harness(){
 const listeners=[];const context=createContext({});
 const firestore={collection:(_db,path)=>({path}),doc:(_db,path,id)=>({path,id}),query:r=>r,where:()=>null,getDoc:async()=>({exists:()=>false}),getDocs:async()=>({docs:[]}),onSnapshot:(ref,...args)=>{const next=args.find(x=>typeof x==='function');const error=args.filter(x=>typeof x==='function')[1];const entry={ref,next,error,stopped:false};listeners.push(entry);return()=>{entry.stopped=true;};}};
 const source=stripTypeScriptTypes(readFileSync(new URL('./templates/productOrders.template',import.meta.url),'utf8'));
 const module=new SourceTextModule(source,{context});
 await module.link(async name=>{const values=name==='firebase/firestore'?firestore:name==='../firebase'?{db:{}}:{normalizeUnitOrder:x=>({...x,normalized:true}),orderCollection:()=> 'orders',trackingCollection:()=> 'order_tracking'};return new SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);},{context});});
 await module.evaluate();return{api:module.namespace,listeners};
}
const snapshot=docs=>({docs:docs.map(id=>({id,data:()=>({orderId:id})})),metadata:{fromCache:false,hasPendingWrites:false}});
test('absent unit schema returns legacy snapshot without querying new orders',async()=>{
 const {api,listeners}=await harness();const received=[];api.subscribeOrderDocuments({},s=>received.push(s));
 const old=snapshot(['old']);listeners[0].next(old);assert.equal(received.length,0);
 listeners[1].next({exists:()=>false});assert.equal(received[0],old);assert.equal(listeners.length,2);
});
test('unit permission failure preserves legacy orders and surfaces error',async()=>{
 const {api,listeners}=await harness();const received=[],errors=[];api.subscribeOrderDocuments({},s=>received.push(s),e=>errors.push(e));
 listeners[0].next(snapshot(['old']));listeners[1].next({exists:()=>true,data:()=>({schemaVersion:2,enabled:false})});
 assert.equal(listeners[2].ref.path,'product_orders');listeners[2].error(new Error('permission-denied'));
 assert.equal(received.at(-1).docs[0].id,'old');assert.equal(errors.length,1);
});
test('paused selling retains unit history, normalized metadata and cleanup',async()=>{
 const {api,listeners}=await harness();const received=[];const stop=api.subscribeOrderDocuments({},s=>received.push(s));
 listeners[0].next(snapshot(['old']));listeners[1].next({exists:()=>true,data:()=>({schemaVersion:2,enabled:false})});listeners[2].next(snapshot(['unit']));
 assert.equal(received.at(-1).docs.length,2);assert.equal(received.at(-1).docs[1].data().normalized,true);assert.equal(received.at(-1).metadata.fromCache,false);
 stop();assert.ok(listeners.every(x=>x.stopped));
});
