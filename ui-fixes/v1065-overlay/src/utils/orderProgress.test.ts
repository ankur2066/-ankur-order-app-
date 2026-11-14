import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRESS_STEPS, currentStepIndex, buildOrderProgress, pickCurrentOrder, formatStepTime, toMillis } from './orderProgress.ts';

const ts = (s: number) => ({ seconds: s, nanoseconds: 0 });

// v1.0.76 (Ankur, 14 Nov 2026): big step tracker on the customer's current order.
test('steps are received -> confirmed -> packed -> dispatched -> delivered, in Hindi and English', () => {
  assert.deepEqual(PROGRESS_STEPS.map((s) => s.en), ['Order received', 'Confirmed', 'Packed', 'Dispatched', 'Delivered']);
  for (const s of PROGRESS_STEPS) assert.match(s.hi, /[\u0900-\u097F]/);
});

test('status maps to the right current step; staff "packing done" (in_packing) = Packed', () => {
  assert.equal(currentStepIndex('pending'), 0);
  assert.equal(currentStepIndex('confirmed'), 1);
  assert.equal(currentStepIndex('in_packing'), 2);
  assert.equal(currentStepIndex('dispatched'), 3);
  assert.equal(currentStepIndex('delivered'), 4);
  assert.equal(currentStepIndex('cancelled'), -1);
  assert.equal(currentStepIndex(undefined), -1);
});

test('done / current / todo states and only real stored times are shown', () => {
  const v = buildOrderProgress({ status: 'dispatched', createdAt: ts(1000), updatedAt: ts(5000) });
  assert.equal(v.cancelled, false);
  assert.deepEqual(v.steps.map((s) => s.state), ['done', 'done', 'done', 'current', 'todo']);
  assert.equal(v.steps[0].timeMs, 1000_000, 'received = createdAt');
  assert.equal(v.steps[3].timeMs, 5000_000, 'current step = last update time');
  assert.equal(v.steps[1].timeMs, null, 'no invented time for steps without history');
  assert.equal(v.steps[4].timeMs, null, 'future step never has a time');
});

test('a new order: Order received is current with its booking time', () => {
  const v = buildOrderProgress({ status: 'pending', createdAt: ts(1000), updatedAt: ts(1000) });
  assert.deepEqual(v.steps.map((s) => s.state), ['current', 'todo', 'todo', 'todo', 'todo']);
  assert.equal(v.steps[0].timeMs, 1000_000);
});

test('optional statusTimes map is used when present', () => {
  const v = buildOrderProgress({ status: 'delivered', createdAt: ts(1), updatedAt: ts(9), statusTimes: { confirmed: ts(2), packed: ts(3), dispatched: ts(4) } });
  assert.deepEqual(v.steps.map((s) => s.timeMs), [1000, 2000, 3000, 4000, 9000]);
});

test('cancelled order is flagged and no step is highlighted', () => {
  const v = buildOrderProgress({ status: 'cancelled', createdAt: ts(1) });
  assert.equal(v.cancelled, true);
  assert.ok(v.steps.every((s) => s.state === 'todo'));
});

test('current order = newest active order, else a delivered one from the last 24h', () => {
  const now = 100 * 86400_000;
  const orders = [
    { orderId: 'A', status: 'delivered', createdAt: ts(now / 1000 - 10), updatedAt: ts(now / 1000 - 5) },
    { orderId: 'B', status: 'confirmed', createdAt: ts(now / 1000 - 3000) },
    { orderId: 'C', status: 'pending', createdAt: ts(now / 1000 - 2000) },
    { orderId: 'D', status: 'pending', createdAt: ts(now / 1000 - 1), isTrash: true },
  ];
  assert.equal(pickCurrentOrder(orders, now)?.orderId, 'C');
  assert.equal(pickCurrentOrder(orders.filter((o) => o.orderId === 'A'), now)?.orderId, 'A');
  const old = [{ orderId: 'E', status: 'delivered', createdAt: ts(1), updatedAt: ts(2) }];
  assert.equal(pickCurrentOrder(old, now), null);
  assert.equal(pickCurrentOrder([{ orderId: 'F', status: 'cancelled', createdAt: ts(1) }], now), null);
});

test('time helpers accept Firestore timestamps and format in IST', () => {
  assert.equal(toMillis({ toMillis: () => 42 }), 42);
  assert.equal(toMillis(ts(2)), 2000);
  assert.equal(toMillis(null), null);
  const ms = Date.UTC(2026, 10, 14, 9, 35); // 15:05 IST
  assert.match(formatStepTime(ms, false), /14 Nov.*3:05\s?pm/i);
  assert.equal(formatStepTime(null, true), '');
});
