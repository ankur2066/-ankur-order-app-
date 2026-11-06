import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.env.ANKUR_CLIENT_APP||process.cwd();
const read=path=>readFileSync(resolve(root,path),'utf8');
const hub=read('src/components/customer/FeatureHub.tsx');
const app=read('src/App.tsx');
const nav=read('src/components/customer/BottomNav.tsx');
const owner=read('src/components/AdminDashboard.tsx');
const panels=read('src/components/customer/FeatureDataPanels.tsx');
const service=readFileSync(new URL('../all-features/backend/featureService.mjs',import.meta.url),'utf8');
const winner=read('src/components/customer/DailyWinner.tsx');
const rules=readFileSync(new URL('../privacy/stage.py',import.meta.url),'utf8');

const defined=['calculator','video','loyalty','catalog','partner','subscriptions',
 'promotions','inventory','reports','faq','rates','support','service-area','referral'];

test('all fourteen feature modules exist without accidentally adding the removed Product navigation',()=>{
 const found=[...hub.matchAll(/\{id:'([a-z-]+)',icon:/g)].map(m=>m[1]);
 assert.deepEqual(found,defined);
 const tabs=[...nav.matchAll(/\{ id: '([^']+)', label:/g)].map(m=>m[1]);
 assert.deepEqual(tabs,['home','my-orders','ai-features','ai-video','profile']);
 assert.match(app,/currentTab === 'ai-features'/);
 assert.match(app,/currentTab === 'ai-video'/);
 assert.match(app,/false && currentTab === 'categories'/);
 assert.doesNotMatch(nav,/id: 'categories'/);
});

test('all approved November customer tiles, separate video and owner-only tools remain available in their intended roles',()=>{
 const section=app.slice(app.indexOf("currentTab === 'ai-features'"),app.indexOf("currentTab === 'ai-video'"));
 for(const id of ['calculator','loyalty','partner','subscriptions','promotions',
   'faq','rates','support','service-area','referral']){
   assert.match(section,new RegExp("'"+id+"'"),'missing customer tile '+id);
 }
 for(const hidden of ["'inventory'","'reports'","'catalog'","'video'"]){
   assert.equal(section.includes(hidden),false,'wrongly exposed restricted/retired customer category '+hidden);
 }
 for(const id of ["id:'inventory'","id:'reports'"])
   assert.match(hub,new RegExp(id+',icon:[^\\n]+owner:true'),'owner only '+id);
 assert.match(owner,/<StaffOrderAccessManager/);
 assert.match(owner,/<UserManagement/);
 assert.match(owner,/<ExpensesView/);
 assert.match(owner,/generateMonthlyPDF/);
 assert.match(app,/<AdminDashboard/);
 assert.match(app,/<StaffDashboard/);
});

test('server-backed tools are wired to real callables but never silently enabled',()=>{
 const callableActions=['promoBooking','preferences','referralClaim','referralReview',
   'partnerApply','partnerApprove','bulkRequest','bulkQuote','subscriptionRequest',
   'subscriptionPause','subscriptionApprove','runSubscription','stockOpening',
   'stockAdjust','stockDispatch','stockMapping','eta','promoSave'];
 for(const action of callableActions)
  assert.ok(service.includes("action==='"+action+"'"),'missing trusted backend: '+action);
 for(const id of ['loyalty','partner','subscriptions','promotions','inventory','reports','referral'])
  assert.match(panels,new RegExp("id==='"+id+"'"),'missing feature panel '+id);
 assert.match(service,/config\.data\(\)\?\.enabled!==true/);
 assert.match(service,/Feature suite not enabled/);
 assert.match(panels,/Feature setup is pending/);
 assert.match(panels,/ankurFeatureAction/);
 assert.match(panels,/no automatic charge/i);
});

test('winner remains opt-in and staff cannot read raw phone-bearing canonical records',()=>{
 assert.match(winner,/ankurWinnerConsent/);
 assert.match(winner,/winnerPublicConsent/);
 assert.match(winner,/dailyWinners/);
 assert.match(rules,/legacyStaffReadWillBeRemoved/);
 assert.match(rules,/staffOrderViews/);
 assert.match(rules,/canUpdateStatus\(\) \{ return false; \}/);
});
