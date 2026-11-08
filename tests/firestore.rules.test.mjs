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
});
