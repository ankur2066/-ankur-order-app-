import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{createRequire}from'node:module';import{resolve,dirname}from'node:path';import{SourceTextModule,SyntheticModule,createContext}from'node:vm';import{uiModule}from'./test-loader.mjs';
const root=process.env.ANKUR_CLIENT_APP||process.cwd(),appRequire=createRequire(resolve(root,'package.json')),require=createRequire(resolve(process.env.ANKUR_CLIENT_QA||root,'package.json')),React=require('react'),{create,act}=require('react-test-renderer'),{transformSync}=appRequire('esbuild'),ts=appRequire('typescript');globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const owner={uid:'fixture-owner',email:'ankurdryicewholesalers@gmail.com',emailVerified:true,displayName:'Fixture Owner'},rate={dryIceRate:50,thermocolRate:10,transportRate:0};
const textOf=n=>n===null?'':typeof n==='string'?n:Array.isArray(n)?n.map(textOf).join(''):(n.children||[]).map(textOf).join('');
async function screen(path,name,props={},seed=[],staffViews=[]){
 let language='en';const storage=new Map(),window=new EventTarget();window.setTimeout=()=>1;window.clearTimeout=()=>{};window.setInterval=()=>1;window.clearInterval=()=>{};window.open=()=>{};const loc={origin:'https://fixture.invalid',pathname:'/',href:'https://fixture.invalid/'};window.location=loc;const document=new EventTarget();document.visibilityState='visible';document.documentElement={dataset:{}};const context=createContext({console,window,document,Date,Intl,URL,crypto:globalThis.crypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{clipboard:{writeText:async()=>{}}},location:loc,setTimeout:()=>1,clearTimeout:()=>{}});
 const mods=new Map(),dict=JSON.parse(readFileSync(resolve(root,'src/i18n/messages.json'),'utf8')),ui=await uiModule(context,React,()=>language,root),snap={exists:()=>false,data:()=>({}),docs:[],forEach(){}};
 const fs={doc:(_db,...p)=>({path:p.join('/')}),collection:(_db,...p)=>({path:p.join('/')}),query:r=>r,where:()=>null,orderBy:()=>null,limit:()=>null,serverTimestamp:()=>'<server>',getDoc:async()=>snap,getDocs:async()=>snap,onSnapshot:(_ref,a,b)=>{const cb=typeof a==='function'?a:b;const value=_ref.path==='staffOrderViews'&&staffViews.length?{...snap,docs:staffViews.map(o=>({id:o.orderId,data:()=>o}))}:_ref.path==='settings/featureSuite'?{...snap,exists:()=>true,data:()=>({features:Object.fromEntries(['calculator','video','loyalty','catalog','partner','subscriptions','promotions','inventory','reports','faq','rates','support','service-area','referral'].map(id=>[id,true]))})}:snap;Promise.resolve().then(()=>cb(value));return()=>{};},writeBatch:()=>({set(){},update(){},commit:async()=>{}}),setDoc:async()=>{},updateDoc:async()=>{},deleteDoc:async()=>{},deleteField:()=>null,increment:()=>null,addDoc:async()=>({id:'fixture'})};
 const bindings={react:{...React,default:React},'react/jsx-runtime':require('react/jsx-runtime'),'firebase/firestore':fs,'firebase/functions':{getFunctions:()=>({}),httpsCallable:()=>async()=>({data:{}})},'firebase/app':{getApp:()=>({})}};
 function synthetic(id,exports){return new SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context,identifier:id});}
 async function load(file){if(mods.has(file))return mods.get(file);const source=readFileSync(file,'utf8'),sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),imports=new Map();for(const d of sf.statements.filter(ts.isImportDeclaration)){const entries=d.importClause?.namedBindings&&ts.isNamedImports(d.importClause.namedBindings)?d.importClause.namedBindings.elements.map(e=>(e.propertyName||e.name).text):[];imports.set(d.moduleSpecifier.text,entries);}
 const m=new SourceTextModule(transformSync(source,{loader:file.endsWith('.tsx')?'tsx':'ts',jsx:'automatic',format:'esm'}).code,{context,identifier:file});mods.set(file,m);await m.link(async id=>{
 if(id.endsWith('/i18n/UiText'))return ui;if(bindings[id])return synthetic(id,bindings[id]);const names=imports.get(id)||[];
 if(id==='lucide-react'||id==='recharts')return synthetic(id,Object.fromEntries(names.map(k=>[k,()=>null])));
 if(id.endsWith('/firebase'))return synthetic(id,{app:{},db:{},auth:{currentUser:owner},ADMIN_EMAIL:owner.email,isUserAdmin:u=>u?.email===owner.email,signInWithGoogle:async()=>{},signOutUser:async()=>{},handleFirestoreError:e=>{throw e;},OperationType:{LIST:'list',WRITE:'write'}});
 if(id.endsWith('/context/LanguageContext'))return synthetic(id,{useLanguage:()=>({language,t:k=>({en:{profile:'Profile',customer:'Customer',owner:'Owner',staff:'Staff',delivery:'Delivery',ownerDashboard:'Open Owner Dashboard',contact:'Contact us',call:'Call',logout:'Log out',settings:'Settings',language:'Language',english:'English',hindi:'हिंदी (Hindi)',features:'Services and tools',back:'Back'},hi:{profile:'प्रोफ़ाइल',customer:'ग्राहक',owner:'मालिक',staff:'स्टाफ',delivery:'डिलीवरी',ownerDashboard:'ओनर डैशबोर्ड खोलें',contact:'संपर्क करें',call:'कॉल',logout:'लॉगआउट',settings:'सेटिंग्स',language:'भाषा',english:'English',hindi:'हिंदी (Hindi)',features:'सेवाएँ और टूल',back:'वापस'}}[language][k]||k),setLanguage:v=>{language=v;}})});
 if(id.endsWith('/data/rates'))return synthetic(id,{DEFAULT_RATES:rate,getLocalRates:()=>rate,subscribeToRates:()=>()=>{},saveCurrentRates:async()=>{}});
 if(id.endsWith('/services/productOrders'))return synthetic(id,{subscribeOrderDocuments:(_f,cb)=>{Promise.resolve().then(()=>cb({...snap,docs:seed.map(o=>({id:o.orderId,data:()=>o}))}));return()=>{};},ownOrderDocuments:async()=>{const docs=seed.map(o=>({data:()=>o}));return{...snap,docs,forEach:cb=>docs.forEach(cb)};},orderRef:v=>v,trackingRef:v=>v});
 if(id.endsWith('/services/inventoryDispatch'))return synthetic(id,{tryInventoryDispatch:async()=>false});
 if(id.endsWith('/hooks/useInlinePromo'))return synthetic(id,{useInlinePromo:()=>({code:'',quote:null,busy:false,locked:false,setCode(){},apply:async()=>{},book:async()=>{throw Error('No fixture promo');}})});
 if(id.endsWith('/hooks/useProducts'))return synthetic(id,{useStorefrontProducts:()=>({products:[],loading:false,error:''})});
 if(id.endsWith('/appCheck'))return synthetic(id,{isAndroidAppCheckReady:async()=>true});
 if(/\/(data|billing)\/|utils\/(ownerReports|expenseCycles|dryIceCalc)/.test(id)||id.endsWith('/types')){const target=resolve(dirname(file),id)+'.ts';return load(target);}
 if(id==='./PaymentOptions'||id.endsWith('/PaymentOptions'))return synthetic(id,{PaymentOptions:()=>null});
 if(id.endsWith('/owner/CustomersView'))return synthetic(id,{CustomersView:()=>null});
 if(id.endsWith('/services/paymentProof'))return synthetic(id,{savePaymentProof:async()=>{},compressPaymentProof:async()=>({dataUrl:'',sizeBytes:0})});
 if(id.endsWith('/owner/PaymentProofPreview'))return synthetic(id,{PaymentProofPreview:()=>null});
 if(id.endsWith('/config/businessConfig'))return synthetic(id,{PRIMARY_UPI_ID:'paytm.s26ykus@pty',BACKUP_UPI_ID:'ankur.singh332066@okhdfcbank',RETAIL_RATE_PER_KG:50,WHOLESALE_RATE_PER_KG:0,THERMOCOL_RATE_PER_KG:10});
 if(id.endsWith('/theme/designTokens'))return synthetic(id,{CHART_COLORS:{grid:'',axisText:'',axisLine:'',bar:''},STOP_PALETTE:[],GROUP_COLORS:{},DESIGN_TOKENS:{},stopColor:()=>({bg:'',ink:''}),statusTokenKey:()=>'total'});
 if(id.endsWith('/utils/delivery'))return synthetic(id,{DEFAULT_DELIVERY_SETTINGS:{busStops:[],districtStopMap:{}},resolveDeliveryDefault:()=>({source:'ask'}),validateDeliveryChoice:()=>null,packingGroupKey:()=>'UNASSIGNED',findStop:(settings,stopId)=>stopId?(settings?.busStops||[]).find(s=>s.id===stopId):undefined});
 if(/\/services\/(deliverySettings|staffSync|staffRegistry|busDispatch)$/.test(id))return synthetic(id,Object.fromEntries(names.map(k=>[k,/^(sync|save|remove)/.test(k)?async()=>{}:()=>()=>{}])));
 if(/\/(PackingBoard|DeliveryModePicker|BusStopSettings|StaffMembersManager|OrderDeliveryEditor|StockLedgerPanel)$/.test(id))return synthetic(id,Object.fromEntries(names.map(k=>[k,()=>null])));
 if(id.endsWith('/utils/orderWorkflow'))return load(resolve(dirname(file),id)+'.ts');// v1.0.70: real owner workflow helpers (new orders, loading ticks, overdue), not a mock
 if(id==='./dispatchSchedule.ts'&&file.endsWith('/utils/orderWorkflow.ts'))return load(resolve(dirname(file),id));
 if(/\/utils\/staffDial$/.test(id))return load(resolve(dirname(file),id)+'.ts');// v1.0.76: real staff dial helper
 if(/\/utils\/orderProgress$/.test(id))return load(resolve(dirname(file),id)+'.ts');// v1.0.76: real step-tracker helpers
 if(id.endsWith('/customer/OrderStatusTracker'))return load(resolve(dirname(file),id)+'.tsx');
 if(/\/utils\//.test(id))return synthetic(id,Object.fromEntries(names.map(k=>[k,()=>false])));
 if(id==='./customer/HomeSlides')return load(resolve(dirname(file),id)+'.tsx');// real owner slide editor, rendered in the language check
 if(id==='./FeatureHub')return load(resolve(dirname(file),id)+'.tsx');
 if(id.endsWith('/customer/FeatureHub'))return synthetic(id,{FeatureHub:()=>null});
 if(id.endsWith('/ReferralSharePanel'))return synthetic(id,{ReferralSharePanel:()=>null});
 if(id.endsWith('/SignInScreen'))return load(resolve(dirname(file),id)+'.tsx');
 if(id.endsWith('/customer/DailyWinner'))return synthetic(id,Object.fromEntries(names.map(k=>[k,()=>null])));
 if(/\/(OwnerStorefrontManager|ExpensesView|UserManagement|AIChat|UnitProductForm|FeatureDataPanels|PreferencesPanel|FeatureSuiteSettings|StaffOrderAccessManager|CustomersView)$/.test(id))return synthetic(id,Object.fromEntries(names.map(k=>[k,()=>null])));
 throw Error('Unmocked UI boundary '+id+' in '+file);
 });await m.evaluate();return m;}
 const m=await load(resolve(root,'src',path)),Component=m.namespace[name];let view;await act(async()=>{view=create(React.createElement(Component,props));});
 return{loc,get view(){return view;},get text(){return textOf(view.toJSON());},async switchTo(lang){language=lang;await act(async()=>view.update(React.createElement(Component,props)));},async close(){await act(async()=>view.unmount());}};
}
for(const[path,name,props]of [['components/OrderForm.tsx','OrderForm',{currentUser:owner,onOrderSuccess(){}}],['components/AdminDashboard.tsx','AdminDashboard',{currentUser:owner,onGoToTrack(){}}],['components/StaffDashboard.tsx','StaffDashboard',{currentUser:owner,userRole:'staff',permissions:{viewOrders:true,updateStatus:true}}],['components/CustomerOrders.tsx','CustomerOrders',{currentUser:owner,onGoToTrack(){},onReorder(){},onNewOrder(){}}],['components/UserManagement.tsx','UserManagement',{}],['components/ExpensesView.tsx','ExpensesView',{}],['components/SignInScreen.tsx','SignInScreen',{}],['components/customer/ProfileTab.tsx','ProfileTab',{currentUser:null,role:null,onOpenOwnerDashboard(){}}]]){
 test(name+' renders without a language popup and selection can be changed and restored',async()=>{const h=await screen(path,name,props);assert.equal(h.view.root.findAllByProps({role:'dialog'}).length,0);assert.ok(h.text.length>10,'screen must render real content');const english=h.text;await h.switchTo('hi');assert.match(h.text,/[\u0900-\u097F]/);await h.switchTo('en');assert.equal(h.text,english);await h.close();});
}
test('booking language switch preserves typed customer data, decimals, phone and dispatch values',async()=>{const h=await screen('components/OrderForm.tsx','OrderForm',{currentUser:owner,onOrderSuccess(){}});const inputs=h.view.root.findAllByType('input');assert.ok(inputs.length>=4);for(const[index,value]of [[0,'असली ग्राहक'],[1,'9000000001'],[3,'27.5']])await act(async()=>inputs[index].props.onChange({target:{value}}));assert.equal(h.view.root.findAllByType('input')[0].props.value,'असली ग्राहक');assert.equal(h.view.root.findAllByType('input')[3].props.value,'27.5');assert.ok(h.text.includes('1650'),'27.5 KG still uses the unchanged real base formula');const before=h.view.root.findAllByType('input').map(i=>i.props.value);await h.switchTo('hi');assert.deepEqual(h.view.root.findAllByType('input').map(i=>i.props.value),before);await h.switchTo('en');assert.deepEqual(h.view.root.findAllByType('input').map(i=>i.props.value),before);await h.close();});

