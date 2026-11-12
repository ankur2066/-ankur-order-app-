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
  // v1.0.66 hotfix: an unchanged total must match the formula; a changed total is
  // only for a wholesale order whose buyer profile is wholesale (owner exempt).
  assert.match(rules, /\(isAmountChanged \|\| withinPaisa\(data\.totalAmount, formulaTotal\)\)/);
  assert.match(rules, /data\.customerType == 'wholesale' && \(isAdmin\(\) \|\| ptype == 'wholesale'\)/);
  assert.doesNotMatch(rules, /!isAmountChanged \&\& \(data\.totalAmount == formulaTotal/);
});

test('v1.0.66 hotfix: missing users/{uid} reads as retail, customers cannot self-verify payment, push paths kept', () => {
  assert.match(rules, /isSignedIn\(\) && exists\(userDocPath\(\)\) \? userData\(\)\.get\('customerType', 'retail'\) : 'retail'/);
  assert.doesNotMatch(rules, /let profile = /);
  assert.equal(rules.match(/\(isAdmin\(\) \|\| (?:incoming\(\)|request\.resource\.data)\.paymentStatus == 'pending_verification'\)/g)?.length, 2); // 0ac167b inlined incoming() in order create (expression budget)
  for (const path of ['push_owner_devices/{deviceId}', 'push_team_devices/{uid}/devices/{deviceId}', 'order_push_subscriptions/{trackingToken}/devices/{deviceId}']) {
    assert.ok(rules.includes('match /' + path), path);
  }
  // Older installed apps never write staffOrderViews; orders create must not require it.
  const orders = rules.indexOf('match /orders/{orderId}');
  const create = rules.slice(rules.indexOf('allow create', orders), rules.indexOf('allow update', orders));
  assert.doesNotMatch(create, /staffOrderViews/);
});
