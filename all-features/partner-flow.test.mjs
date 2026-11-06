import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';

const require=createRequire(resolve(process.env.ANKUR_CLIENT_APP||process.cwd(),'package.json'));
const React=require('react');
const {create,act}=require('react-test-renderer');
const {transformSync}=require('esbuild');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;

async function harness(){
 const listeners=new Map(),calls=[];
 let finish;
 const firestore={
  doc:(_db,...parts)=>parts.join('/'),
  collection:(_db,path)=>path,
  query:target=>target,
  where:()=>null,
  onSnapshot:(path,callback)=>{
   listeners.set(path,callback);
   if(path==='settings/featureSuite')callback({exists:()=>true,data:()=>({enabled:true})});
   if(path==='partners/customer')callback({exists:()=>false});
   if(path==='bulkOrders')callback({docs:[]});
   return ()=>listeners.delete(path);
  }
 };
 const imports={
  react:{...React,default:React},
  'react/jsx-runtime':require('react/jsx-runtime'),
  'firebase/firestore':firestore,
  'firebase/functions':{getFunctions:()=>null,httpsCallable:()=>data=>{
   calls.push(data);
   return new Promise(resolve=>{finish=resolve;});
  }},
  '../../firebase':{app:{},db:{}},
  '../../data/rates':{getLocalRates:()=>({}),subscribeToRates:()=>()=>{}},
  '../../utils/commercialReceipt':{downloadCommercialReceipt:()=>{}},
  '../../services/orderPush':{subscribeNewOrderPush:()=>{}},
  '../../billing/unitBilling':{parseMoney:value=>Math.round(Number(value)*100)}
 };
 const context=createContext({});
 const source=readFileSync(new URL('./templates/FeatureDataPanels.template',import.meta.url),'utf8');
 const module=new SourceTextModule(transformSync(source,{loader:'tsx',jsx:'automatic',format:'esm'}).code,{context});
 await module.link(path=>{
  const value=imports[path];
  assert.ok(value,'Unexpected import '+path);
  return new SyntheticModule(Object.keys(value),function(){
   for(const [key,entry] of Object.entries(value))this.setExport(key,entry);
  },{context});
 });
 await module.evaluate();
 let root;
 return {
  calls,
  get root(){return root;},
  async mount(id='partner',role='customer'){await act(async()=>{root=create(React.createElement(module.namespace.DataFeaturePanel,{id,user:{uid:'customer',displayName:'Customer'},role}));});},
  async emit(path,data){await act(async()=>listeners.get(path)({exists:()=>data!==null,data:()=>data,id:'customer'}));},
  async emitRows(path,rows){await act(async()=>listeners.get(path)({docs:rows.map(row=>({id:row.id,data:()=>row}))}));},
  async finish(){await act(async()=>finish({data:{ok:true}}));},
  async close(){await act(async()=>root.unmount());}
 };
}

test('pending applications survive reload and approval opens bulk requests',async()=>{
 const h=await harness();
 await h.mount();
 assert.equal(h.root.root.findAllByType('form').length,0);
 await h.emit('partnerApplications/customer',{status:'pending'});
 assert.match(JSON.stringify(h.root.toJSON()),/Owner approval is pending/);
 assert.equal(h.root.root.findAllByType('form').length,0);
 await h.emit('partnerApplications/customer',{status:'approved'});
 await h.emit('partners/customer',{status:'approved'});
 assert.equal(h.root.root.findAllByType('form').length,1);
 await h.emit('partners/customer',{status:'revoked'});
 await h.emit('partnerApplications/customer',{status:'revoked'});
 assert.equal(h.root.root.findAllByType('form').length,0);
 assert.match(JSON.stringify(h.root.toJSON()),/currently inactive/);
 await h.close();
});

test('rapid duplicate application submit sends one call and then shows pending',async()=>{
 const h=await harness();
 await h.mount();
 await h.emit('partnerApplications/customer',null);
 const form=h.root.root.findByType('form');
 let submitted;
 await act(async()=>{
  submitted=form.props.onSubmit({preventDefault(){}});
  void form.props.onSubmit({preventDefault(){}});
 });
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].action,'partnerApply');
 await h.finish();
 await submitted;
 assert.equal(h.root.root.findAllByType('form').length,0);
 assert.match(JSON.stringify(h.root.toJSON()),/Owner approval is pending/);
 await h.close();
});

test('bulk quotes use the selected request ID and rupees convert to paise',async()=>{
 const h=await harness();
 await h.mount('bulk','admin');
 await h.emitRows('bulkOrders',[{id:'request123',customerName:'Buyer',quantityKg:20,address:'Lucknow',quotedTotalPaise:123450,status:'quoted'}]);
 assert.match(JSON.stringify(h.root.toJSON()),/1234.50/);
 let submitted;
 await act(async()=>{submitted=h.root.root.findByType('form').props.onSubmit({preventDefault(){}});});
 assert.equal(h.calls[0].action,'bulkQuote');
 assert.equal(h.calls[0].data.id,'request123');
 assert.equal(h.calls[0].data.totalPaise,123450);
 await h.finish();
 await submitted;
 await h.close();
});
