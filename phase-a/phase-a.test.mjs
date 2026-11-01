import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateOwnerOverview, ordersToCsv, orderCreatedMs } from '../src/utils/ownerReports.ts';
import { expenseCycleKey, cycleLabel, groupExpensesByCycle } from '../src/utils/expenseCycles.ts';

const now = Date.parse('2026-11-01T07:00:00Z');
const make = (status, days, extra = {}) => ({
  orderId: `ADI-20261101-${status}`, customerName: 'ग्राहक', district: 'Lucknow',
  quantityKg: 10, totalAmount: 600, status,
  createdAt: new Date(now - days * 86400000), ...extra,
});

test('A1: owner recent order counts, status and cancelled/trash revenue excluded', () => {
  const data = [make('pending', 0), make('dispatched', 2), make('cancelled', 3),
    make('delivered', 31), make('pending', 1, { isTrash: true }), make('confirmed', 0, { createdAt: null, orderId: 'legacy-no-date' })];
  assert.deepEqual(calculateOwnerOverview(data, now), {
    recentOrders: 3, pendingOrders: 1, dispatchedOrders: 1,
    estimatedOrderValue: 1200, undatedOrders: 1,
  });
});

test('A1: partial/missing data soft-fails, Firestore timestamps are read', () => {
  const result = calculateOwnerOverview([make('pending', 0, { createdAt: { seconds: now / 1000 }, totalAmount: undefined })], now);
  assert.equal(result.recentOrders, 1);
  assert.equal(result.estimatedOrderValue, 0);
  assert.equal(orderCreatedMs(make('pending', 0, { createdAt: { toDate: () => new Date(now) } })), now);
});

test('A2: real CSV columns, quoted comma/double quote/newlines, formula injection protection', () => {
  const order = make('pending', 0, { customerName: '=HYPERLINK("bad")', district: 'Lucknow, UP', orderId: 'ADI-20261101-123' });
  const csv = ordersToCsv([order, make('delivered', 0, { isTrash: true })]);
  assert.equal(csv.split('\r\n').filter(Boolean).length, 2);
  assert.ok(csv.startsWith('orderId,date,customerName,district,quantityKg,totalAmount,status\r\n'));
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"Lucknow, UP"'));
  assert.ok(csv.includes(',10,600.00,"pending"'));
});

test('A3: 15–14 accounting month boundary in Asia/Kolkata, totals and unknown date', () => {
  assert.equal(expenseCycleKey('2026-11-14T17:00:00Z'), '2026-10'); // Nov 14, 22:30 IST
  assert.equal(expenseCycleKey('2026-11-14T19:00:00Z'), '2026-11'); // Nov 15, 00:30 IST
  assert.equal(expenseCycleKey('2027-01-14T19:00:00Z'), '2027-01');
  assert.ok(cycleLabel('2026-10').includes('14'));
  const groups = groupExpensesByCycle([
    { id:'a',date:'2026-11-14T17:00:00Z',amount:200 },
    { id:'b',date:'2026-11-14T19:00:00Z',amount:50 },
    { id:'c',date:'2026-11-16T19:00:00Z',amount:30 },
    { id:'d',date:null,amount:15 },
  ]);
  assert.equal(groups.find((g) => g.key === '2026-11')?.total, 80);
  assert.equal(groups.find((g) => g.key === '2026-10')?.total, 200);
  assert.equal(groups.find((g) => g.key === 'unknown')?.total, 15);
});