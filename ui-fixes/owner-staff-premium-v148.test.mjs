import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=process.env.ANKUR_CLIENT_APP||process.cwd();
const app=readFileSync(resolve(root,'src/App.tsx'),'utf8');
const admin=readFileSync(resolve(root,'src/components/AdminDashboard.tsx'),'utf8');
const staff=readFileSync(resolve(root,'src/components/StaffDashboard.tsx'),'utf8');
const css=readFileSync(resolve(root,'src/index.css'),'utf8');
const local=readFileSync(new URL('../all-features/reconstruct.py',import.meta.url),'utf8');
const review=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');

test('Premium owner UI keeps all 7 original destinations and all key functions',()=>{
 assert.match(admin,/ankur-owner-dashboard/);
 assert.match(admin,/ankur-owner-masthead/);
 assert.match(admin,/ankur-owner-nav/);
 assert.match(admin,/ankur-owner-overview/);
 assert.match(admin,/BUSINESS COMMAND CENTER/);
 for(const id of ['new-entry','orders','insights','expenses','users','storefront','ai-chat']){
   assert.match(admin,new RegExp("setActiveSection\\('"+id+"'\\)"),'missing owner tab '+id);
 }
 for(const feature of ['<OwnerStorefrontManager','<UserManagement','<ExpensesView','<AIChat','downloadOrdersCsv','generateMonthlyPDF','writeBatch(db)','<SignInScreen']){
   assert.ok(admin.includes(feature),'owner feature removed: '+feature);
 }
 assert.match(app,/<AdminDashboard/);
 assert.doesNotMatch(admin,/onOpenRulesReview/);
});

test('Premium design owner scoped, balanced tab grid and clear contrast',()=>{
 assert.match(css,/ANKUR OWNER PREMIUM 1\.0\.48/);
 assert.match(css,/\.ankur-owner-dashboard \.ankur-owner-nav/);
 assert.match(css,/grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
 assert.match(css,/>button:nth-child\(n\+4\)\{grid-column:span 3!important;\}/);
 assert.match(css,/\.ankur-owner-masthead h2/);
 assert.match(css,/background:radial-gradient\(ellipse 100% 40% at 100% 0%/);
 assert.match(css,/\.ankur-owner-dashboard :is\(\.text-slate-950/);
 assert.doesNotMatch(css,/\.ankur-owner-premium/);
});

test('Staff order list never shows every phone number or permits phone searching',()=>{
 assert.doesNotMatch(staff,/कॉल: \{ord\.customerPhone\}/);
 assert.doesNotMatch(staff,/phoneMatch|customerPhone \|\| ''\)\.includes\(q\)/);
 assert.match(staff,/revealedContactOrderId === ord\.orderId/);
 assert.match(staff,/aria-expanded=\{revealedContactOrderId === ord\.orderId\}/);
 assert.match(staff,/setRevealedContactOrderId\(current => current === orderId \? null : orderId\)/);
 assert.match(staff,/window\.setTimeout\(\(\) => setRevealedContactOrderId\(null\), 15000\)/);
 assert.match(staff,/document\.visibilityState === 'hidden'/);
 assert.match(staff,/\{ord\.customerPhone\}/);
 assert.match(staff,/डायल करें/);
 assert.match(staff,/WhatsApp/);
 assert.match(css,/ANKUR STAFF CONTACT PRIVACY 1\.0\.48/);
});

test('Order status & staff role permissions kept intact; do not imply data read security',()=>{
 assert.match(staff,/if \(!canView\)/);
 assert.match(staff,/if \(!canUpdate\)/);
 assert.match(staff,/subscribeOrderDocuments\(/);
 assert.match(staff,/batch\.commit\(\)/);
 assert.match(staff,/setOrders\(activeList\)/);
 assert.match(staff,/handleSelfPickup/);
 assert.match(app,/<StaffDashboard/);
});

test('Both overlays applied in review and reproducible local source; signed APK gated on batch marker',()=>{
 for(const script of ['ui-fixes/owner_premium_v148.py','ui-fixes/staff_contact_privacy_v148.py']){
  assert.equal(local.split("'"+script+"'").length-1,1);
  assert.equal(review.split('python3 '+script).length-1,1);
  assert.equal(signed.split('python3 '+script).length-1,1);
 }
 assert.ok(local.indexOf('dispatch_rules_privacy_v147.py')<local.indexOf('owner_premium_v148.py'));
 assert.ok(local.indexOf('owner_premium_v148.py')<local.indexOf('staff_contact_privacy_v148.py'));
 assert.match(signed,/paths: \['release-batches\/\*\.txt'\]/);
});
