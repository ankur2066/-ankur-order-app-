import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const overlayRules = new URL('./v1065-overlay/firestore.rules', import.meta.url);
const rules = fs.readFileSync(overlayRules, 'utf8');
test('customer documents are +91 mobile keyed and owner-only listable', () => {
  assert.match(rules, /match \/customers\/\{phoneId\}/);
  assert.match(rules, /allow list: if isAdmin\(\)/);
  assert.match(rules, /resource\.data\.uid == request\.auth\.uid/);
  assert.match(rules, /phoneId\.matches\('\^\\\\\+91\[6-9\]\[0-9\]\{9\}\$'\)/);
});
test('customer create and update enforce self ownership and narrow field changes', () => {
  assert.match(rules, /incoming\(\)\.uid == request\.auth\.uid/);
  assert.match(rules, /incoming\(\)\.tag == 'New'/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\['name','lastLoginAt','orderCount'\]\)/);
});
test('retail orders cannot submit a changed amount', () => {
  assert.match(rules, /!isAmountChanged \&\& \(data\.totalAmount == formulaTotal/);
  assert.match(rules, /data\.customerType == 'wholesale' \&\& profile\.customerType == 'wholesale'/);
});
