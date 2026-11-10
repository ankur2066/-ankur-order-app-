import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = process.cwd();
const source = (name) => readFile(path.join(root, name), 'utf8');
const schedule = await import(pathToFileURL(path.join(root, 'src/utils/dispatchSchedule.ts')));

test('legacy relative dispatch labels migrate from createdAt in IST', () => {
  const createdAt = { toDate: () => new Date('2026-11-07T08:00:00.000Z') };
  assert.deepEqual(schedule.dispatchParts({ dispatchTiming: 'कल शाम', createdAt }), { date: '2026-11-08', slot: 'evening' });
  assert.deepEqual(schedule.dispatchParts({ dispatchTiming: 'आज सुबह', createdAt }), { date: '2026-11-07', slot: 'morning' });
});

test('every scheduled date maps to the current, next-day, or old bucket', () => {
  const today = '2026-11-08';
  assert.equal(schedule.dispatchBucket({ dispatchDate: today, slot: 'morning' }, today), 'today_morning');
  assert.equal(schedule.dispatchBucket({ dispatchDate: '2026-11-09', slot: 'evening' }, today), 'tomorrow_evening');
  assert.equal(schedule.dispatchBucket({ dispatchDate: '2026-11-06', slot: 'morning' }, today), 'old_overdue');
  assert.equal(schedule.dispatchBucket({}, today), 'date_not_set');
});

test('retail total edit is rejected by rules; wholesale requires owner profile and reason', async () => {
  const rules = await source('firestore.rules');
  assert.match(rules, /data\.customerType == 'wholesale' && profile\.customerType == 'wholesale'/);
  assert.match(rules, /data\.amountChangeReason\.size\(\) >= 3/);
  assert.match(rules, /data\.quantityKg \* \(\('transportPrice' in data\)/);
  assert.match(rules, /!isAmountChanged && \(data\.totalAmount == formulaTotal/);
  assert.match(rules, /customerType' in incoming\(\)\) \|\| incoming\(\)\.customerType == 'retail'/);
});

test('owner feature switches hide promo UI until enabled and QR stays bundled locally', async () => {
  const hook = await source('src/hooks/useInlinePromo.ts');
  const form = await source('src/components/OrderForm.tsx');
  const tracking = await source('src/components/OrderTrackingView.tsx');
  const formSource = await source('src/components/OrderForm.tsx');
  assert.match(hook, /features\?\.promotions === true/);
  assert.match(form, /promo\.enabled/);
  assert.match(tracking, /PaymentOptions/);
  const payment = await source('src/components/PaymentOptions.tsx');
  const config = await source('src/config/businessConfig.ts');
  assert.match(payment, /backupUpiUri/);
  assert.match(payment, /PRIMARY_UPI_ID/);
  assert.match(config, /paytm\.s26ykus@pty/);
  assert.match(config, /ankur\.singh332066@okhdfcbank/);
  assert.doesNotMatch(form, /8896332066@paytm/);
  assert.doesNotMatch(tracking, /https?:\/\/.*qr/i);
  assert.match(formSource, /if \(currentUser\?\.uid\) \{\s+const existingOrder = await getDoc/);
});

test('payment proof is compressed, stored under its order, and owner-only in the UI', async () => {
  const form = await source('src/components/OrderForm.tsx');
  const proofService = await source('src/services/paymentProof.ts');
  const ownerPreview = await source('src/components/owner/PaymentProofPreview.tsx');
  const rules = await source('firestore.rules');
  assert.match(form, /savePaymentProof\(successData\.orderId, file, currentUser\?\.uid, successData\.trackingPin\)/);
  assert.match(proofService, /doc\(db, 'orders', orderId, 'paymentProof', 'latest'\)/);
  assert.match(proofService, /TARGET_BYTES = 150 \* 1024/);
  assert.match(ownerPreview, /Full payment proof/);
  assert.match(rules, /match \/orders\/\{orderId\}\/paymentProof\/\{proofId\}/);
  assert.match(rules, /allow get: if isAdmin\(\) \|\| orderOwner\(\)/);
  assert.match(rules, /incoming\(\)\.trackingPin == get\(/);
});

test('UPI links carry merchant, amount and order ID and payment remains owner-verified', async () => {
  const upi = await source('src/utils/upi.ts');
  const payment = await source('src/components/PaymentOptions.tsx');
  const form = await source('src/components/OrderForm.tsx');
  assert.match(upi, /\['tn', `Order \$\{orderId\}`\]/);
  assert.match(upi, /encodeURIComponent/);
  assert.match(payment, /primaryUpiUri\(amount, orderId\)/);
  assert.match(payment, /Copy/);
  assert.match(form, /paymentStatus: 'pending_verification'/);
});

test('staff orders use a safe projection without billing or proof access', async () => {
  const staff = await source('src/components/StaffDashboard.tsx');
  const rules = await source('firestore.rules');
  assert.match(staff, /collection\(db, 'staffOrderViews'\)/);
  assert.doesNotMatch(staff, /subscribeOrderDocuments/);
  assert.match(rules, /Field-level read filtering is\s*\n\s*\/\/ not supported by Firestore rules; staff use staffOrderViews/);
  assert.match(rules, /allow get: if isAdmin\(\) \|\| orderOwner\(\)/);
});
