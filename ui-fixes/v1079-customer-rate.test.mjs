// v1.0.79 (Ankur, 17 Nov 2026): wholesale rates differ per customer (₹35, ₹30, ₹28/kg).
// The owner sets a customer's own rate on Customers; that customer's orders use it
// automatically. Stored on users/{uid}.customRatePerKg, which the existing rules let
// only the owner write and the customer only read, so firestore.rules is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const overlay = (p) => readFileSync(new URL('./v1065-overlay/' + p, import.meta.url), 'utf8');
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

test('owner Customers cards carry a Rate (₹/kg) editor: ₹35/₹30/₹28 chips, custom field, Default rate', () => {
  const cv = overlay('src/components/owner/CustomersView.tsx');
  const rate = overlay('src/utils/customerRate.ts');
  assert.match(rate, /CUSTOM_RATE_CHIPS = \[35, 30, 28\] as const/);
  assert.match(rate, /CUSTOM_RATE_FIELD = 'customRatePerKg'/);
  assert.match(cv, /export function CustomerRateEditor/);
  assert.match(cv, /CUSTOM_RATE_CHIPS\.map/);
  assert.match(cv, /aria-label="Custom rate per kg"/);
  assert.match(cv, />Default rate<\/button>/);
  // Saved to the customer's own profile; "Default rate" removes the field (no other data touched).
  assert.match(cv, /setDoc\(doc\(db, 'users', uid\), \{ \[CUSTOM_RATE_FIELD\]: rate === null \? deleteField\(\) : rate, customRateUpdatedAt: serverTimestamp\(\) \}, \{ merge: true \}\)/);
  assert.doesNotMatch(cv, /deleteDoc/);
  // Editor on both the All-customers and the Customer-login cards; only the owner can edit.
  assert.equal(cv.split('<CustomerRateEditor uid={c.uid}').length - 1, 2);
  assert.match(cv, /const canEditRate = isUserAdmin\(user\);/);
});

test('the logged-in customer order uses their own rate automatically and shows the special-rate line', () => {
  const f = overlay('src/components/OrderForm.tsx');
  assert.match(f, /setCustomRate\(parseCustomRate\(profile\?\.\[CUSTOM_RATE_FIELD\]\)\)/);
  assert.match(f, /const activeDryIceRate = effectiveDryIceRate\(customerType, rates, customRate\);/);
  // The booked rate and subtotal stored on the order come from activeDryIceRate.
  assert.match(f, /dryIcePricePerKg: activeDryIceRate \|\| 0,/);
  assert.match(f, /finalQuantityKg \* \(activeDryIceRate \|\| 0\)/);
  assert.match(f, /\{customRateLine\(customRate\)\}/);
  assert.match(overlay('src/utils/customerRate.ts'), /आपका खास रेट: ₹\$\{rate\}\/kg/);
  // No code to type, and the customer never writes the rate.
  assert.doesNotMatch(f, /customRatePerKg\s*:/);
});

test('owner order views show the booked rate; owner-entered orders use the customer rate too', () => {
  const a = overlay('src/components/AdminDashboard.tsx');
  assert.ok(a.split('data-order-rate').length - 1 >= 3, 'new-order card and both order lists show the rate');
  assert.match(a, /effectiveDryIceRate\(customerType, rates, rateUser\?\.data\(\)\[CUSTOM_RATE_FIELD\]\)/);
  assert.match(overlay('src/components/owner/CustomersView.tsx'), /orderRateLabel\(o\)/);
});

test('rules unchanged: customers cannot write their own rate; only the owner writes users docs', () => {
  assert.match(rules, /incoming\(\)\.keys\(\)\.hasOnly\(\['customerName', 'customerPhone', 'city', 'updatedAt', 'customerType'\]\)/);
  assert.match(rules, /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly\(\['customerName', 'customerPhone', 'city', 'updatedAt'\]\)/);
  assert.match(rules, /allow create, update, delete: if isAdmin\(\);\n    \}/);
  assert.doesNotMatch(rules, /customRatePerKg/);
  // Order rules already accept any booked dry-ice rate whose subtotal matches (no new order field).
  assert.match(rules, /withinPaisa\(data\.dryIceSubtotal, data\.quantityKg \* data\.dryIcePricePerKg\)/);
});

test('v1.0.79 utility is installed into the reconstructed app', () => {
  const audit = readFileSync(new URL('./release-audit-v1065.py', import.meta.url), 'utf8');
  assert.match(audit, /"src\/utils\/customerRate\.ts", "src\/utils\/customerRate\.test\.ts"/);
});
