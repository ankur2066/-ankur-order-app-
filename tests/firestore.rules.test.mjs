import { readFile } from 'node:fs/promises';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

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

