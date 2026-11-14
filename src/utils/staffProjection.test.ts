import test from 'node:test';
import assert from 'node:assert/strict';
import { toStaffOrderView, hasForbiddenStaffField, staffStatusUpdate, projectionDrift, STAFF_VIEW_FIELDS } from './staffProjection.ts';

const order = {
  orderId: 'ADI-20261111-ABCD', trackingToken: 'ADI_123456', trackingPin: '123456', customerName: 'Ram', customerPhone: '9876543210',
  district: 'Sitapur', city: 'Sitapur', address: 'Village road', quantityKg: 10, productName: 'Dry Ice', dispatchTiming: 'आज, सुबह',
  dispatchDate: '2026-11-11', slot: 'morning', status: 'pending', dryIcePricePerKg: 50, dryIceSubtotal: 500, thermocolPricePerKg: 10,
  thermocolSubtotal: 100, totalAmount: 600, calculatedTotal: 600, customerTotal: 600, paymentStatus: 'pending_verification',
  paymentMethod: 'paytm_business_upi', paymentNotes: 'UPI', userId: 'u1', deliveryMode: 'BUS', busStopId: 'alambagh', packCount: 2,
  deliveryNote: 'Driver ko de dena', createdAt: 1, updatedAt: 1,
};

test('staff projection never contains money, payment, phone or PIN fields', () => {
  const view = toStaffOrderView(order);
  assert.deepEqual(hasForbiddenStaffField(view), []);
  for (const key of Object.keys(view)) assert.ok((STAFF_VIEW_FIELDS as readonly string[]).includes(key), key);
  assert.equal(view.deliveryMode, 'BUS');
  assert.equal(view.busStopId, 'alambagh');
  assert.equal(view.packCount, 2);
  assert.equal(view.quantityKg, 10);
});

test('non-bus modes drop a stale bus stop id; invalid modes are dropped', () => {
  assert.equal(toStaffOrderView({ ...order, deliveryMode: 'PORTER' }).busStopId, undefined);
  assert.equal(toStaffOrderView({ ...order, deliveryMode: 'TRAIN' }).deliveryMode, undefined);
});

test('staff status updates are status-only and flag the owner sync', () => {
  assert.deepEqual(staffStatusUpdate('packing_done', 's1'), { order: { status: 'in_packing' }, view: { status: 'in_packing', statusSyncPending: true, statusUpdatedBy: 's1', packingStatus: 'packed' } });
  assert.deepEqual(staffStatusUpdate('dispatched', 's1').order, { status: 'dispatched' });
  assert.deepEqual(staffStatusUpdate('handed_over', 's1').order, { status: 'delivered' });
  for (const action of ['packing_done', 'dispatched', 'handed_over'] as const) {
    assert.deepEqual(hasForbiddenStaffField(staffStatusUpdate(action, 's1').view), []);
  }
});

test('projection drift patches only changed delivery fields', () => {
  const view = toStaffOrderView(order);
  assert.equal(projectionDrift(view, order), null);
  assert.deepEqual(projectionDrift(view, { ...order, busStopId: 'kaiserbagh' }), { busStopId: 'kaiserbagh' });
  assert.ok(projectionDrift(undefined, order));
});

test('v1.0.68: staff WhatsApp button gets only a 10-digit waPhone, never the raw phone field', async () => {
  const { staffWhatsappPhone } = await import('./staffProjection.ts');
  const view = toStaffOrderView({ ...order, customerPhone: '+91 98765-43210' });
  assert.equal(view.waPhone, '9876543210');
  assert.equal('customerPhone' in view, false);
  assert.equal(staffWhatsappPhone('12345'), '');
  assert.equal(staffWhatsappPhone(undefined), '');
  assert.equal(toStaffOrderView({ ...order, customerPhone: 'abc' }).waPhone, undefined);
  assert.deepEqual(projectionDrift({ ...toStaffOrderView(order), waPhone: undefined }, order), { waPhone: '9876543210' });
});

test('v1.0.72: projection carries busNumber for bus orders only, and drift re-syncs it', async () => {
  const { DELIVERY_SYNC_FIELDS } = await import('./staffProjection.ts');
  assert.ok((STAFF_VIEW_FIELDS as readonly string[]).includes('busNumber'));
  assert.ok((DELIVERY_SYNC_FIELDS as readonly string[]).includes('busNumber'));
  const withBus = { ...order, busNumber: ' 6965 ' };
  const view = toStaffOrderView(withBus);
  assert.equal(view.busNumber, '6965');
  assert.deepEqual(hasForbiddenStaffField(view), []);
  assert.equal(toStaffOrderView(order).busNumber, undefined, 'no bus number saved = no key');
  assert.equal(toStaffOrderView({ ...withBus, deliveryMode: 'PORTER' }).busNumber, undefined);
  assert.deepEqual(projectionDrift(toStaffOrderView(order), withBus), { busNumber: '6965' });
  assert.deepEqual(projectionDrift(view, order), { busNumber: null }, 'cleared bus number is cleared for staff');
  assert.equal(projectionDrift(view, withBus), null);
});
