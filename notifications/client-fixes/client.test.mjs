/** Real React hooks + real client modules; only platform/network boundaries are mocked. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire, stripTypeScriptTypes} from 'node:module';
import {resolve} from 'node:path';
import vm from 'node:vm';
const require = createRequire(resolve(process.env.ANKUR_CLIENT_QA || '.', 'package.json'));
const React = require('react');
const {create, act} = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const owner = {uid:'owner',email:'ankurdryicewholesalers@gmail.com',emailVerified:true};
const placedKey = 'ankur_dryice_placed_orders_v1';
const token = n => `ADI-20261031-${String(n).padStart(4,'0')}_123456`;
const order = n => ({orderId:`ADI-20261031-${String(n).padStart(4,'0')}`,trackingToken:token(n),createdAtMs:n,status:'pending',paymentStatus:'payment_pending'});
const event = (n=1) => ({orderId:order(n).orderId,type:'order_status',status:'confirmed',eventId:String(n).repeat(64),title:'Order Confirmed',body:'Updated'});
async function harness(initial={}) {
  const storage=new Map(Object.entries(initial).map(([k,v])=>[k,JSON.stringify(v)]));
  const window=new EventTarget();
  let clock=1_800_000_000_000;
  class Clock extends Date { static now(){return clock;} }
  class CustomEvent extends Event {constructor(name,options={}){super(name);this.detail=options.detail;}}
  // Avoid leaving toast timers alive. React timing is real; these are UI expiry timers only.
  window.setTimeout=()=>1;window.clearTimeout=()=>{};
  const localStorage={getItem:k=>storage.get(k) ?? null,setItem:(k,v)=>storage.set(k,v)};
  const listeners=[],writes=[],deletes=[],nativeListeners={},opened=[];
  window.addEventListener('ankur-push-opened',e=>opened.push(e.detail));
  const auth={currentUser:owner};
  let own=[];let deferred=null;
  const fs={
    collection:(_db,...parts)=>({path:parts.join('/')}),doc:(_db,...parts)=>({path:parts.join('/')}),
    where:(...args)=>args, query:(ref,...where)=>({...ref,where}),serverTimestamp:()=>({server:true}),
    getDocs:async ref=> deferred ? await deferred(ref) : {docs:own.map(data=>({data:()=>data}))},
    onSnapshot:(ref,options,callback)=>{const l={ref,callback,active:true};listeners.push(l);return ()=>{l.active=false;};},
    setDoc:async(ref,data)=>{writes.push({path:ref.path,data});},deleteDoc:async ref=>{deletes.push(ref.path);}
  };
  const PushNotifications={addListener:async(name,cb)=>{nativeListeners[name]=cb;},createChannel:async()=>{},checkPermissions:async()=>({receive:'granted'}),requestPermissions:async()=>({receive:'granted'}),register:async()=>{}};
  const context=vm.createContext({console,Map,Set,Date:Clock,Event,CustomEvent,window,localStorage,crypto:globalThis.crypto});
  const modules=new Map();
  function synthetic(key,exports){const m=new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v] of Object.entries(exports))this.setExport(k,v);},{context,identifier:key});modules.set(key,m);return m;}
  synthetic('react',React);synthetic('firebase/firestore',fs);synthetic('../firebase',{db:{},auth});
  synthetic('@capacitor/core',{Capacitor:{isNativePlatform:()=>true}});synthetic('@capacitor/push-notifications',{PushNotifications});
  const sources={state:'notificationState.template',hook:'useOrderNotifications.template',native:'pushClient.template'};
  for(const [key,file] of Object.entries(sources)) {
    modules.set(key,new vm.SourceTextModule(stripTypeScriptTypes(readFileSync(new URL(file,import.meta.url),'utf8')),{context,identifier:key}));
  }
  const linker=specifier=>{
    const key=specifier.endsWith('notificationState')?'state':specifier.endsWith('useOrderNotifications')?'hook':specifier;
    if(!modules.has(key))throw Error('Unmocked boundary: '+specifier);
    return modules.get(key);
  };
  await modules.get('native').link(linker);await modules.get('native').evaluate();
  const hook=modules.get('hook').namespace, native=modules.get('native').namespace, state=modules.get('state').namespace;
  let latest,root;
  function Host({user,team}){latest=hook.useOrderNotifications(user,team);return null;}
  return {native,state,auth,writes,deletes,nativeListeners,storage,listeners,opened,
    tick:n=>{clock+=n;},setOwn:rows=>{own=rows;},setDeferred:cb=>{deferred=cb;},
    async mount(user=owner,team=true){await act(async()=>{root=create(React.createElement(Host,{user,team}));});},
    async update(user,team){await act(async()=>root.update(React.createElement(Host,{user,team})));},
    async close(){if(root)await act(async()=>root.unmount());},
    get result(){return latest;},
    async dispatch(name,detail){await act(async()=>window.dispatchEvent(new CustomEvent(name,{detail})));},
    async emit(path,rows,metadata={fromCache:false,hasPendingWrites:false}){await act(async()=>{
      for(const l of listeners.filter(l=>l.active&&l.ref.path===path)) {
        const snapshot=path==='orders'?{docs:rows.map(data=>({id:data.orderId,data:()=>data})),metadata,docChanges:()=>[]}:{exists:()=>!!rows,data:()=>rows,metadata};
        l.callback(snapshot);
      }
    });},
    async receive(name,payload){await act(async()=>{await nativeListeners[name](payload);await new Promise(r=>setImmediate(r));});}
  };
}

test('first server snapshot stays silent after empty cache; only genuinely added orders alert',async()=>{
 const h=await harness();await h.mount();
 await h.emit('orders',[],{fromCache:true});await h.emit('orders',[order(1),order(2)]);
 assert.equal(h.result.notices.length,0);
 await h.emit('orders',[order(1),order(2),order(3)]);assert.equal(h.result.notices.length,1);
 assert.equal(h.result.notices[0].orderId,order(3).orderId);await h.close();
});
test('pending writes do not notify; acknowledged full snapshot detects changes even with no docChanges',async()=>{
 const h=await harness();await h.mount();await h.emit('orders',[order(1)]);
 const changed={...order(1),status:'confirmed'};
 await h.emit('orders',[changed],{hasPendingWrites:true});assert.equal(h.result.notices.length,0);
 await h.emit('orders',[changed]);assert.equal(h.result.notices.length,1);await h.close();
});
test('foreground Firestore then FCM creates one notice; repeated native delivery/tap eventId stays deduped',async()=>{
 const h=await harness();await h.mount();await h.emit('orders',[order(1)]);
 await h.emit('orders',[{...order(1),status:'confirmed'}]);
 await h.dispatch('ankur-push-arrived',event());await h.dispatch('ankur-push-arrived',event());
 assert.equal(h.result.notices.length,1);await h.close();
});
test('FCM before Firestore dedupes; event IDs persist across remount and do not suppress a later real transition',async()=>{
 const h=await harness();await h.mount();await h.emit('orders',[order(1)]);
 await h.dispatch('ankur-push-arrived',event());await h.emit('orders',[{...order(1),status:'confirmed'}]);
 assert.equal(h.result.notices.length,1);
 await h.emit('orders',[order(1)]);await h.emit('orders',[{...order(1),status:'confirmed'}]);assert.equal(h.result.notices.length,3);
 await h.close();await h.mount();await h.dispatch('ankur-push-arrived',event());assert.equal(h.result.notices.length,3);await h.close();
});
test('payment and pickup signals match backend metadata and do not duplicate their FCM pairs',async()=>{
 const h=await harness();await h.mount();await h.emit('orders',[order(1)]);
 const paid={...order(1),paymentStatus:'payment_verified'};await h.emit('orders',[paid]);
 await h.dispatch('ankur-push-arrived',{...event(),type:'payment_status',paymentStatus:'payment_verified'});
 await h.emit('orders',[{...paid,selfPickup:{status:'pickup_completed'}}]);
 await h.dispatch('ankur-push-arrived',{...event(2),orderId:order(1).orderId,type:'self_pickup',status:'pickup_completed'});
 assert.equal(h.result.notices.length,2);await h.close();
});
test('trash and restored historical orders never appear as new',async()=>{
 const h=await harness();await h.mount();await h.emit('orders',[{...order(1),isTrash:true}]);
 await h.emit('orders',[order(1),{...order(2),isTrash:true}]);assert.equal(h.result.notices.length,0);await h.close();
});
test('account and permission changes isolate the notice list and toast; legacy owner notices stay out of customer scope',async()=>{
 const legacy={id:'old',orderId:'PRIVATE-ORDER',title:'Private',body:'Private',at:1,read:false};
 const h=await harness({ankur_notices_v1:[legacy]});await h.mount();assert.equal(h.result.notices.length,1);
 await h.dispatch('ankur-push-arrived',event());assert.ok(h.result.toast);
 await h.update({uid:'customer',email:'other@example.test'},false);assert.equal(h.result.notices.length,0);assert.equal(h.result.toast,null);
 await h.update(owner,false);assert.equal(h.result.notices.length,1); // own privileged legacy only for the verified owner
 await h.update({uid:'staff'},true);await h.dispatch('ankur-push-arrived',event());assert.equal(h.result.notices.length,1);
 await h.update({uid:'staff'},false);assert.equal(h.result.notices.length,0);await h.close();
});
test('guest newly placed order starts a tracking listener immediately without sign-in or restart',async()=>{
 const h=await harness();await h.mount(null,false);assert.equal(h.listeners.filter(l=>l.active).length,0);
 h.storage.set(placedKey,JSON.stringify([order(1)]));await h.dispatch('ankur-orders-changed');
 assert.equal(h.listeners.filter(l=>l.active&&l.ref.path==='order_tracking/'+token(1)).length,1);
 await h.emit('order_tracking/'+token(1),order(1));await h.emit('order_tracking/'+token(1),{...order(1),status:'confirmed'});
 assert.equal(h.result.notices.length,1);await h.close();
});
test('customer watches newest eight across local and server orders, not query document order',async()=>{
 const h=await harness({[placedKey]:[order(1)]});h.setOwn(Array.from({length:10},(_,i)=>order(i+1)));await h.mount({uid:'customer'},false);
 const active=h.listeners.filter(l=>l.active).map(l=>l.ref.path);assert.equal(active.length,8);
 assert.ok(active.includes('order_tracking/'+token(10)));assert.ok(!active.includes('order_tracking/'+token(1)));await h.close();
});
test('customer drops global new-order FCM notices and mark-read survives restart',async()=>{
 const h=await harness();await h.mount(null,false);await h.dispatch('ankur-push-arrived',{...event(),type:'new_order'});assert.equal(h.result.notices.length,0);
 await h.dispatch('ankur-push-arrived',event());await act(async()=>h.result.markAllRead());assert.equal(h.result.unreadCount,0);
 await h.close();await h.mount(null,false);assert.equal(h.result.notices.length,1);assert.equal(h.result.unreadCount,0);await h.close();
});
test('native reception and background tap preserve event metadata and insert the same event once',async()=>{
 const h=await harness();await h.mount();await h.native.configureOrderPush(owner,'admin',true);
 const data=event();const message={data,title:data.title,body:data.body};
 await h.receive('pushNotificationReceived',message);await h.receive('pushNotificationActionPerformed',{notification:message});
 assert.equal(h.result.notices.length,1);assert.equal(h.result.notices[0].orderId,data.orderId);await h.close();
});
test('native registration keeps the newest ninth order and sends at most eight private subscriptions per sync',async()=>{
 const h=await harness({[placedKey]:Array.from({length:8},(_,i)=>order(8-i))});h.auth.currentUser=null;
 await h.native.configureOrderPush(null,null,false);await h.receive('registration',{value:'MOCK-FCM'});h.writes.length=0;
 await h.native.subscribeNewOrderPush(order(9).orderId,'123456');
 const paths=[...new Set(h.writes.map(w=>w.path))];assert.equal(paths.length,8);
 assert.ok(paths.some(p=>p.includes(token(9))));assert.ok(!paths.some(p=>p.includes(token(1))));
});
test('native signed-in customer discovers newest orders absent from local storage',async()=>{
 const h=await harness();h.auth.currentUser={uid:'customer'};h.setOwn(Array.from({length:10},(_,i)=>order(i+1)));
 await h.native.configureOrderPush(h.auth.currentUser,null,false);await h.receive('registration',{value:'MOCK-FCM'});
 const paths=[...new Set(h.writes.map(w=>w.path))];assert.equal(paths.length,8);assert.ok(paths.some(p=>p.includes(token(10))));
});
test('stale customer fetch cannot restore an old identity or subscribe their order after account switch',async()=>{
 const h=await harness();h.auth.currentUser={uid:'old-customer'};let resolveOld;
 h.setDeferred(()=>new Promise(r=>{resolveOld=r;}));const pending=h.native.configureOrderPush(h.auth.currentUser,null,false);
 await Promise.resolve();h.setDeferred(null);h.auth.currentUser=owner;await h.native.configureOrderPush(owner,'admin',true);
 resolveOld({docs:[{data:()=>order(1)}]});await pending;await h.receive('registration',{value:'MOCK-FCM'});
 assert.ok(h.writes.every(w=>w.path.startsWith('push_owner_devices/')));
});
test('revoked staff cannot register a privileged token; logout deletes registration before auth is cleared',async()=>{
 const h=await harness();h.auth.currentUser={uid:'staff'};await h.native.configureOrderPush(h.auth.currentUser,'staff',true);await h.receive('registration',{value:'MOCK-FCM'});
 assert.ok(h.writes.some(w=>w.path.startsWith('push_team_devices/staff/')));h.writes.length=0;
 await h.native.configureOrderPush(h.auth.currentUser,'staff',false);await h.receive('registration',{value:'MOCK-FCM'});assert.equal(h.writes.length,0);
 await h.native.unregisterTeamPushBeforeSignOut();assert.ok(h.deletes.some(p=>p.startsWith('push_team_devices/staff/')));assert.equal(h.auth.currentUser.uid,'staff');
});

test('Android cold-start data-only tap reconstructs a readable notice and forwards full routing metadata',async()=>{
 const h=await harness();await h.mount();await h.native.configureOrderPush(owner,'admin',true);
 const data={...event(),type:'new_order'};delete data.title;delete data.body;
 await h.receive('pushNotificationActionPerformed',{notification:{id:'mock-google-id',data}});
 assert.equal(h.result.notices.length,1);assert.equal(h.result.notices[0].title,'New Order Received');
 assert.ok(h.result.notices[0].body.includes(data.orderId));assert.equal(h.opened[0].eventId,data.eventId);assert.equal(h.opened[0].type,'new_order');await h.close();
});
test('data-only payment/pickup action titles retain their actual event meaning',async()=>{
 const h=await harness();await h.mount();await h.native.configureOrderPush(owner,'admin',true);
 await h.receive('pushNotificationActionPerformed',{notification:{data:{...event(),type:'payment_status',paymentStatus:'payment_verified'}}});
 await h.receive('pushNotificationActionPerformed',{notification:{data:{...event(2),type:'self_pickup',status:'pickup_completed'}}});
 assert.equal(h.result.notices.length,2);assert.equal(h.result.notices[0].title,'Pickup Completed');assert.equal(h.result.notices[1].title,'Payment Verified');await h.close();
});
