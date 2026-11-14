import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBusNumber, trackingDispatchFields, trackingDispatchView } from './busDispatch.ts';

test('bus number is trimmed, upper-cased and length/charset limited', () => {
  assert.equal(normalizeBusNumber(' up32  ab 6965 '), 'UP32 AB 6965');
  assert.equal(normalizeBusNumber('6965'), '6965');
  assert.equal(normalizeBusNumber(''), '');
  assert.equal(normalizeBusNumber(undefined), '');
  assert.equal(normalizeBusNumber('<script>'), '');
  assert.equal(normalizeBusNumber('1'.repeat(21)), '');
});

test('tracking fields: bus order copies stop + bus number; other modes clear them', () => {
  assert.deepEqual(trackingDispatchFields({ deliveryMode: 'BUS', busStopId: 'alambagh', busNumber: '6965' }), { deliveryMode: 'BUS', busStopId: 'alambagh', busNumber: '6965' });
  assert.deepEqual(trackingDispatchFields({ deliveryMode: 'BUS', busStopId: 'alambagh' }), { deliveryMode: 'BUS', busStopId: 'alambagh', busNumber: null });
  assert.deepEqual(trackingDispatchFields({ deliveryMode: 'PORTER', busStopId: 'alambagh', busNumber: '6965' }), { deliveryMode: 'PORTER', busStopId: null, busNumber: null });
  assert.deepEqual(trackingDispatchFields({}), { deliveryMode: null, busStopId: null, busNumber: null });
  // never carries phone / price / PIN
  const keys = Object.keys(trackingDispatchFields({ deliveryMode: 'BUS', busStopId: 'x1', busNumber: '1', customerPhone: '9876543210', trackingPin: '123456', totalAmount: 600 } as any));
  assert.deepEqual(keys.sort(), ['busNumber', 'busStopId', 'deliveryMode']);
});

test('customer tracking shows bus number once dispatched', () => {
  const view = trackingDispatchView({ status: 'dispatched', deliveryMode: 'BUS', busNumber: '6965' }, 'Alambagh');
  assert.deepEqual(view, { modeHi: 'बस से', modeEn: 'By bus', stopName: 'Alambagh', busNumber: '6965' });
  assert.equal(trackingDispatchView({ status: 'delivered', deliveryMode: 'BUS', busNumber: '6965' })?.busNumber, '6965');
});

test('customer tracking hides bus number when absent or before dispatch', () => {
  const noBus = trackingDispatchView({ status: 'dispatched', deliveryMode: 'BUS' }, 'Alambagh');
  assert.ok(noBus);
  assert.equal('busNumber' in noBus!, false);
  assert.equal(noBus!.stopName, 'Alambagh');
  assert.equal(trackingDispatchView({ status: 'in_packing', deliveryMode: 'BUS', busNumber: '6965' }), null);
  assert.equal(trackingDispatchView({ status: 'confirmed', deliveryMode: 'BUS', busNumber: '6965' }), null);
  assert.equal(trackingDispatchView({ status: 'dispatched' }), null, 'old tracking docs without mode show nothing new');
  assert.equal('busNumber' in trackingDispatchView({ status: 'dispatched', deliveryMode: 'PORTER', busNumber: '6965' })!, false);
});
