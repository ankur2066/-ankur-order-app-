import test from 'node:test';
import assert from 'node:assert/strict';
import { staffWhatsAppText, genericStaffWhatsAppText, dispatchDetail } from './staffWhatsApp.ts';
import { STAFF_VIEW_FIELDS } from './staffProjection.ts';

const base = { customerName: 'Ram', quantityKg: 10 };
const lead = 'नमस्ते Ram जी, Ankur Dryice से। आपका 10 KG ड्राई आइस ऑर्डर';

test('pending / new: order received, will confirm soon', () => {
  assert.equal(staffWhatsAppText({ ...base, status: 'pending' }), `${lead} हमें मिल गया है, जल्द कन्फ़र्म करेंगे।`);
  assert.equal(staffWhatsAppText({ ...base, status: 'new' }), `${lead} हमें मिल गया है, जल्द कन्फ़र्म करेंगे।`);
});

test('confirmed', () => {
  assert.equal(staffWhatsAppText({ ...base, status: 'confirmed' }), `${lead} कन्फ़र्म हो गया है।`);
});

test('in_packing: packing now, and packed (packingStatus) = will leave soon', () => {
  assert.equal(staffWhatsAppText({ ...base, status: 'in_packing' }), `${lead} पैक हो रहा है।`);
  assert.equal(staffWhatsAppText({ ...base, status: 'in_packing', packingStatus: 'packed' }), `${lead} पैक हो गया है, जल्द रवाना होगा।`);
  assert.equal(staffWhatsAppText({ ...base, status: 'packed' }), `${lead} पैक हो गया है, जल्द रवाना होगा।`);
});

test('dispatched: with bus stop, each delivery mode, and no mode', () => {
  assert.equal(staffWhatsAppText({ ...base, status: 'dispatched', deliveryMode: 'BUS' }, 'Alambagh'), `${lead} रवाना हो गया है, बस से (Alambagh बस स्टॉप)।`);
  assert.equal(staffWhatsAppText({ ...base, status: 'dispatched', deliveryMode: 'BUS' }), `${lead} रवाना हो गया है, बस से।`);
  assert.equal(staffWhatsAppText({ ...base, status: 'dispatched', deliveryMode: 'PORTER' }), `${lead} रवाना हो गया है, Porter से।`);
  assert.equal(staffWhatsAppText({ ...base, status: 'dispatched', deliveryMode: 'LOCAL' }), `${lead} रवाना हो गया है, लोकल डिलीवरी से।`);
  assert.equal(staffWhatsAppText({ ...base, status: 'dispatched', deliveryMode: 'SHOP_PICKUP' }), `${lead} रवाना हो गया है, दुकान पिकअप के लिए।`);
  assert.equal(staffWhatsAppText({ ...base, status: 'dispatched' }), `${lead} रवाना हो गया है।`);
  assert.equal(staffWhatsAppText({ ...base, status: 'dispatched', deliveryMode: 'TRAIN' }, 'X'), `${lead} रवाना हो गया है।`);
  assert.equal(dispatchDetail('PORTER', 'Alambagh'), ', Porter से', 'stop name only belongs to bus orders');
});

test('delivered and cancelled', () => {
  assert.equal(staffWhatsAppText({ ...base, status: 'delivered' }), `${lead} डिलीवर हो गया है। धन्यवाद!`);
  assert.equal(staffWhatsAppText({ ...base, status: 'cancelled' }), `${lead} रद्द कर दिया गया है।`);
});

test('unknown or missing status keeps the earlier generic greeting', () => {
  const generic = 'नमस्ते Ram जी, Ankur Dryice से बात कर रहे हैं। आपके 10 KG ड्राई आइस ऑर्डर के बारे में।';
  assert.equal(staffWhatsAppText({ ...base, status: 'something_else' }), generic);
  assert.equal(staffWhatsAppText({ ...base }), generic);
  assert.equal(genericStaffWhatsAppText(base), generic);
});

test('missing name / bad kg stay readable', () => {
  assert.equal(staffWhatsAppText({ status: 'confirmed', quantityKg: 'abc' }), 'नमस्ते जी, Ankur Dryice से। आपका 0 KG ड्राई आइस ऑर्डर कन्फ़र्म हो गया है।');
  assert.equal(staffWhatsAppText({ customerName: '  Sita ', quantityKg: '25', status: 'delivered' }), 'नमस्ते Sita जी, Ankur Dryice से। आपका 25 KG ड्राई आइस ऑर्डर डिलीवर हो गया है। धन्यवाद!');
});

test('every status in the app status model has its own text (not the generic one)', () => {
  for (const status of ['pending', 'confirmed', 'in_packing', 'dispatched', 'delivered', 'cancelled']) {
    assert.notEqual(staffWhatsAppText({ ...base, status }), genericStaffWhatsAppText(base), status);
  }
});

test('helper reads only staff-view fields (no phone, price or PIN)', () => {
  for (const key of ['customerName', 'quantityKg', 'status', 'packingStatus', 'deliveryMode']) {
    assert.ok((STAFF_VIEW_FIELDS as readonly string[]).includes(key), key);
  }
  const text = staffWhatsAppText({ ...base, status: 'dispatched', deliveryMode: 'BUS', customerPhone: '9876543210', totalAmount: 600, trackingPin: '123456' } as any, 'Alambagh');
  assert.ok(!text.includes('9876543210') && !text.includes('600') && !text.includes('123456'));
});
