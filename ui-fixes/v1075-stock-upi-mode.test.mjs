// v1.0.75 (Ankur, 13 Nov 2026): UPI fallback button, Mode required on confirm,
// 5-account stock ledger with no edit/delete (Spark, client writes only).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.env.ANKUR_CLIENT_APP || process.cwd();
const src = (p) => readFileSync(resolve(root, p), 'utf8');
const overlay = (p) => readFileSync(new URL('./v1065-overlay/' + p, import.meta.url), 'utf8');

test('primary UPI is paytm.s26ykus@pty and a second "Pay with other UPI" button uses 8896332066@paytm', () => {
  const config = src('src/config/businessConfig.ts');
  const payment = src('src/components/PaymentOptions.tsx');
  const upi = src('src/utils/upi.ts');
  assert.match(config, /PRIMARY_UPI_ID = 'paytm\.s26ykus@pty'/);
  assert.match(config, /OTHER_UPI_ID = '8896332066@paytm'/);
  assert.match(upi, /export const otherUpiUri = .*upiUri\(OTHER_UPI_ID/);
  assert.match(payment, /openPay\(primaryUpiUri\(amount, orderId\)\)/);
  assert.match(payment, /openPay\(otherUpiUri\(amount, orderId\)\)/);
  assert.match(payment, /'दूसरी UPI से भरें' : 'Pay with other UPI'/);
  assert.ok(payment.indexOf('primaryUpiUri(amount') < payment.indexOf('otherUpiUri(amount'), 'primary UPI comes first');
  // the old number is never hard-coded on payment screens, only via config
  for (const f of ['src/components/PaymentOptions.tsx', 'src/components/OrderForm.tsx', 'src/components/OrderTrackingView.tsx']) assert.doesNotMatch(src(f), /8896332066@paytm/, f);
});

test('owner cannot confirm a new order until the delivery Mode is set', () => {
  const admin = src('src/components/AdminDashboard.tsx');
  assert.match(admin, /confirmModeError \} from '\.\.\/utils\/orderWorkflow'/);
  assert.match(admin, /if \(newStatus === 'confirmed' && \(!ord\.status \|\| ord\.status === 'pending'\)\) \{\s*const modeError = confirmModeError\(ord\);\s*if \(modeError\) \{\s*setErrorMsg\(/);
  assert.ok(admin.indexOf('const modeError = confirmModeError(ord)') < admin.indexOf('tryInventoryDispatch(ord.orderId, newStatus)'), 'gate runs before any write');
  assert.match(admin, /data-mode-required/);
});

test('stock ledger rules: max 5 accounts, create + read only, no edit or delete for anyone', () => {
  for (const rules of [src('firestore.rules'), overlay('firestore.rules')]) {
    assert.match(rules, /match \/stockLedger\/\{entryId\} \{\s*allow get, list: if canUseStock\(\);\s*allow create: if canUseStock\(\) && isValidStockEntry\(incoming\(\)\);\s*allow update, delete: if false;\s*\}/);
    assert.match(rules, /function canUseStock\(\) \{\s*return isOwner\(\) \|\|\s*\(isRegistryStaff\(\) && exists\(stockAccessPath\(\)\)/);
    assert.match(rules, /incoming\(\)\.emails is list && incoming\(\)\.emails\.size\(\) <= 4/);
    assert.match(rules, /data\.type in \['in', 'out'\]/);
    assert.match(rules, /data\.kg is number && data\.kg > 0 && data\.kg <= 100000/);
    assert.match(rules, /data\.createdBy == request\.auth\.uid/);
    assert.match(rules, /data\.createdAt == request\.time/);
    assert.match(rules, /'active','role','updatedAt','stockAccess'\]/);
    assert.match(rules, /match \/stockAccess\/\{docId\} \{[\s\S]*?allow delete: if false;/);
  }
});

test('stock ledger is client-only (no Cloud Functions) and shown in Godown, staff Stock switch for owner', () => {
  const service = src('src/services/stockLedger.ts');
  const panel = src('src/components/StockLedgerPanel.tsx');
  const admin = src('src/components/AdminDashboard.tsx');
  const staff = src('src/components/StaffDashboard.tsx');
  const manager = src('src/components/owner/StaffMembersManager.tsx');
  assert.doesNotMatch(service + panel, /firebase\/functions|httpsCallable/);
  assert.doesNotMatch(service + panel, /deleteDoc|updateDoc/);
  assert.match(service, /createdBy: user\.uid, createdByName: name, createdAt: serverTimestamp\(\)/);
  assert.match(admin, /activeSection === 'godam'[\s\S]{0,400}<StockLedgerPanel user=\{currentUser\} \/>/);
  assert.match(admin, /initial="inventory" allowed=\{\["inventory"\]\}/);
  assert.match(staff, /<StockLedgerPanel user=\{user\} hideWhenDenied \/>/);
  assert.match(manager, /data-stock-switch/);
  assert.match(manager, /setStockAccess\(row, !on, stockEmails\)/);
  assert.match(panel, /reverseStockEntry/);
});
