import { readFile } from 'node:fs/promises';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

const projectId = 'demo-ankur-dryice-rules';
let testEnv;
const phone = '+919876543210';
const proof = {dataUrl:'data:image/jpeg;base64,AA==',sizeBytes:1,contentType:'image/jpeg',uploadedBy:'customer',createdAt:new Date()};

before(async () => {
  testEnv = await initializeTestEnvironment({projectId, firestore:{rules:await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')}});
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db=ctx.firestore();
    await db.doc('users/staff').set({role:'staff',permissions:{viewOrders:true,updateStatus:true}});
    await db.doc('orders/order-1').set({orderId:'order-1',userId:'customer',customerName:'Customer',city:'Lucknow',district:'Lucknow',productName:'Dry Ice',quantityKg:10,status:'pending',totalAmount:600,calculatedTotal:600,customerTotal:600,paymentStatus:'pending_verification',paymentNotes:'private',createdAt:new Date(),updatedAt:new Date()});
    await db.doc('staffOrderViews/order-1').set({orderId:'order-1',sourceCollection:'orders',customerName:'Customer',city:'Lucknow',district:'Lucknow',productName:'Dry Ice',quantityKg:10,status:'pending',dispatchTiming:'8 Nov, morning',isTrash:false,createdAt:new Date(),updatedAt:new Date()});
    await db.doc(`customers/${phone}`).set({uid:'customer',name:'Customer',phone,firstLoginAt:new Date(),lastLoginAt:new Date(),orderCount:1,completedOrders:0,tag:'New'});
    await db.doc('orders/order-1/paymentProof/latest').set(proof);
    await db.doc('orders/guest-order').set({orderId:'guest-order',userId:'guest',trackingPin:'123456',createdAt:new Date(),updatedAt:new Date()});
    // v1.0.66: owner-managed staff registry (roles OWNER / STAFF) and bus stops.
    await db.doc('staffMembers/+919800000001').set({phone:'+919800000001',name:'Packer',email:'packer@example.com',active:true,role:'STAFF',updatedAt:new Date()});
    await db.doc('staffEmails/packer@example.com').set({phone:'+919800000001',name:'Packer',active:true,role:'STAFF',updatedAt:new Date()});
    await db.doc('staffEmails/former@example.com').set({phone:'+919800000002',name:'Former',active:false,role:'STAFF',updatedAt:new Date()});
    await db.doc('settings/delivery').set({busStops:[{id:'alambagh',name:'Alambagh',color:'teal',active:true}],districtStopMap:{sitapur:'alambagh'},updatedAt:new Date()});
    await db.doc('orders/order-2').set({orderId:'order-2',userId:'customer',customerName:'Customer',district:'Sitapur',quantityKg:12,status:'confirmed',totalAmount:720,paymentStatus:'pending_verification',deliveryMode:'BUS',busStopId:'alambagh',createdAt:new Date(),updatedAt:new Date()});
    await db.doc('users/wholesale-buyer').set({customerType:'wholesale',customerName:'Wholesale Buyer'});
    await db.doc('staffOrderViews/order-2').set({orderId:'order-2',sourceCollection:'orders',customerName:'Customer',city:'Sitapur',district:'Sitapur',productName:'Dry Ice',quantityKg:12,status:'confirmed',dispatchTiming:'Today morning',deliveryMode:'BUS',busStopId:'alambagh',isTrash:false,createdAt:new Date(),updatedAt:new Date()});
  });
});
after(async () => testEnv?.cleanup());

describe('Firestore privacy and role rules', () => {
  it('lets a customer read only their own customer record; only the owner lists', async () => {
    const customer=testEnv.authenticatedContext('customer').firestore();
    const other=testEnv.authenticatedContext('other').firestore();
    const staff=testEnv.authenticatedContext('staff').firestore();
    const owner=testEnv.authenticatedContext('owner',{email:'ankurdryicewholesalers@gmail.com',email_verified:true}).firestore();
    await assertSucceeds(getDoc(doc(customer,`customers/${phone}`)));
    await assertFails(getDoc(doc(other,`customers/${phone}`)));
    await assertFails(getDocs(collection(staff,'customers')));
    await assertSucceeds(getDocs(collection(owner,'customers')));
  });
  it('keeps raw order price, total and payment fields unreadable to staff', async () => {
    const staff=testEnv.authenticatedContext('staff').firestore();
    await assertFails(getDoc(doc(staff,'orders/order-1')));
    await assertFails(getDocs(collection(staff,'orders')));
    const safe=await assertSucceeds(getDoc(doc(staff,'staffOrderViews/order-1')));
    for (const field of ['price','totalAmount','calculatedTotal','customerTotal','paymentStatus','paymentMethod','paymentNotes']) assert.equal(field in safe.data(),false);
    await assertSucceeds(updateDoc(doc(staff,'orders/order-1'),{status:'in_packing',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(staff,'orders/order-1'),{paymentStatus:'payment_verified',updatedAt:serverTimestamp()}));
  });
  it('allows customer and owner to read a proof but blocks staff', async () => {
    const customer=testEnv.authenticatedContext('customer').firestore();
    const staff=testEnv.authenticatedContext('staff').firestore();
    const owner=testEnv.authenticatedContext('owner',{email:'ankurdryicewholesalers@gmail.com',email_verified:true}).firestore();
    await assertSucceeds(getDoc(doc(customer,'orders/order-1/paymentProof/latest')));
    await assertSucceeds(getDoc(doc(owner,'orders/order-1/paymentProof/latest')));
    await assertFails(getDoc(doc(staff,'orders/order-1/paymentProof/latest')));
  });
  it('lets a guest attach a proof only with the order tracking PIN; the guest cannot read it back', async () => {
    const guest=testEnv.unauthenticatedContext().firestore();
    const staff=testEnv.authenticatedContext('staff').firestore();
    const value={...proof,uploadedBy:'guest',trackingPin:'123456',createdAt:serverTimestamp()};
    await assertSucceeds(setDoc(doc(guest,'orders/guest-order/paymentProof/latest'),value));
    await assertFails(getDoc(doc(guest,'orders/guest-order/paymentProof/latest')));
    await assertFails(setDoc(doc(guest,'orders/guest-order/paymentProof/other'),value));
    await assertFails(getDoc(doc(staff,'orders/guest-order/paymentProof/latest')));
    await assertFails(setDoc(doc(guest,'orders/guest-order/paymentProof/latest'),{...value,trackingPin:'000000'}));
  });

  const ownerDb=()=>testEnv.authenticatedContext('owner',{email:'ankurdryicewholesalers@gmail.com',email_verified:true}).firestore();
  const packerDb=()=>testEnv.authenticatedContext('packer',{email:'packer@example.com',email_verified:true}).firestore();
  const formerDb=()=>testEnv.authenticatedContext('former',{email:'former@example.com',email_verified:true}).firestore();

  it('registry staff (added by mobile) read only the staff-safe projection', async () => {
    const packer=packerDb();
    const view=await assertSucceeds(getDoc(doc(packer,'staffOrderViews/order-2')));
    for (const field of ['totalAmount','paymentStatus','paymentMethod','paymentNotes','customerPhone','trackingPin','dryIcePricePerKg']) assert.equal(field in view.data(),false);
    await assertSucceeds(getDocs(collection(packer,'staffOrderViews')));
    await assertFails(getDoc(doc(packer,'orders/order-2')));
    await assertFails(getDocs(collection(packer,'orders')));
    await assertFails(getDocs(collection(packer,'customers')));
    await assertFails(getDoc(doc(packer,'orders/order-1/paymentProof/latest')));
    await assertFails(getDocs(collection(packer,'staffMembers')));
    await assertFails(getDocs(collection(packer,'expenses')));
    await assertFails(getDoc(doc(formerDb(),'staffOrderViews/order-2')));
  });
  it('staff update only packing/dispatch status fields (Spark path, no Cloud Function)', async () => {
    const packer=packerDb();
    const ok={status:'in_packing',packingStatus:'packed',statusSyncPending:true,statusUpdatedBy:'packer',updatedAt:serverTimestamp()};
    await assertSucceeds(updateDoc(doc(packer,'staffOrderViews/order-2'),ok));
    await assertFails(updateDoc(doc(packer,'staffOrderViews/order-2'),{...ok,quantityKg:1}));
    await assertFails(updateDoc(doc(packer,'staffOrderViews/order-2'),{...ok,busStopId:'kaiserbagh'}));
    await assertFails(updateDoc(doc(packer,'staffOrderViews/order-2'),{...ok,status:'cancelled'}));
    await assertFails(updateDoc(doc(packer,'staffOrderViews/order-2'),{...ok,statusUpdatedBy:'someone-else'}));
    await assertFails(updateDoc(doc(packer,'staffOrderViews/order-2'),{...ok,statusSyncPending:false}));
    await assertSucceeds(updateDoc(doc(packer,'orders/order-2'),{status:'dispatched',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(packer,'orders/order-2'),{status:'confirmed',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(packer,'orders/order-2'),{status:'dispatched',totalAmount:1,updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(packer,'orders/order-2'),{paymentStatus:'payment_verified',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(packer,'orders/order-2'),{busStopId:'kaiserbagh',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(formerDb(),'orders/order-2'),{status:'delivered',updatedAt:serverTimestamp()}));
  });
  it('only the owner manages the staff registry; staff cannot promote themselves', async () => {
    const owner=ownerDb();
    const customer=testEnv.authenticatedContext('newbie',{email:'newbie@example.com',email_verified:true}).firestore();
    await assertSucceeds(setDoc(doc(owner,'staffMembers/+919800000003'),{phone:'+919800000003',name:'New',email:'new@example.com',active:true,role:'STAFF',updatedAt:serverTimestamp()}));
    await assertSucceeds(setDoc(doc(owner,'staffEmails/new@example.com'),{phone:'+919800000003',name:'New',active:true,role:'STAFF',updatedAt:serverTimestamp()}));
    await assertFails(setDoc(doc(customer,'staffEmails/newbie@example.com'),{phone:'+919800000004',name:'Me',active:true,role:'STAFF'}));
    await assertFails(setDoc(doc(packerDb(),'staffMembers/+919800000001'),{phone:'+919800000001',name:'Packer',email:'packer@example.com',active:true,role:'STAFF'}));
    await assertSucceeds(getDoc(doc(packerDb(),'staffEmails/packer@example.com')));
    await assertFails(getDoc(doc(packerDb(),'staffEmails/former@example.com')));
    await assertFails(getDocs(collection(packerDb(),'staffEmails')));
  });
  it('bus stop settings are public-read and owner-write, with no extra keys', async () => {
    const guest=testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(guest,'settings/delivery')));
    const value={busStops:[{id:'alambagh',name:'Alambagh',color:'teal',active:true},{id:'kaiserbagh',name:'Kaiserbagh',color:'orange',active:false}],districtStopMap:{sitapur:'alambagh'},updatedAt:serverTimestamp()};
    await assertSucceeds(setDoc(doc(ownerDb(),'settings/delivery'),value));
    await assertFails(setDoc(doc(packerDb(),'settings/delivery'),value));
    await assertFails(setDoc(doc(testEnv.authenticatedContext('customer').firestore(),'settings/delivery'),value));
    await assertFails(setDoc(doc(ownerDb(),'settings/delivery'),{...value,ratePerKg:50}));
  });
  it('owner saves "Hamesha ke liye" delivery defaults; the customer cannot change them', async () => {
    const customer=testEnv.authenticatedContext('customer').firestore();
    await assertSucceeds(setDoc(doc(ownerDb(),`customers/${phone}`),{defaultDeliveryMode:'BUS',defaultBusStopId:'alambagh'},{merge:true}));
    await assertFails(updateDoc(doc(customer,`customers/${phone}`),{defaultDeliveryMode:'PORTER'}));
    await assertSucceeds(setDoc(doc(ownerDb(),'customers/+919811111111'),{phone:'+919811111111',name:'Phone order',defaultDeliveryMode:'PORTER'}));
  });
  it('orders validate deliveryMode and require a bus stop for BUS', async () => {
    const owner=ownerDb();
    const base={orderId:'order-bus-1',trackingToken:'order-bus-1_123456',trackingPin:'123456',customerName:'Bus Customer',customerPhone:'9876543210',district:'Sitapur',quantityKg:10,dispatchTiming:'Today morning',productName:'Dry Ice',dryIcePricePerKg:50,dryIceSubtotal:500,thermocolPricePerKg:10,thermocolSubtotal:100,totalAmount:600,status:'pending',paymentStatus:'pending_verification',paymentMethod:'paytm_business_upi',userId:'owner_manual_entry',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    await assertFails(setDoc(doc(owner,'orders/order-bus-1'),{...base,deliveryMode:'BUS'}));
    await assertFails(setDoc(doc(owner,'orders/order-bus-1'),{...base,deliveryMode:'TRAIN'}));
    await assertSucceeds(setDoc(doc(owner,'orders/order-bus-1'),{...base,deliveryMode:'BUS',busStopId:'alambagh',packCount:2,deliveryNote:'Conductor ko dena'}));
    await assertSucceeds(setDoc(doc(owner,'orders/order-pickup-1'),{...base,orderId:'order-pickup-1',trackingToken:'order-pickup-1_123456',deliveryMode:'SHOP_PICKUP'}));
  });
});


// v1.0.66 hotfix: installed v1.0.64 / v1.0.65 apps keep placing orders after the
// new rules are published, and the v1.0.66 batch (orders + order_tracking +
// staffOrderViews) is accepted. Payloads mirror the old OrderForm.tsx sources
// (base zip, commit 2fb7f16) field for field.
describe('Order create compatibility across installed app versions', () => {
  const ownerDb=()=>testEnv.authenticatedContext('owner',{email:'ankurdryicewholesalers@gmail.com',email_verified:true}).firestore();
  const ids=(suffix)=>({orderId:`ADI-20261111-${suffix}`,trackingPin:'654321',trackingToken:`ADI-20261111-${suffix}_654321`});
  const v64Order=(suffix,userId)=>{const k=ids(suffix);return {...k,customerName:'Old App Buyer',customerPhone:'9876543210',district:'Lucknow Jankipuram',address:'Lucknow Jankipuram',city:'Lucknow Jankipuram',quantityKg:10,dispatchTiming:'कल सुबह',productName:'ड्राई आइस (Dry Ice)',dryIcePricePerKg:50,dryIceSubtotal:500,thermocolPricePerKg:10,thermocolSubtotal:100,transportPrice:0,totalAmount:600,status:'pending',paymentStatus:'pending_verification',paymentMethod:'paytm_business_upi',paymentNotes:'Paytm Business / UPI द्वारा ओनर वेरिफिकेशन प्रतीक्षित',userId,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};};
  const v64Tracking=(o)=>({orderId:o.orderId,trackingToken:o.trackingToken,status:'pending',productName:o.productName,quantityKg:o.quantityKg,district:o.district,dispatchTiming:o.dispatchTiming,paymentStatus:'pending_verification',lastStatusUpdate:'ऑर्डर प्राप्त हुआ। पैकिंग शेड्यूल्ड।',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  const v65Order=(suffix,userId,extra={})=>({...v64Order(suffix,userId),dispatchTiming:'12 Nov, सुबह',dispatchDate:'2026-11-12',slot:'morning',customerType:'retail',calculatedTotal:600,customerTotal:600,amountChanged:false,amountChangeReason:'',thermocolIncluded:true,testOrder:false,paymentNotes:'Paytm Business / UPI - मालिक के सत्यापन की प्रतीक्षा',...extra});
  const v65Tracking=(o)=>({...v64Tracking(o),dispatchDate:o.dispatchDate,slot:o.slot});
  const v66Tracking=(o)=>({...v65Tracking(o),dispatchSlot:o.slot,totalAmount:o.totalAmount});
  const v66View=(o)=>({orderId:o.orderId,sourceCollection:'orders',customerName:o.customerName,city:o.city,district:o.district,productName:o.productName,dispatchTiming:o.dispatchTiming,dispatchDate:o.dispatchDate,slot:o.slot,status:'pending',quantityKg:o.quantityKg,isTrash:false,...(o.deliveryMode?{deliveryMode:o.deliveryMode}:{}),...(o.busStopId?{busStopId:o.busStopId}:{}),createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  const commit=(db,o,tracking,view)=>{const b=writeBatch(db);b.set(doc(db,'orders',o.orderId),o);b.set(doc(db,'order_tracking',o.trackingToken),tracking);if(view)b.set(doc(db,'staffOrderViews',o.orderId),view);return b.commit();};

  it('v1.0.64 guest order (orders + order_tracking only, flat legacy keys) is accepted', async () => {
    const guest=testEnv.unauthenticatedContext().firestore();
    const o=v64Order('G64A','guest');
    await assertSucceeds(commit(guest,o,v64Tracking(o)));
  });
  it('v1.0.64 signed-in order and its users profile write are accepted', async () => {
    const buyer=testEnv.authenticatedContext('buyer64').firestore();
    const o=v64Order('S64A','buyer64');
    await assertSucceeds(commit(buyer,o,v64Tracking(o)));
    await assertSucceeds(setDoc(doc(buyer,'users/buyer64'),{customerName:o.customerName,customerPhone:o.customerPhone,city:o.city,updatedAt:serverTimestamp()},{merge:true}));
  });
  it('v1.0.65 order (dispatchDate/slot/customerType/calculatedTotal, no staffOrderViews) is accepted for guest and a first-time signed-in buyer', async () => {
    const guest=testEnv.unauthenticatedContext().firestore();
    const g=v65Order('G65A','guest');
    await assertSucceeds(commit(guest,g,v65Tracking(g)));
    // First-time buyer: users/{uid} does not exist yet when the batch commits.
    const buyer=testEnv.authenticatedContext('buyer65').firestore();
    const o=v65Order('S65A','buyer65');
    await assertSucceeds(commit(buyer,o,v65Tracking(o)));
    await assertSucceeds(setDoc(doc(buyer,'users/buyer65'),{customerName:o.customerName,customerPhone:o.customerPhone,city:o.city,customerType:'retail',updatedAt:serverTimestamp()},{merge:true}));
    // ...and its first customers/{+91mobile} record (orderCount via increment(1) -> 1).
    await assertSucceeds(setDoc(doc(buyer,'customers/+919876543299'),{uid:'buyer65',name:o.customerName,phone:'+919876543299',firstLoginAt:serverTimestamp(),lastLoginAt:serverTimestamp(),orderCount:1,completedOrders:0,tag:'New'}));
  });
  it('v1.0.66 batch (orders + order_tracking + staffOrderViews, delivery mode) is accepted', async () => {
    const guest=testEnv.unauthenticatedContext().firestore();
    const g=v65Order('G66A','guest',{dispatchSlot:'morning',deliveryMode:'BUS',busStopId:'alambagh'});
    await assertSucceeds(commit(guest,g,v66Tracking(g),v66View(g)));
    const buyer=testEnv.authenticatedContext('buyer66').firestore();
    const o=v65Order('S66A','buyer66',{dispatchSlot:'evening',slot:'evening',deliveryMode:'SHOP_PICKUP'});
    await assertSucceeds(commit(buyer,o,v66Tracking(o),v66View(o)));
  });
  it('a customer still cannot self-verify payment, skip pending, or add owner-only fields', async () => {
    const guest=testEnv.unauthenticatedContext().firestore();
    const paid=v65Order('BADP','guest',{paymentStatus:'payment_verified'});
    await assertFails(commit(guest,paid,{...v65Tracking(paid),paymentStatus:'payment_verified'}));
    const confirmed=v65Order('BADS','guest',{status:'confirmed'});
    await assertFails(commit(guest,confirmed,v65Tracking(confirmed)));
    const pickup=v64Order('BADK','guest');
    await assertFails(commit(guest,{...pickup,selfPickup:{status:'pickup_completed'}},v64Tracking(pickup)));
    const cheap=v64Order('BADT','guest');
    await assertFails(commit(guest,{...cheap,totalAmount:100},v64Tracking(cheap)));
    const wholesaleGuest=v65Order('BADW','guest',{customerType:'wholesale'});
    await assertFails(commit(guest,wholesaleGuest,v65Tracking(wholesaleGuest)));
    // A staffOrderViews row cannot be forged without its order in the same batch.
    await assertFails(setDoc(doc(guest,'staffOrderViews/ADI-20261111-NOPE'),v66View(v65Order('NOPE','guest'))));
  });
  it('a wholesale buyer can place an owner-approved changed amount; a retail buyer cannot', async () => {
    const wholesale=testEnv.authenticatedContext('wholesale-buyer').firestore();
    const base={customerType:'wholesale',thermocolIncluded:false,thermocolPricePerKg:0,thermocolSubtotal:0,calculatedTotal:500,customerTotal:750,totalAmount:750,amountChanged:true,amountChangeReason:'Pyro add kiya'};
    const w=v65Order('W66A','wholesale-buyer',base);
    await assertSucceeds(commit(wholesale,w,{...v65Tracking(w),totalAmount:750},v66View(w)));
    const retail=testEnv.authenticatedContext('retail-buyer').firestore();
    const r=v65Order('R66A','retail-buyer',base);
    await assertFails(commit(retail,r,{...v65Tracking(r),totalAmount:750}));
    // The owner can still move that wholesale order forward.
    const owner=ownerDb();
    await assertSucceeds(updateDoc(doc(owner,`orders/${w.orderId}`),{status:'confirmed',updatedAt:serverTimestamp()}));
  });
  it('v1.0.72: owner saves a bus number on a BUS order and copies mode/stop/bus number to tracking; staff and customers cannot', async () => {
    const owner=ownerDb();
    const o=v65Order('BUS72','owner_manual_entry',{deliveryMode:'BUS',busStopId:'alambagh'});
    await assertSucceeds(commit(owner,o,v66Tracking(o)));
    await assertSucceeds(updateDoc(doc(owner,'orders',o.orderId),{busNumber:'6965',updatedAt:serverTimestamp()}));
    await assertSucceeds(updateDoc(doc(owner,'order_tracking',o.trackingToken),{deliveryMode:'BUS',busStopId:'alambagh',busNumber:'6965',updatedAt:serverTimestamp()}));
    // later owner operational updates still validate with busNumber on the doc
    await assertSucceeds(updateDoc(doc(owner,'orders',o.orderId),{status:'dispatched',updatedAt:serverTimestamp()}));
    await assertSucceeds(updateDoc(doc(owner,'order_tracking',o.trackingToken),{status:'dispatched',lastStatusUpdate:'रवाना',updatedAt:serverTimestamp()}));
    // bus number only on bus orders, and bounded
    await assertFails(updateDoc(doc(owner,'orders',o.orderId),{busNumber:'1'.repeat(21),updatedAt:serverTimestamp()}));
    const p=v65Order('POR72','owner_manual_entry',{deliveryMode:'PORTER'});
    await assertSucceeds(commit(owner,p,v66Tracking(p)));
    await assertFails(updateDoc(doc(owner,'orders',p.orderId),{busNumber:'6965',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(owner,'order_tracking',p.trackingToken),{busNumber:'6965',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(owner,'order_tracking',o.trackingToken),{deliveryMode:'TRAIN',updatedAt:serverTimestamp()}));
    // staff (status-only) and customers cannot write the bus number anywhere
    const staff=testEnv.authenticatedContext('staff').firestore();
    await assertFails(updateDoc(doc(staff,'orders',o.orderId),{busNumber:'1111',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(staff,'order_tracking',o.trackingToken),{busNumber:'1111',updatedAt:serverTimestamp()}));
    const guest=testEnv.unauthenticatedContext().firestore();
    const g=v65Order('GBUS72','guest',{deliveryMode:'BUS',busStopId:'alambagh',busNumber:'6965'});
    await assertFails(commit(guest,g,v66Tracking(g)), 'a customer order cannot arrive with a bus number already dispatched');
    // public tracking read by token shows it
    const snap=await getDoc(doc(guest,'order_tracking',o.trackingToken));
    assert.equal(snap.data().busNumber,'6965');
  });
  it('signed-in pre-check read of a not-yet-created order id is denied (client must treat it as absent)', async () => {
    const buyer=testEnv.authenticatedContext('buyer-precheck').firestore();
    await assertFails(getDoc(doc(buyer,'orders/ADI-20261111-NEW1')));
  });
  it('push registration paths from the live ruleset still work', async () => {
    const guest=testEnv.unauthenticatedContext().firestore();
    const o=v64Order('PUSH','guest');
    await assertSucceeds(commit(guest,o,v64Tracking(o)));
    const device={token:'x'.repeat(40),platform:'android',updatedAt:serverTimestamp()};
    await assertSucceeds(setDoc(doc(guest,`order_push_subscriptions/${o.trackingToken}/devices/device-001`),device));
    await assertFails(setDoc(doc(guest,'order_push_subscriptions/ADI-20261111-NONE_654321/devices/device-001'),device));
    await assertSucceeds(setDoc(doc(ownerDb(),'push_owner_devices/owner-phone'),device));
    await assertFails(setDoc(doc(guest,'push_owner_devices/owner-phone'),device));
    await assertSucceeds(setDoc(doc(testEnv.authenticatedContext('packer',{email:'packer@example.com',email_verified:true}).firestore(),'push_team_devices/packer/devices/device-001'),device));
  });
  it('signed-in buyer (v1.0.64 path, no trackingPin) can attach a payment proof to their own order', async () => {
    const buyer=testEnv.authenticatedContext('buyer64').firestore();
    await assertSucceeds(setDoc(doc(buyer,'orders/ADI-20261111-S64A/paymentProof/latest'),{...proof,uploadedBy:'buyer64',createdAt:serverTimestamp()}));
  });
});

describe('Home poll votes (homePollVotes): one vote per user per poll, owner-only reads', () => {
  const ownerDb=()=>testEnv.authenticatedContext('owner',{email:'ankurdryicewholesalers@gmail.com',email_verified:true}).firestore();
  const voter=()=>testEnv.authenticatedContext('voter1').firestore();
  const vote=(uid,option='A',pollId='poll1')=>({pollId,uid,option,votedAt:serverTimestamp()});
  it('allows a signed-in user to create exactly their own vote doc pollId_uid', async () => {
    await assertSucceeds(setDoc(doc(voter(),'homePollVotes/poll1_voter1'),vote('voter1')));
  });
  it('denies a second vote, changing or deleting a vote', async () => {
    await assertFails(setDoc(doc(voter(),'homePollVotes/poll1_voter1'),vote('voter1','B')));
    await assertFails(updateDoc(doc(voter(),'homePollVotes/poll1_voter1'),{option:'B'}));
    await assertFails(deleteDoc(doc(voter(),'homePollVotes/poll1_voter1')));
    await assertFails(deleteDoc(doc(ownerDb(),'homePollVotes/poll1_voter1')));
  });
  it('denies voting as someone else, under a wrong id, as a guest, or with extra fields', async () => {
    await assertFails(setDoc(doc(voter(),'homePollVotes/poll1_voter2'),vote('voter2')));
    await assertFails(setDoc(doc(voter(),'homePollVotes/poll2_voter2'),vote('voter1','A','poll2')));
    await assertFails(setDoc(doc(voter(),'homePollVotes/random-id'),vote('voter1','A','poll3')));
    await assertFails(setDoc(doc(testEnv.unauthenticatedContext().firestore(),'homePollVotes/poll1_guest'),vote('guest')));
    await assertFails(setDoc(doc(voter(),'homePollVotes/poll4_voter1'),{...vote('voter1','A','poll4'),role:'admin'}));
    await assertFails(setDoc(doc(voter(),'homePollVotes/poll5_voter1'),{pollId:'poll5',uid:'voter1',option:'A',votedAt:new Date(2020,0,1)}));
  });
  it('a voter cannot change their own or anyone else\'s users/role', async () => {
    await assertFails(setDoc(doc(voter(),'users/voter1'),{role:'admin'},{merge:true}));
    await assertFails(setDoc(doc(voter(),'users/staff'),{role:'customer'},{merge:true}));
  });
  it('only the owner reads votes', async () => {
    await assertFails(getDoc(doc(voter(),'homePollVotes/poll1_voter1')));
    await assertFails(getDocs(collection(voter(),'homePollVotes')));
    await assertSucceeds(getDoc(doc(ownerDb(),'homePollVotes/poll1_voter1')));
    await assertSucceeds(getDocs(collection(ownerDb(),'homePollVotes')));
  });
});

// v1.0.75 (Ankur, 13 Nov 2026): stock ledger. Owner login + up to 4 switched-on
// registry staff (5 accounts max). Create + read only; nobody edits or deletes.
describe('Stock ledger (Spark, no delete)', () => {
  const ownerDb = () => testEnv.authenticatedContext('owner',{email:'ankurdryicewholesalers@gmail.com',email_verified:true}).firestore();
  const stockStaff = () => testEnv.authenticatedContext('stock-staff',{email:'stocker@example.com',email_verified:true}).firestore();
  const plainStaff = () => testEnv.authenticatedContext('packer-uid',{email:'packer@example.com',email_verified:true}).firestore();
  const inactiveStock = () => testEnv.authenticatedContext('former-uid',{email:'former@example.com',email_verified:true}).firestore();
  const entry = (uid, extra={}) => ({type:'in',kg:25.5,note:'truck',createdBy:uid,createdByName:'Name',createdAt:serverTimestamp(),...extra});
  before(async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const db=ctx.firestore();
      await db.doc('staffMembers/+919800000003').set({phone:'+919800000003',name:'Stocker',email:'stocker@example.com',active:true,role:'STAFF',stockAccess:true,updatedAt:new Date()});
      await db.doc('staffEmails/stocker@example.com').set({phone:'+919800000003',name:'Stocker',active:true,role:'STAFF',updatedAt:new Date()});
      await db.doc('stockAccess/members').set({emails:['stocker@example.com','former@example.com'],updatedAt:new Date()});
      await db.doc('stockLedger/seed').set({type:'in',kg:100,createdBy:'owner',createdByName:'Owner',createdAt:new Date()});
    });
  });
  it('owner and switched-on active staff add and read entries; others cannot', async () => {
    await assertSucceeds(setDoc(doc(ownerDb(),'stockLedger/o1'),entry('owner')));
    await assertSucceeds(setDoc(doc(stockStaff(),'stockLedger/s1'),entry('stock-staff',{type:'out',kg:10})));
    await assertSucceeds(getDocs(collection(stockStaff(),'stockLedger')));
    await assertSucceeds(getDocs(collection(ownerDb(),'stockLedger')));
    await assertFails(getDocs(collection(plainStaff(),'stockLedger')));
    await assertFails(setDoc(doc(plainStaff(),'stockLedger/p1'),entry('packer-uid')));
    await assertFails(setDoc(doc(inactiveStock(),'stockLedger/f1'),entry('former-uid')));
    await assertFails(getDocs(collection(testEnv.authenticatedContext('customer').firestore(),'stockLedger')));
    await assertFails(getDocs(collection(testEnv.unauthenticatedContext().firestore(),'stockLedger')));
  });
  it('rejects bad entries: wrong type, zero/huge kg, someone else as creator, client time, extra fields', async () => {
    const db=stockStaff();
    await assertFails(setDoc(doc(db,'stockLedger/b1'),entry('stock-staff',{type:'adjust'})));
    await assertFails(setDoc(doc(db,'stockLedger/b2'),entry('stock-staff',{kg:0})));
    await assertFails(setDoc(doc(db,'stockLedger/b3'),entry('stock-staff',{kg:100001})));
    await assertFails(setDoc(doc(db,'stockLedger/b4'),entry('owner')));
    await assertFails(setDoc(doc(db,'stockLedger/b5'),entry('stock-staff',{createdAt:new Date(0)})));
    await assertFails(setDoc(doc(db,'stockLedger/b6'),entry('stock-staff',{balance:999})));
    await assertFails(setDoc(doc(db,'stockLedger/b7'),entry('stock-staff',{note:'x'.repeat(201)})));
  });
  it('nobody, owner included, can edit or delete an entry', async () => {
    for (const db of [ownerDb(), stockStaff()]) {
      await assertFails(updateDoc(doc(db,'stockLedger/seed'),{kg:1}));
      await assertFails(deleteDoc(doc(db,'stockLedger/seed')));
    }
  });
  it('only the owner manages the access list, max 4 switched emails (5 accounts with owner)', async () => {
    await assertFails(getDoc(doc(stockStaff(),'stockAccess/members')));
    await assertFails(setDoc(doc(stockStaff(),'stockAccess/members'),{emails:['stocker@example.com'],updatedAt:serverTimestamp()}));
    await assertSucceeds(setDoc(doc(ownerDb(),'stockAccess/members'),{emails:['a@x.com','b@x.com','c@x.com','stocker@example.com'],updatedAt:serverTimestamp()}));
    await assertFails(setDoc(doc(ownerDb(),'stockAccess/members'),{emails:['a@x.com','b@x.com','c@x.com','d@x.com','e@x.com'],updatedAt:serverTimestamp()}));
    await assertFails(setDoc(doc(ownerDb(),'stockAccess/other'),{emails:[],updatedAt:serverTimestamp()}));
    await assertFails(deleteDoc(doc(ownerDb(),'stockAccess/members')));
    await assertSucceeds(setDoc(doc(ownerDb(),'staffMembers/+919800000003'),{stockAccess:false,updatedAt:serverTimestamp()},{merge:true}));
    await assertFails(setDoc(doc(ownerDb(),'staffMembers/+919800000003'),{stockAccess:'yes',updatedAt:serverTimestamp()},{merge:true}));
  });
});