for(const feature of ['calculator','video','faq','rates','support','service-area'])test('Feature '+feature+' renders English copy and responds to saved Hindi choice',async()=>{const h=await screen('components/customer/FeatureHub.tsx','FeatureHub',{currentUser:owner,role:'admin',initial:feature,allowed:[feature]});assert.ok(h.text.length>20);assert.doesNotMatch(h.text,/[\u0900-\u097F]/);await h.switchTo('hi');assert.match(h.text,/[\u0900-\u097F]/);await h.switchTo('en');assert.doesNotMatch(h.text,/[\u0900-\u097F]/);await h.close();});
test('loyalty without a configured policy shows no fabricated points',async()=>{const h=await screen('components/customer/LoyaltyPanel.tsx','LoyaltyPanel',{user:{uid:'fixture-buyer'},owner:false,Form:()=>null});assert.match(h.text,/not configured|paused/i);assert.doesNotMatch(h.text,/[\u0900-\u097F]/);await h.switchTo('hi');assert.match(h.text,/[\u0900-\u097F]/);await h.close();});

// v1.0.75 (Ankur, 13 Nov 2026): a new order without a delivery Mode cannot be confirmed (real orderWorkflow gate).
test('owner Confirm is blocked with a clear message while the order Mode is not set',async()=>{
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 const seed=[{trackingToken:'ADI-T_654321',trackingPin:'654321',customerPhone:'9000000002',district:'Lucknow',quantityKg:5,dispatchTiming:'',dispatchDate:today,dispatchSlot:'morning',productName:'Dry Ice',totalAmount:250,paymentStatus:'pending_verification',paymentMethod:'UPI',userId:'guest',createdAt:{seconds:1},updatedAt:{seconds:1},orderId:'ADI-NOMODE-0001',customerName:'Bina Mode',status:'pending'}]
 const h=await screen('components/AdminDashboard.tsx','AdminDashboard',{currentUser:owner,onGoToTrack(){}},seed)
 await act(async()=>{await Promise.resolve()})
 await act(async()=>h.view.root.find(n=>n.type==='button'&&String(n.props.className||'').includes('owner-new-orders-tile')).props.onClick())
 const list=()=>h.view.root.findAll(n=>n.type==='li'&&String(n.props.className||'').includes('owner-new-order-card'))
 assert.equal(list().length,1)
 assert.equal(list()[0].findAll(n=>n.props&&'data-mode-required' in n.props).length,1,'Mode not set warning shows on the card')
 const confirm=list()[0].find(n=>n.type==='button'&&textOf(n.children.map(c=>c.toJSON?c.toJSON():c)).includes('Confirm order'))
 await act(async()=>{await confirm.props.onClick()})
 assert.equal(list().length,1,'order without Mode stays unconfirmed')
 assert.match(h.text,/Select the delivery Mode/)
 await h.close()
})
// v1.0.70: real owner "New orders" tab, Confirm, today's red alert and overdue/upcoming counts (orderWorkflow is the real file).
test('owner New orders tab lists only unconfirmed orders and Confirm moves an order out of it',async()=>{
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 const base={trackingToken:'ADI-T_123456',trackingPin:'123456',customerPhone:'9000000001',district:'Lucknow',quantityKg:10,dispatchTiming:'',dispatchDate:today,dispatchSlot:'morning',productName:'Dry Ice',dryIcePricePerKg:50,dryIceSubtotal:500,thermocolPricePerKg:0,thermocolSubtotal:0,totalAmount:500,paymentStatus:'pending_verification',paymentMethod:'UPI',userId:'guest',createdAt:{seconds:1},updatedAt:{seconds:1}}
 const seed=[{...base,orderId:'ADI-NEW-0001',customerName:'Naya Grahak',status:'pending',deliveryMode:'LOCAL'},{...base,orderId:'ADI-OK-0002',customerName:'Pakka Grahak',status:'confirmed'},{...base,orderId:'ADI-OLD-0003',customerName:'Purana Done',status:'delivered',dispatchDate:'2026-01-02'},{...base,orderId:'ADI-OLD-0004',customerName:'Purana Open',status:'confirmed',dispatchDate:'2026-01-02'}]
 const h=await screen('components/AdminDashboard.tsx','AdminDashboard',{currentUser:owner,onGoToTrack(){}},seed)
 await act(async()=>{await Promise.resolve()})
 const alert=h.view.root.findAll(n=>n.props?.role==='alert'&&String(n.props.className||'').includes('owner-today-alert'))
 assert.equal(alert.length,1,'today has an unconfirmed and an unloaded order: red alert shows')
 assert.match(textOf(alert[0].children.map(c=>c.toJSON?c.toJSON():c)),/1 not confirmed/)
 const tile=h.view.root.find(n=>n.type==='button'&&String(n.props.className||'').includes('owner-new-orders-tile'))
 assert.match(textOf(tile.children.map(c=>c.toJSON?c.toJSON():c)),/New orders\s*1/)
 await act(async()=>tile.props.onClick())
 const list=()=>h.view.root.findAll(n=>n.type==='li'&&String(n.props.className||'').includes('owner-new-order-card'))
 assert.equal(list().length,1)
 assert.ok(h.text.includes('Naya Grahak'))
 assert.ok(!textOf(list().map(l=>l.children.map(c=>c.toJSON?c.toJSON():c))).includes('Pakka Grahak'),'confirmed order is not in the New orders tab')
 const confirm=list()[0].find(n=>n.type==='button'&&textOf(n.children.map(c=>c.toJSON?c.toJSON():c)).includes('Confirm order'))
 await act(async()=>{await confirm.props.onClick()})
 assert.equal(list().length,0,'confirmed order leaves the New orders tab')
 assert.ok(h.text.includes('No new orders. Every order is confirmed.'))
 await act(async()=>h.view.root.find(n=>n.type==='button'&&textOf(n.children.map(c=>c.toJSON?c.toJSON():c))==='Packing by stop'&&!String(n.props.className||'').includes('soft-tool-tile')).props.onClick())
 const old=h.view.root.find(n=>n.type==='button'&&textOf(n.children.map(c=>c.toJSON?c.toJSON():c)).startsWith('Old / Overdue'))
 assert.equal(textOf(old.children.map(c=>c.toJSON?c.toJSON():c)),'Old / Overdue1','only the undispatched old order is overdue, the delivered one is not')
 await h.close()
})

