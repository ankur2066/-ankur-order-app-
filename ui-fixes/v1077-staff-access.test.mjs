// v1.0.77 (Ankur, 16 Nov 2026: "सारा access de do staff ko bas kuch delete na ho"):
// staff get the owner dashboard (create/update everywhere) but can never delete,
// and the owner-only admin areas stay owner-only. Source + rules contracts; the
// real-render check is in ui-fixes/i18n/screens.test.mjs and the emulator check
// in tests/firestore.rules.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.env.ANKUR_CLIENT_APP || process.cwd();
const src = (p) => readFileSync(resolve(root, p), 'utf8');
const overlay = (p) => readFileSync(new URL('./v1065-overlay/' + p, import.meta.url), 'utf8');

test('staff open the owner dashboard; the delivery role keeps its own dashboard', () => {
  for (const app of [src('src/App.tsx'), overlay('src/App.tsx')]) {
    const staffBranch = app.slice(app.indexOf("if (role === 'staff') {"), app.indexOf('// ---- Delivery: locked to their dashboard'));
    assert.ok(staffBranch.length > 100, 'staff branch exists before the delivery branch');
    assert.match(staffBranch, /<AdminDashboard[\s\S]*?staffAccess[\s\S]*?\/>/);
    assert.doesNotMatch(staffBranch, /<StaffDashboard/);
    assert.match(app, /if \(isFieldTeam\) \{[\s\S]*?<StaffDashboard/);
  }
});

test('owner dashboard: canDelete is owner-only and gates every delete; owner-only admin hidden from staff', () => {
  for (const admin of [src('src/components/AdminDashboard.tsx'), overlay('src/components/AdminDashboard.tsx')]) {
    assert.match(admin, /const isOwner = isUserAdmin\(currentUser\);\s*const isAdmin = isOwner \|\| staffAccess;\s*const canDelete = isOwner;/);
    assert.equal((admin.match(/\) : canDelete && \(\s*<button\s*data-owner-delete/g) || []).length, 2, 'both Delete Order menu items need canDelete');
    assert.match(admin, /\{canDelete && orderToTrash && \(/);
    assert.match(admin, /const handleMoveToTrash = async \(ord: Order\) => \{\s*if \(!canDelete\) return;/);
    assert.match(admin, /activeSection === 'staff' && isOwner && <StaffMembersManager \/>/);
    assert.match(admin, /\{isOwner && <StaffOrderAccessManager \/>\}/);
    assert.match(admin, /\{isOwner && <UserManagement \/>\}/);
    assert.match(admin, /\{isOwner && <details className="owner-settings-group"><summary className="font-bold p-2">Customer app buttons \(on\/off\)<\/summary>\s*<FeatureSuiteSettings \/>/);
    assert.match(admin, /<ExpensesView canDelete=\{canDelete\} \/>/);
    assert.match(admin, /<OwnerStorefrontManager canDelete=\{canDelete\} \/>/);
    assert.match(admin, /<BusStopSettings canDelete=\{canDelete\} \/>/);
    assert.doesNotMatch(admin, /deleteDoc/);
  }
});

test('every delete button in staff-reachable screens is behind canDelete', () => {
  const expenses = overlay('src/components/ExpensesView.tsx');
  assert.match(expenses, /\{canDelete && <UI as="button" type="button" data-owner-delete onClick=\{\(\) => handleDeleteExpense\(exp\.id\)\}/);
  assert.match(expenses, /const handleDeleteExpense = async \(id: string\) => \{\s*if \(!canDelete\) return;/);
  const store = overlay('src/components/OwnerStorefrontManager.tsx');
  assert.match(store, /\{canDelete && <button type="button" data-owner-delete onClick=\{\(\) => handleDelete\(p\)\}/);
  assert.match(store, /\{canDelete && <button type="button" data-owner-delete onClick=\{\(\) => setBanners/);
  assert.match(store, /\{canDelete && <button type="button" data-owner-delete onClick=\{resetBanners\}/);
  assert.match(store, /const resetBanners = async \(\) => \{\s*if \(!canDelete\) return;/);
  assert.equal((store.match(/deleteDoc\(/g) || []).length, 2, 'only the two owner-gated deletes');
  const stops = overlay('src/components/owner/BusStopSettings.tsx');
  assert.match(stops, /\{canDelete && <button type="button" data-owner-delete className="soft-button secondary-button" onClick=\{\(\) => removeMapping\(key\)\}/);
  assert.ok(readFileSync(new URL('./release-audit-v1065.py', import.meta.url), 'utf8').includes('"src/components/ExpensesView.tsx"'), 'ExpensesView overlay is installed');
});

test('rules: staff = owner create/update; every delete owner-only or false; owner-only admin stays owner-only', () => {
  const rules = overlay('firestore.rules');
  assert.equal(src('firestore.rules'), rules, 'root rules = overlay rules');
  assert.match(rules, /function isOps\(\) \{\s*return isOwner\(\) \|\| isStaff\(\);\s*\}/);
  // isAdmin() is still only the verified owner account.
  assert.match(rules, /function isAdmin\(\) \{\s*return isOwner\(\);\s*\}/);
  // (push_team_devices: a team member un-registers only their OWN phone's push token; no business data.)
  for (const line of rules.split('\n').filter((l) => /allow [^:]*delete/.test(l) && !l.includes('isValidId(deviceId) &&'))) {
    assert.doesNotMatch(line, /isStaff\(\)|isOps\(\)|isFieldTeam\(\)|isRegistryStaff\(\)|canViewOrders\(\)|canUpdateStatus\(\)/, 'delete never granted to staff: ' + line.trim());
    if (/allow (read, )?write/.test(line)) assert.match(line, /if false/);
  }
  assert.doesNotMatch(rules, /allow read, write: if isAdmin\(\)|allow write: if [^\n]*isStaff/);
  // owner-only admin areas
  assert.match(rules, /match \/staffMembers\/\{phoneId\} \{\s*allow read: if isAdmin\(\);\s*allow create, update: if isAdmin\(\)/);
  assert.match(rules, /match \/staffEmails\/\{email\} \{[\s\S]*?allow create, update: if isAdmin\(\) &&/);
  assert.match(rules, /match \/staffRequests\/\{requestUid\} \{[\s\S]*?allow list: if isAdmin\(\);[\s\S]*?allow update, delete: if isAdmin\(\);/);
  assert.match(rules, /match \/stockAccess\/\{docId\} \{\s*allow get, list: if isAdmin\(\);\s*allow create, update: if isAdmin\(\) && docId == 'members'/);
  assert.match(rules, /allow create, update, delete: if isAdmin\(\);\n    \}\n\n    \/\/ 5c\./, 'users/{uid} role writes owner-only');
  assert.match(rules, /\(isAdmin\(\) \|\| \(isStaff\(\) && settingId != 'featureSuite' && staffKeepsSettings\(settingId\)\)\)/);
  // staff never trash (soft delete) and never blank a record
  assert.match(rules, /incoming\(\)\.updatedAt == request\.time &&\s*\(isAdmin\(\) \|\| staffNotTrashing\(\)\)\) \|\|/);
  assert.match(rules, /allow update: if isAdmin\(\) \|\| \(isStaff\(\) && staffNotTrashing\(\)\) \|\|/);
  assert.match(rules, /allow update: if isAdmin\(\) \|\| \(isStaff\(\) && staffKeepsFields\(\[\]\)\);/);
  assert.match(rules, /isStaff\(\) && incoming\(\)\.phone == phoneId && staffKeepsFields\(\['defaultBusStopId'\]\)/);
  // stock ledger unchanged: still the owner's 5-account list, still no edit/delete
  assert.match(rules, /match \/stockLedger\/\{entryId\} \{\s*allow get, list: if canUseStock\(\);\s*allow create: if canUseStock\(\) && isValidStockEntry\(incoming\(\)\);\s*allow update, delete: if false;\s*\}/);
});
