import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.env.ANKUR_CLIENT_APP||process.cwd();
const nav=readFileSync(resolve(root,'src/components/customer/BottomNav.tsx'),'utf8');
const app=readFileSync(resolve(root,'src/App.tsx'),'utf8');
const home=readFileSync(resolve(root,'src/components/customer/CustomerHome.tsx'),'utf8');
const featureHub=readFileSync(resolve(root,'src/components/customer/FeatureHub.tsx'),'utf8');
const css=readFileSync(resolve(root,'src/index.css'),'utf8');
const local=readFileSync(new URL('../all-features/reconstruct.py',import.meta.url),'utf8');
const review=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');

test('customer bottom navigation includes a real fifth AI Features tab in the intended position',()=>{
 const tabs=[...nav.matchAll(/\{ id: '([^']+)', label:/g)].map(m=>m[1]);
 assert.deepEqual(tabs,['home','my-orders','ai-features','ai-video','profile']);
 assert.match(nav,/grid-cols-5/);
 assert.match(nav,/label: 'AI Features'/);
 assert.match(nav,/Sparkles/);
 assert.doesNotMatch(nav,/id: 'categories'/);
 assert.match(app,/currentTab === 'ai-features'/);
 assert.match(css,/ANKUR AI FEATURES NAV v1\.0\.40/);
});

test('AI Features shows one full-width winner strip then existing two-column tools without a fake result',()=>{
 const section=app.slice(app.indexOf("currentTab === 'ai-features'"),app.indexOf("currentTab === 'ai-video'"));
 assert.match(section,/ankur-daily-winner/);
 assert.match(section,/आज का Lucky Winner/);
 assert.match(section,/winner\?\.active/);
 assert.match(section,/winner\.name/);
 assert.match(section,/winner\.city/);
 assert.match(section,/विजेता घोषित होने पर/);
 assert.match(section,/allowed=\{\['calculator'/);
 assert.doesNotMatch(section,/'inventory'|'reports'|'video'|'catalog'/);
 assert.match(section,/'rates'/);
 assert.match(featureHub,/grid grid-cols-2 gap-2/);
 assert.match(featureHub,/id:'calculator'/);
 assert.match(app,/currentTab === 'ai-video'/);
 assert.match(app,/false && currentTab === 'categories'/);
});

test('existing Home booking and owner/staff workflows remain routed unchanged',()=>{
 assert.match(home,/bookingForm\(null\)/);
 assert.doesNotMatch(home,/aqp-top-product-picker|Ice calculator and rate card/);
 assert.match(app,/bookingForm=\{\(inlineProduct\)/);
 assert.match(app,/onGoToTrack=\{handleGoToTrack\}/);
 assert.match(app,/role === 'admin'/);
 assert.match(app,/<AdminDashboard/);
 assert.match(app,/<StaffDashboard/);
});

test('local reconstruction, private review and signed APK apply the same UI patch',()=>{
 const name='ui-fixes/customer_features_nav_v140.py';
 assert.equal(local.split("'"+name+"'").length-1,1);
 assert.equal(review.split('python3 '+name).length-1,1);
 assert.equal(signed.split('python3 '+name).length-1,1);
 assert.ok(local.indexOf('customer_home_clean_v139.py')<local.indexOf(name));
 assert.ok(signed.split('permissions:')[0].includes("'"+name+"'"));
 assert.match(signed,/versionCode 47/);
 assert.match(signed,/versionName "1\.0\.47-season-test"/);
});