// v1.0.71: settings/homeSlides is empty (data wipe) -> the real HomeSlides shows the built-in slides, rotating, and writes nothing.
test('customer Home sliding banner shows built-in default slides when settings/homeSlides is empty',async()=>{
 const h=await screen('components/customer/HomeSlides.tsx','HomeSlides',{currentUser:null})
 await act(async()=>{await Promise.resolve()})
 const banner=h.view.root.findAll(n=>String(n.props?.className||'').includes('ankur-home-slides')&&n.type==='div')
 assert.equal(banner.length,1,'banner is rendered (not null) with an empty settings doc')
 assert.match(h.text,/Ankur Dry Ice — लखनऊ में ड्राई आइस, होलसेल और रिटेल/)
 const dots=h.view.root.findAll(n=>n.type==='button'&&n.props.tabIndex===-1)
 assert.equal(dots.length,3,'three default slides rotate')
 await act(async()=>dots[1].props.onClick())
 assert.match(h.text,/Alambagh, Kaiserbagh, Porter या गोदाम से पिकअप/)
 await act(async()=>dots[2].props.onClick())
 assert.match(h.text,/ऑर्डर\/मदद: 95808 82066/)
 await h.close()
})
test('customer Home renders the sliding banner at the very top, above the booking form',()=>{
 const home=readFileSync(resolve(root,'src/components/customer/CustomerHome.tsx'),'utf8'),app=readFileSync(resolve(root,'src/App.tsx'),'utf8')
 assert.match(app,/topSlot=\{<HomeSlides currentUser=\{currentUser\} \/>\}/)
 const slot=home.indexOf('{topSlot &&'),booking=home.indexOf('id="ankur-customer-booking"'),main=home.indexOf('<main')
 assert.ok(main>=0&&slot>main&&slot<booking,'topSlot is the first thing inside <main>, before the booking section')
})
// v1.0.71: customer Home footer "संपर्क करें" with three tappable numbers (tel + WhatsApp each).
test('customer contact footer renders all three numbers with tel and WhatsApp links, Hindi and English',async()=>{
 const h=await screen('components/customer/CustomerContactFooter.tsx','CustomerContactFooter',{})
 const hrefs=()=>h.view.root.findAll(n=>n.type==='a').map(a=>a.props.href)
 assert.deepEqual(hrefs(),['tel:+919151416323','https://wa.me/919151416323','tel:+919532844538','https://wa.me/919532844538','tel:+918896332066','https://wa.me/918896332066'])
 assert.match(h.text,/Contact us/);assert.match(h.text,/Packing questions — Vikas Gautam/);assert.match(h.text,/Delivery questions/);assert.match(h.text,/Complaints/)
 for(const n of ['91514 16323','95328 44538','88963 32066'])assert.ok(h.text.includes(n),n)
 await h.switchTo('hi')
 assert.match(h.text,/संपर्क करें/);assert.match(h.text,/पैकिंग से जुड़ी बात — विकास गौतम/);assert.match(h.text,/डिलीवरी से जुड़ी बात/);assert.match(h.text,/शिकायत/)
 assert.equal(hrefs().length,6)
 await h.close()
})
test('customer Home places the contact footer at the very bottom of Home',()=>{
 const app=readFileSync(resolve(root,'src/App.tsx'),'utf8')
 const home=app.indexOf("{currentTab === 'home' && ("),footer=app.indexOf('<CustomerContactFooter />'),next=app.indexOf("{currentTab === 'categories' &&")
 assert.ok(home>=0&&footer>home&&footer<next,'footer renders on the Home tab after the Home content')
})

