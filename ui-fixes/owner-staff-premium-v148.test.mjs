import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=process.env.ANKUR_CLIENT_APP||process.cwd();
const app=readFileSync(resolve(root,'src/App.tsx'),'utf8');
const admin=readFileSync(resolve(root,'src/components/AdminDashboard.tsx'),'utf8');
const staff=readFileSync(resolve(root,'src/components/StaffDashboard.tsx'),'utf8');
const css=readFileSync(resolve(root,'src/index.css'),'utf8');
const tokens=readFileSync(resolve(root,'src/theme/designTokens.ts'),'utf8');
const local=readFileSync(new URL('../all-features/reconstruct.py',import.meta.url),'utf8');
const review=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');

// v1.0.67 (Ankur, 12 Nov 2026): the owner dashboard moved from 3 destinations (Orders, Customers, Tools sheet)
// to 5 (Today's work, Customers, Godown, Money, Settings). Same functions, stricter checks below.
test('Owner UI keeps five destinations (Today, Customers, Godown, Money, Settings) and every function',()=>{
 assert.match(admin,/ankur-owner-dashboard/);
 assert.match(admin,/ankur-owner-masthead/);
 assert.match(admin,/ankur-owner-overview/);
 assert.match(admin,/BUSINESS COMMAND CENTER/);
 assert.match(admin,/setActiveSection\('orders'\)/);
 assert.match(admin,/setActiveSection\('customers'\)/);
 assert.match(admin,/setActiveSection\('tools'\)/);
 for(const [tab,label] of [['today',"Today's work"],['customers','Customers'],['godam','Godown'],['money','Money'],['settings','Settings']]){
   assert.ok(admin.includes(`['${tab}', `)&&(admin.includes(`'${label}'`)||admin.includes(`"${label}"`)),'owner destination missing: '+label);
 }
 assert.match(admin,/owner-five-nav/);
 assert.match(admin,/aria-pressed=\{ownerTab === id\}/);
 // Today's work: two counts and the four daily buttons.
 for(const s of ["Today's orders","Today's packing (kg)",'Packing by stop','Dispatch and bus slip','New Entry','id="owner-packing"','id="owner-dispatch"']) assert.ok(admin.includes(s),'today item missing: '+s);
 // Customers, Godown, Money, Settings route to the same existing screens.
 assert.match(admin,/allowed=\{\[customerPanel\]\}/);
 assert.match(admin,/initial="inventory" allowed=\{\["inventory"\]\}/);
 assert.match(admin,/allowed=\{\["reports"\]\}/);
 assert.match(admin,/setActiveSection\('insights'\)/);
 assert.match(admin,/setActiveSection\('expenses'\)/);
 assert.match(admin,/setIsRateModalOpen\(true\)/);
 assert.match(admin,/allowed=\{\["loyalty","promotions","referral","catalog"\]\}/);
 assert.match(admin,/allowed=\{\["video"\]\}/);
 for(const id of ['users','staff','bus-stops','storefront','ai-chat']) assert.ok(admin.includes(`['${id}',`),'settings entry missing: '+id);
 for(const g of ['Offers and rewards','Staff and bus stops','Store look','Customer app buttons (on/off)']) assert.ok(admin.includes(g),'settings group missing: '+g);
 assert.equal((admin.match(/<details className="owner-settings-group">/g)||[]).length,4);
 // Every screen the old Tools sheet opened is still reachable.
 for(const s of ["activeSection === 'new-entry'","activeSection === 'insights'","activeSection === 'expenses'","activeSection === 'users'","activeSection === 'storefront'","activeSection === 'ai-chat'","activeSection === 'bus-stops'","activeSection === 'staff'","activeSection === 'customers'"]) assert.ok(admin.includes(s),'screen missing: '+s);
 for(const s of ['<BusStopSettings','<StaffMembersManager','<CustomersView','<StaffOrderAccessManager','<DailyWinnerOwnerControls','<HomeSlidesOwnerControls','<PackingBoard','handleOrdersCsv','signOutUser()','onGoToTrack']) assert.ok(admin.includes(s),'owner function removed: '+s);
 for(const feature of ['<OwnerStorefrontManager','<UserManagement','<ExpensesView','<AIChat','<FeatureSuiteSettings','downloadOrdersCsv','generateMonthlyPDF','writeBatch(db)','<SignInScreen']){
   assert.ok(admin.includes(feature)||(feature==='<SignInScreen'&&admin.includes('as={SignInScreen}')),'owner feature removed: '+feature);
 }
 assert.match(app,/<AdminDashboard/);
 assert.doesNotMatch(admin,/onOpenRulesReview/);
});

test('Soft 3D theme tokens cover light, dark, raised cards and fixed status colours',()=>{
 assert.match(tokens,/#F4F5F7/);
 assert.match(tokens,/#14161C/);
 assert.match(tokens,/#1E2129/);
 assert.match(tokens,/radius:/);
 assert.match(tokens,/shadow:/);
 assert.match(tokens,/spacing:/);
 for(const state of ['total','pending','confirmed','packing','dispatch','delivered']) assert.match(tokens,new RegExp(state+':'));
 assert.match(css,/soft-card/);
 assert.match(css,/soft-button/);
 assert.match(css,/safe-area/);
});

test('Staff order list never shows every phone number or permits phone searching',()=>{
 assert.doesNotMatch(staff,/कॉल: \{ord\.customerPhone\}/);
 assert.doesNotMatch(staff,/phoneMatch|customerPhone \|\| ''\)\.includes\(q\)/);
 assert.match(staff,/contactKey = \(staffSource\(ord\) \|\| 'unknown'\)/);
 assert.match(staff,/contact\?\.key === key/);
 assert.match(staff,/setContact\(\{ key, phone: data\.phone \}\)/);
 assert.match(staff,/window\.setTimeout\(\(\) => \{\s*contactVersion\.current \+= 1;/);
 assert.match(staff,/document\.visibilityState === 'hidden'/);
 assert.doesNotMatch(staff,/customerPhone: value\.customerPhone/);
 assert.match(staff,/डायल करें/);
 assert.match(staff,/WhatsApp/);
 assert.match(css,/ANKUR STAFF CONTACT PRIVACY 1\.0\.48/);
});

test('Staff reads redacted order projections while status and role permissions stay intact',()=>{
 assert.match(staff,/if \(!canView\)/);
 assert.match(staff,/if \(!canUpdate\)/);
 assert.match(staff,/collection\(db, 'staffOrderViews'\)/);
 assert.doesNotMatch(staff,/subscribeOrderDocuments\(/);
 // v1.0.66 Spark: staff status goes through a rules-enforced client batch, not the Blaze callable.
 assert.doesNotMatch(staff,/ankurStaffUpdateOrderStatus/);
 assert.match(staff,/statusSyncPending: true/);
 assert.match(staff,/setOrders\(list\)/);
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
