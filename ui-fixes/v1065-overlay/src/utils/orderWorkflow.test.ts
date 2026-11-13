import test from 'node:test';
import assert from 'node:assert/strict';
import { isNewOrder, isConfirmedWork, isLoaded, loadToggleStatus, workSlotMatches, loadCounts, todayAttention, sortNewOrders, confirmModeError } from './orderWorkflow.ts';

const today = '2026-11-12';
const o = (status: string, dispatchDate = today, extra: Record<string, unknown> = {}) => ({ status, dispatchDate, dispatchSlot: 'morning', ...extra });

test('new orders tab holds only unconfirmed (pending), non-trash orders', () => {
  assert.equal(isNewOrder(o('pending')), true);
  for (const s of ['confirmed', 'in_packing', 'dispatched', 'delivered', 'cancelled']) assert.equal(isNewOrder(o(s)), false, s);
  assert.equal(isNewOrder(o('pending', today, { isTrash: true })), false);
});

test('only confirmed-onwards orders count for packing and dispatch', () => {
  assert.equal(isConfirmedWork(o('pending')), false);
  assert.equal(isConfirmedWork(o('cancelled')), false);
  assert.equal(isConfirmedWork(o('confirmed', today, { isTrash: true })), false);
  for (const s of ['confirmed', 'in_packing', 'dispatched', 'delivered']) assert.equal(isConfirmedWork(o(s)), true, s);
  assert.equal(workSlotMatches(o('pending'), 'today_morning', today), false);
  assert.equal(workSlotMatches(o('confirmed'), 'today_morning', today), true);
  assert.equal(workSlotMatches(o('confirmed'), 'today_evening', today), false);
});

test('loading tick uses the existing in_packing status and never moves dispatched/delivered back', () => {
  assert.equal(isLoaded(o('confirmed')), false);
  for (const s of ['in_packing', 'dispatched', 'delivered']) assert.equal(isLoaded(o(s)), true, s);
  assert.equal(loadToggleStatus(o('confirmed'), true), 'in_packing');
  assert.equal(loadToggleStatus(o('in_packing'), false), 'confirmed');
  assert.equal(loadToggleStatus(o('pending'), true), null);
  assert.equal(loadToggleStatus(o('dispatched'), false), null);
  assert.equal(loadToggleStatus(o('delivered'), false), null);
  assert.equal(loadToggleStatus(o('in_packing'), true), null);
});

test('stop count "3 orders, 2 loaded" ignores unconfirmed and cancelled orders', () => {
  assert.deepEqual(loadCounts([o('confirmed'), o('in_packing'), o('dispatched'), o('pending'), o('cancelled')]), { total: 3, loaded: 2 });
  assert.deepEqual(loadCounts([]), { total: 0, loaded: 0 });
});

test('old/overdue counts only past-date orders that are still not dispatched', () => {
  const past = '2026-11-10';
  assert.equal(workSlotMatches(o('confirmed', past), 'old_overdue', today), true);
  assert.equal(workSlotMatches(o('in_packing', past), 'old_overdue', today), true);
  for (const s of ['dispatched', 'delivered', 'cancelled', 'pending']) assert.equal(workSlotMatches(o(s, past), 'old_overdue', today), false, s);
  // a far-future date is upcoming, not overdue
  assert.equal(workSlotMatches(o('confirmed', '2026-11-20'), 'old_overdue', today), false);
  assert.equal(workSlotMatches(o('confirmed', '2026-11-20'), 'upcoming', today), true);
  // the reported 74-vs-25 case: 50 dispatched/delivered old orders + 24 open old orders -> 24
  const orders = [...Array(50)].map((_, i) => o(i % 2 ? 'dispatched' : 'delivered', past)).concat([...Array(24)].map(() => o('confirmed', past)));
  assert.equal(orders.filter((x) => workSlotMatches(x, 'old_overdue', today)).length, 24);
});

test('today alert counts unconfirmed and unticked orders for today only', () => {
  const list = [o('pending'), o('pending'), o('confirmed'), o('in_packing'), o('dispatched'), o('pending', '2026-11-13'), o('confirmed', '2026-11-11'), o('pending', today, { isTrash: true }), o('cancelled')];
  assert.deepEqual(todayAttention(list, today), { unconfirmed: 2, unloaded: 1 });
  assert.deepEqual(todayAttention([o('in_packing'), o('dispatched')], today), { unconfirmed: 0, unloaded: 0 });
});

test('new orders are listed earliest dispatch date first, undated last', () => {
  const list = [o('pending', '2026-11-14', { id: 'c' }), o('confirmed', '2026-11-12', { id: 'x' }), o('pending', '2026-11-12', { id: 'a' }), { status: 'pending', id: 'z' }, o('pending', '2026-11-13', { id: 'b' })];
  assert.deepEqual(sortNewOrders(list as any).map((x: any) => x.id), ['a', 'b', 'c', 'z']);
});

// v1.0.75 (Ankur, 13 Nov 2026): Mode is mandatory before Confirm.
test('confirm is blocked until a delivery Mode (and BUS stop) is set', () => {
  for (const missing of [{}, { deliveryMode: '' }, { deliveryMode: null }, { deliveryMode: 'TRUCK' }]) {
    const err = confirmModeError(missing as any);
    assert.ok(err && /Mode/.test(err.en) && /Mode/.test(err.hi), JSON.stringify(missing));
  }
  assert.ok(confirmModeError({ deliveryMode: 'BUS' }));
  assert.ok(confirmModeError({ deliveryMode: 'BUS', busStopId: '  ' }));
  assert.equal(confirmModeError({ deliveryMode: 'BUS', busStopId: 'alambagh' }), null);
  for (const mode of ['SHOP_PICKUP', 'PORTER', 'LOCAL']) assert.equal(confirmModeError({ deliveryMode: mode }), null, mode);
});
