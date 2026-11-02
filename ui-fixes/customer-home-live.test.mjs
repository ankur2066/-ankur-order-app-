import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';

const sourceRoot=process.env.ANKUR_CLIENT_APP||process.cwd();
const require=createRequire(resolve(process.env.ANKUR_CLIENT_QA||sourceRoot,'package.json'));
const appRequire=createRequire(resolve(sourceRoot,'package.json'));
const React=require('react');
const {create,act}=require('react-test-renderer');
const {transformSync}=appRequire('esbuild');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const path=resolve(sourceRoot,'src/components/customer/CustomerHome.tsx');
const code=transformSync(readFileSync(path,'utf8'),{loader:'tsx',jsx:'automatic',format:'esm'}).code;

test('actual reconstructed Home switches customer labels/product names without changing selected product',async()=>{
 let language='en';
 const element=(name)=>()=>React.createElement('span',null,name);
 const stub={
   react:{...React,default:React},
   'react/jsx-runtime':require('react/jsx-runtime'),
   'lucide-react':{Bell:element('Bell'),Clock:element('Clock')},
   './BrandMark':{BrandMark:element('Ankur')},
   './FeatureHub':{FeatureHub:element('Tools')},
   '../../context/LanguageContext':{useLanguage:()=>({language})},
 };
 const context=createContext({});
 const module=new SourceTextModule(code,{context});
 await module.link(async name=>{
   const bindings=stub[name];
   assert.ok(bindings,'Unexpected customer Home dependency: '+name);
   return new SyntheticModule(Object.keys(bindings),function(){
     for(const[k,v]of Object.entries(bindings))this.setExport(k,v);
   },{context});
 });
 await module.evaluate();
 const Home=module.namespace.CustomerHome;
 const props={
   products:[{id:'dryice',name:'Dry Ice Test',hindiName:'ड्राई आइस परीक्षण',category:'dry_ice',active:true}],
   productsLoading:false,productsError:null,rates:{dryIceRate:50,thermocolRate:10,transportRate:0},
   currentUser:null,unreadCount:2,
   bookingForm:()=>React.createElement('section',{'data-form':'real'},'Safe booking fixture'),
   onOpenNotifications:()=>{},onBook:()=>{},onReorder:()=>{},onPromoAction:()=>{}
 };
 let root;
 await act(async()=>{root=create(React.createElement(Home,props));});
 function getText(){return JSON.stringify(root.toJSON());}
 assert.match(getText(),/Choose Product/);
 assert.match(getText(),/Dry Ice Booking Form/);
 assert.match(getText(),/Dry Ice Test/);
 assert.equal(root.root.findAllByProps({'data-form':'real'}).length,1);
 language='hi';
 await act(async()=>root.update(React.createElement(Home,props)));
 assert.match(getText(),/प्रोडक्ट चुनें/);
 assert.match(getText(),/ड्राई आइस बुकिंग फॉर्म/);
 assert.match(getText(),/ड्राई आइस परीक्षण/);
 assert.equal(root.root.findAllByProps({'data-form':'real'}).length,1,'single real booking form retained');
 assert.equal(root.root.findAllByType('select').length,1,'one product selector');
 await act(async()=>root.unmount());
});
