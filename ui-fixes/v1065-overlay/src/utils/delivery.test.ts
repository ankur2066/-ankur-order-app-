import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BUS_STOPS, normalizeDeliverySettings, resolveDeliveryDefault, validateDeliveryChoice,
  groupForPacking, packingShareText, LOCAL_GROUP, UNASSIGNED_GROUP, activeStops,
} from './delivery.ts';

const settings = normalizeDeliverySettings({
  busStops: [
    { id: 'alambagh', name: 'Alambagh', color: 'teal', active: true },
    { id: 'kaiserbagh', name: 'Kaiserbagh', color: 'orange', active: true },
    { id: 'bus-stop-3', name: 'Bus Stop 3', color: 'violet', active: false },
  ],
  districtStopMap: { 'Sitapur': 'kaiserbagh', 'Hardoi ': 'bus-stop-3' },
});

test('default bus stops are Alambagh, Kaiserbagh and Bus Stop 3 and all start active', () => {
  assert.deepEqual(DEFAULT_BUS_STOPS.map((s) => s.name), ['Alambagh', 'Kaiserbagh', 'Bus Stop 3']);
  assert.equal(normalizeDeliverySettings(undefined).busStops.length, 3);
  assert.ok(normalizeDeliverySettings({}).busStops.every((s) => s.active));
});

test('delivery default priority: customer default -> district mapping -> ask', () => {
  assert.deepEqual(resolveDeliveryDefault({ defaultDeliveryMode: 'BUS', defaultBusStopId: 'alambagh' }, 'Sitapur', settings), { source: 'customer', mode: 'BUS', busStopId: 'alambagh' });
  assert.deepEqual(resolveDeliveryDefault({ defaultDeliveryMode: 'PORTER' }, 'Sitapur', settings), { source: 'customer', mode: 'PORTER' });
  assert.deepEqual(resolveDeliveryDefault(null, ' sitapur ', settings), { source: 'district', mode: 'BUS', busStopId: 'kaiserbagh' });
  assert.deepEqual(resolveDeliveryDefault({}, 'Unknown town', settings), { source: 'ask' });
  assert.deepEqual(resolveDeliveryDefault(undefined, undefined, settings), { source: 'ask' });
});

test('inactive default stop gives a warning and never silently switches stop', () => {
  const r = resolveDeliveryDefault({ defaultDeliveryMode: 'BUS', defaultBusStopId: 'bus-stop-3' }, 'Sitapur', settings);
  assert.equal(r.source, 'ask');
  assert.equal(r.warning, 'inactive_default_stop');
  assert.equal(r.mode, undefined);
  assert.equal(r.busStopId, undefined);
  // a district mapped to an inactive stop is not offered either
  assert.deepEqual(resolveDeliveryDefault(null, 'Hardoi', settings), { source: 'ask' });
  const removed = resolveDeliveryDefault({ defaultDeliveryMode: 'BUS', defaultBusStopId: 'deleted-stop' }, '', settings);
  assert.equal(removed.warning, 'unknown_default_stop');
});

test('new orders cannot choose an inactive stop', () => {
  assert.equal(validateDeliveryChoice('BUS', 'alambagh', settings), null);
  assert.match(validateDeliveryChoice('BUS', 'bus-stop-3', settings) || '', /Inactive/);
  assert.match(validateDeliveryChoice('BUS', undefined, settings) || '', /Bus stop/);
  assert.equal(validateDeliveryChoice('SHOP_PICKUP', undefined, settings), null);
  assert.ok(validateDeliveryChoice(undefined, undefined, settings));
  assert.deepEqual(activeStops(settings).map((s) => s.id), ['alambagh', 'kaiserbagh']);
});

test('packing groups by stop + Local with KG totals for the selected IST date only', () => {
  const day = '2026-11-11';
  const orders = [
    { orderId: 'A', customerName: 'Ram', district: 'Sitapur', quantityKg: 10, deliveryMode: 'BUS', busStopId: 'alambagh', dispatchDate: day, status: 'pending' },
    { orderId: 'B', customerName: 'Shyam', district: 'Barabanki', quantityKg: 12.5, deliveryMode: 'BUS', busStopId: 'alambagh', dispatchDate: day, status: 'in_packing' },
    { orderId: 'C', customerName: 'Mohan', district: 'Lucknow', quantityKg: 5, deliveryMode: 'PORTER', dispatchDate: day, status: 'pending' },
    { orderId: 'D', customerName: 'Sita', district: 'Lucknow', quantityKg: 3, deliveryMode: 'SHOP_PICKUP', dispatchDate: day, status: 'pending' },
    { orderId: 'E', customerName: 'Gita', district: 'Hardoi', quantityKg: 7, deliveryMode: 'BUS', busStopId: 'bus-stop-3', dispatchDate: day, status: 'pending' },
    { orderId: 'F', customerName: 'Old', district: 'Lucknow', quantityKg: 4, dispatchDate: day, status: 'pending' },
    { orderId: 'G', customerName: 'Tomorrow', quantityKg: 50, deliveryMode: 'BUS', busStopId: 'alambagh', dispatchDate: '2026-11-12', status: 'pending' },
    { orderId: 'H', customerName: 'Cancelled', quantityKg: 9, deliveryMode: 'LOCAL', dispatchDate: day, status: 'cancelled' },
    { orderId: 'I', customerName: 'Trash', quantityKg: 9, deliveryMode: 'LOCAL', dispatchDate: day, status: 'pending', isTrash: true },
  ];
  const groups = groupForPacking(orders, settings, day);
  const by = Object.fromEntries(groups.map((g) => [g.key, g]));
  assert.equal(by.alambagh.count, 2);
  assert.equal(by.alambagh.totalKg, 22.5);
  assert.equal(by.kaiserbagh.count, 0);
  assert.equal(by[LOCAL_GROUP].count, 2);
  assert.equal(by[LOCAL_GROUP].totalKg, 8);
  assert.deepEqual(by[LOCAL_GROUP].subTags, { Porter: 1, 'Dukan pickup': 1 });
  assert.equal(by['bus-stop-3'].active, false, 'inactive stop still shows its existing orders');
  assert.match(by['bus-stop-3'].label, /Inactive/);
  assert.equal(by[UNASSIGNED_GROUP].count, 1);
  assert.deepEqual(groups.map((g) => g.key), ['alambagh', 'kaiserbagh', 'bus-stop-3', LOCAL_GROUP, UNASSIGNED_GROUP]);
});

test('packing share text has KG and names but no prices or payment info', () => {
  const day = '2026-11-11';
  const [group] = groupForPacking([{ orderId: 'A', customerName: 'Ram', district: 'Sitapur', quantityKg: 10, packCount: 2, deliveryMode: 'BUS', busStopId: 'alambagh', dispatchDate: day, status: 'pending', totalAmount: 600, paymentStatus: 'pending_verification' } as any], settings, day);
  const text = packingShareText(group, day);
  assert.match(text, /Alambagh: 1 order · 10 KG/);
  assert.match(text, /Ram · Sitapur · 10 KG · 2 box/);
  assert.doesNotMatch(text, /₹|600|payment|rate|upi/i);
});