// v1.0.76 (Ankur, 14 Nov 2026): the customer's current order shows a big step tracker (real component + helpers).
test('My Orders shows the current order as a big step tracker with the current step highlighted (EN + HI)',async()=>{
 const now=Math.floor(Date.now()/1000);
 const seed=[{orderId:'ADI-20261114-AAAA',status:'delivered',trackingPin:'111111',quantityKg:5,totalAmount:300,createdAt:{seconds:now-90000},updatedAt:{seconds:now-86000*3},dispatchTiming:'x',district:'Lucknow'},
  {orderId:'ADI-20261114-BBBB',status:'dispatched',trackingPin:'222222',quantityKg:10,totalAmount:600,createdAt:{seconds:now-3600},updatedAt:{seconds:now-600},dispatchTiming:'x',district:'Lucknow'}];
 const h=await screen('components/CustomerOrders.tsx','CustomerOrders',{currentUser:owner,onGoToTrack(){},onReorder(){},onGoToOrder(){}},seed);
 assert.match(h.text,/Current order #BBBB/);for(const t of ['Order received','Confirmed','Packed','Dispatched','Delivered'])assert.ok(h.text.includes(t),t);
 const trackers=h.view.root.findAll(n=>n.props?.['aria-current']==='step');assert.equal(trackers.length,1);
 const steps=h.view.root.findAll(n=>typeof n.props?.className==='string'&&n.props.className.includes('ankur-order-step '));assert.deepEqual(steps.map(n=>n.props['aria-current']||''),['','','','step','']);
 assert.ok(h.view.root.findAll(n=>n.props?.style&&parseInt(n.props.style.fontSize)>=20).length>=5,'status shown at 20px+');
 await h.switchTo('hi');assert.match(h.text,/चालू ऑर्डर #BBBB/);assert.ok(h.text.includes('रवाना'));await h.close();});

// v1.0.76 (Ankur, 14 Nov 2026): staff "कॉल करें" on the order-update screen opens the dialer with the customer number.
test('staff Call button opens the phone dialer (tel:+91…) without the Cloud Function',async()=>{
 const now=Math.floor(Date.now()/1000);
 const views=[{orderId:'ADI-20261114-CALL',sourceCollection:'orders',customerName:'Call Fixture',city:'Lucknow',district:'Lucknow',productName:'Dry Ice',dispatchTiming:'x',status:'confirmed',quantityKg:10,createdAt:{seconds:now},updatedAt:{seconds:now},waPhone:'9876543210'}];
 const h=await screen('components/StaffDashboard.tsx','StaffDashboard',{currentUser:owner,userRole:'staff',permissions:{viewOrders:true,updateStatus:true}},[],views);
 const listToggle=h.view.root.findAll(n=>n.type==='button'&&n.props['aria-expanded']===false&&/Sabhi orders/.test(JSON.stringify(n.props.children)));assert.equal(listToggle.length,1);await act(async()=>listToggle[0].props.onClick());
 const btn=h.view.root.findAll(n=>n.type==='button'&&typeof n.props.className==='string'&&n.props.className.includes('ankur-staff-call-trigger'));
 assert.ok(btn.length>=1,'Call button rendered');
 await act(async()=>{btn[0].props.onClick();await Promise.resolve();});
 assert.equal(h.loc.href,'tel:+919876543210','dialer opened with the customer number');
 assert.ok(h.view.root.findAll(n=>n.type==='a'&&n.props.href==='tel:+919876543210').length>=1,'Dial link shown as fallback');
 assert.doesNotMatch(h.text,/अनुमति नहीं है/);await h.close();});

// v1.0.76 (Ankur, 14 Nov 2026): Home banner = big, colourful, 3D (Blinkit-style), auto-slide kept; category tiles unchanged.
test('Home banner is big and colourful: one vibrant gradient per slide, bold headline, 3D picture, dots below',async()=>{
 const h=await screen('components/customer/HomeSlides.tsx','HomeSlides',{currentUser:null});
 await act(async()=>{await Promise.resolve();});
 const banner=()=>h.view.root.findAll(n=>n.type==='div'&&String(n.props?.className||'').includes('ankur-home-slides'))[0];
 assert.match(banner().props.className,/ankur-hb ankur-hb-tone-0/);
 const headline=h.view.root.findAll(n=>n.props?.className==='ankur-hb-headline');assert.equal(headline.length,1);assert.equal(headline[0].children.join(''),'Ankur Dry Ice');
 assert.equal(h.view.root.findAll(n=>n.props?.className==='ankur-hb-sub')[0].children.join(''),'लखनऊ में ड्राई आइस, होलसेल और रिटेल');
 assert.equal(h.view.root.findAll(n=>n.type==='svg').length,1,'3D dry-ice cube picture on the first slide');
 assert.equal(h.view.root.findAll(n=>n.props?.className==='ankur-hb-dots').length,1,'dots below');
 const dots=h.view.root.findAll(n=>n.type==='button'&&n.props.tabIndex===-1);
 await act(async()=>dots[1].props.onClick());assert.match(banner().props.className,/ankur-hb-tone-1/,'second slide gets a different gradient');
 assert.equal(h.view.root.findAll(n=>n.props?.className==='ankur-hb-emoji').length,1);
 await act(async()=>dots[2].props.onClick());assert.match(banner().props.className,/ankur-hb-tone-2/);
 await h.close();
 const css=readFileSync(resolve(root,'src/index.css'),'utf8'),block=css.slice(css.indexOf('big, colourful, 3D Home banner'));
 assert.match(block,/\.ankur-home-slides\.ankur-hb \{[^}]*min-height: 1[5-8]\dpx/,'banner ~150-180px tall');
 assert.match(block,/\.ankur-home-slides\.ankur-hb \{[^}]*box-shadow:/,'soft depth shadow');
 assert.match(block,/\.ankur-hb-headline \{[^}]*font-size: 2\dpx;[^}]*font-weight: 900/,'bold large headline');
 assert.doesNotMatch(block,/#[0-9a-fA-F]{3,8}\b/,'no new hex colours');
 // white text must stay readable (WCAG AA 4.5:1) on every gradient stop
 const lum=(h,s,l)=>{s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return[f(0),f(8),f(4)].map(c=>c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4).reduce((t,c,i)=>t+c*[0.2126,0.7152,0.0722][i],0);};
 const tones=[...block.matchAll(/\.ankur-hb-tone-\d \{ background: ([^;]+);/g)];assert.ok(tones.length>=3,'different gradient per slide');
 for(const[,bg]of tones)for(const[,hh,ss,ll]of bg.matchAll(/hsl\((\d+) (\d+)% (\d+)%\)/g))assert.ok(1.05/(lum(+hh,+ss,+ll)+0.05)>=4.5,'white text contrast on '+bg);
 assert.match(css,/\.aqp-form-only-main \.aqp-booking-heading \{ display: none !important; \}/,'empty band under the banner removed');
 assert.doesNotMatch(css,/ankur-cat-tile/,'category tiles not restyled');
});
