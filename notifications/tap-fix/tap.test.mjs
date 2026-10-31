import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire,stripTypeScriptTypes} from 'node:module';
import {resolve} from 'node:path';
import vm from 'node:vm';
const require=createRequire(resolve(process.env.ANKUR_CLIENT_QA || '.', 'package.json'));
const appRequire=createRequire(resolve(process.env.ANKUR_CLIENT_APP || '.', 'package.json'));
const React=require('react');const {create,act}=require('react-test-renderer');
const {transformSync}=appRequire('esbuild');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const id='ADI-20261031-ABCD';
async function harness(placed=[]) {
  const window=new EventTarget();
  class CustomEvent extends Event {constructor(name,options={}){super(name);this.detail=options.detail;}}
  const context=vm.createContext({console,window,Event,CustomEvent,Date});const modules=new Map();
  const synthetic=(name,values)=>{const m=new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v] of Object.entries(values))this.setExport(k,v);},{context,identifier:name});modules.set(name,m);};
  synthetic('react',{...React,default:React});synthetic('react/jsx-runtime',require('react/jsx-runtime'));
  synthetic('lucide-react',{BellRing:()=>null,X:()=>null});synthetic('./useOrderNotifications',{readPlacedOrders:()=>placed});
  for(const [key,file] of Object.entries({destination:'notificationDestination.template',opening:'useNotificationOpening.template',sheet:'NotificationSheet.template',toast:'NotificationToast.template'})) {
    const raw=readFileSync(new URL(file,import.meta.url),'utf8');
    const code=(key==='sheet'||key==='toast')?transformSync(raw,{loader:'tsx',jsx:'automatic',format:'esm'}).code:stripTypeScriptTypes(raw);
    modules.set(key,new vm.SourceTextModule(code,{context,identifier:key}));
  }
  const link=specifier=>modules.get(specifier.endsWith('notificationDestination')?'destination':specifier) || (()=>{throw Error('Unmocked boundary '+specifier);})();
  await modules.get('opening').link(link);await modules.get('opening').evaluate();
  await modules.get('sheet').link(link);await modules.get('sheet').evaluate();
  await modules.get('toast').link(link);await modules.get('toast').evaluate();
  const destinations=[],events=[];let open,root;
  function Host({ready,role,canView}){open=modules.get('opening').namespace.useNotificationOpening(ready,role,canView,(d,n)=>{destinations.push(d);events.push(n);});return null;}
  return {destinations,events,destination:modules.get('destination').namespace.notificationDestination,Sheet:modules.get('sheet').namespace.NotificationSheet,Toast:modules.get('toast').namespace.NotificationToast,
    async mount(ready=true,role='admin',canView=true){await act(async()=>{root=create(React.createElement(Host,{ready,role,canView}));});},
    async update(ready,role,canView){await act(async()=>root.update(React.createElement(Host,{ready,role,canView})));},
    async select(notice){await act(async()=>open(notice));},
    async tap(notice){await act(async()=>window.dispatchEvent(new CustomEvent('ankur-push-opened',{detail:notice})));},
    async close(){if(root)await act(async()=>root.unmount());}
  };
}
test('TEST fixtures and connection TEST never navigate to a removed or fabricated business order',async()=>{
 const h=await harness();await h.mount();for(const notice of [{orderId:'TEST-FCM-20261031-98EE1A'},{orderId:'PUSH-TEST'},{orderId:id,type:'connection_test'}])await h.select(notice);
 assert.ok(h.destinations.every(d=>d.kind==='test'));await h.close();
});
test('owner and permitted staff/delivery reach their own dashboard order search',async()=>{
 const h=await harness();await h.mount();await h.select({orderId:id});assert.equal(h.destinations.at(-1).kind,'owner');
 await h.update(true,'staff',true);await h.tap({orderId:id});assert.equal(h.destinations.at(-1).kind,'staff');assert.equal(h.destinations.at(-1).orderId,id);
 await h.update(true,'delivery',true);await h.tap({orderId:id});assert.equal(h.destinations.at(-1).kind,'staff');await h.close();
});
test('role revocation is rechecked at tap time; stale staff events cannot open an owner route',async()=>{
 const h=await harness();await h.mount(true,'staff',true);await h.update(true,'staff',false);await h.tap({orderId:id});assert.equal(h.destinations.at(-1).kind,'denied');
 await h.update(true,null,false);await h.tap({orderId:id});assert.equal(h.destinations.at(-1).kind,'tracking');assert.equal(h.destinations.at(-1).pin,'');await h.close();
});
test('guest order opens tracking using only the matching on-device PIN, ignoring any PIN in FCM',async()=>{
 const h=await harness([{orderId:id,trackingPin:'123456'},{orderId:'OTHER',trackingPin:'654321'}]);await h.mount(true,null,false);await h.tap({orderId:id,trackingPin:'999999'});
 assert.equal(h.destinations[0].kind,'tracking');assert.equal(h.destinations[0].pin,'123456');await h.close();
});
test('missing, trashed and malformed local PINs keep the existing private PIN prompt',async()=>{
 for(const placed of [[],[{orderId:id,trackingPin:'123456',isTrash:true}],[{orderId:id,trackingPin:123456}],[{orderId:id,trackingPin:'invalid'}]]) {
  const h=await harness(placed);assert.equal(h.destination({orderId:id},null,false,placed).pin,'');
 }
});
test('invalid notification identifiers cannot become Firestore paths or external links',async()=>{
 const h=await harness();for(const orderId of ['', '../orders/private','https://example.test','X'.repeat(65)])assert.equal(h.destination({orderId},'admin',true).kind,'invalid');
});
test('cold-start tap waits for role readiness and opens once after auth resolution',async()=>{
 const h=await harness();await h.mount(false,null,false);await h.tap({orderId:id,type:'new_order'});assert.equal(h.destinations.length,0);
 await h.update(true,'admin',true);assert.equal(h.destinations.length,1);assert.equal(h.destinations[0].kind,'owner');
 await h.update(true,'admin',true);assert.equal(h.destinations.length,1);await h.close();
});
test('real NotificationSheet renders a clickable order button forwarding the selected notice',async()=>{
 const h=await harness();const selected=[];let marked=0,root;
 const notice={id:'n',orderId:id,title:'New Order Received',body:'Updated',at:1,read:false};
 await act(async()=>{root=create(React.createElement(h.Sheet,{open:true,notices:[notice],onClose:()=>{},onMarkAllRead:()=>marked++,onOpenNotice:n=>selected.push(n)}));});
 const button=root.root.findByProps({'aria-label':'ऑर्डर '+id+' खोलें'});await act(async()=>button.props.onClick());
 assert.equal(marked,1);assert.equal(selected[0],notice);await act(async()=>root.unmount());
});
test('TEST message stays readable in the sheet, explicitly labeled without claiming a real order exists',async()=>{
 const h=await harness();let root;
 await act(async()=>{root=create(React.createElement(h.Sheet,{open:true,notices:[{id:'t',orderId:'TEST-FCM-20261031-98EE1A',title:'TEST',body:'Test only',at:1,read:false}],message:'यह TEST है।',onClose:()=>{},onMarkAllRead:()=>{},onOpenNotice:()=>{}}));});
 assert.ok(root.root.findByProps({'aria-label':'TEST संदेश देखें'}));assert.equal(root.root.findByProps({role:'status'}).children[0],'यह TEST है।');await act(async()=>root.unmount());
});

test('the screenshot-style owner/customer toast opens its selected message directly; X only dismisses',async()=>{
 const h=await harness();let root,dismissed=0;const selected=[];const notice={id:'toast',orderId:id,title:'New Order Received',body:'Updated',at:1,read:false};
 await act(async()=>{root=create(React.createElement(h.Toast,{notice,onOpenNotice:n=>selected.push(n),onDismiss:()=>dismissed++}));});
 await act(async()=>root.root.findByProps({'aria-label':'अपडेट खोलें'}).props.onClick());assert.equal(selected[0],notice);
 await act(async()=>root.root.findByProps({'aria-label':'बंद करें'}).props.onClick());assert.equal(dismissed,1);assert.equal(selected.length,1);await act(async()=>root.unmount());
});
test('staff toast uses the same direct opening callback and keeps its existing presentation',async()=>{
 const h=await harness();let root;const selected=[];const notice={id:'staff',orderId:id,title:'Update',body:'Changed',at:1,read:false};
 await act(async()=>{root=create(React.createElement(h.Toast,{team:true,notice,onOpenNotice:n=>selected.push(n),onDismiss:()=>{}}));});
 await act(async()=>root.root.findByType('button').props.onClick());assert.equal(selected[0],notice);await act(async()=>root.unmount());
});
test('clicking the exact screenshot TEST toast resolves an explanation rather than a removed-order route',async()=>{
 const h=await harness();let root,destination;const notice={id:'test',orderId:'TEST-FCM-20261031-98EE1A',title:'New Order Received',body:'1 KG · TEST ONLY',at:1,read:false};
 await act(async()=>{root=create(React.createElement(h.Toast,{notice,onOpenNotice:n=>{destination=h.destination(n,'admin',true);},onDismiss:()=>{}}));});
 await act(async()=>root.root.findByProps({'aria-label':'अपडेट खोलें'}).props.onClick());assert.equal(destination.kind,'test');await act(async()=>root.unmount());
});
