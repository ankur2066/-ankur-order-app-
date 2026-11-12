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

test('customer bottom navigation has exactly the four requested tabs',()=>{
 assert.match(nav,/id: 'ai-video', label: 'AI Video'/); // 2026-11-11: customers get AI Video tab
 
 assert.match(nav,/grid-cols-4/);
 assert.match(nav,/isOwner = false/);
 assert.doesNotMatch(app,/currentTab === 'ai-features'/);
 assert.match(css,/ANKUR AI FEATURES NAV v1\.0\.40/);
});

test('Home keeps the daily winner and opens only owner-enabled business tools',()=>{
 // v1.0.66/67 (Ankur 2026-11-11/12): old "AI Features and Services" box replaced by the
 // scrolling HomeFeatureRow; winner/offer/poll moved into the top HomeSlides card.
 const section=app.slice(app.indexOf("{currentTab === 'home' && ("),app.indexOf("currentTab === 'ai-video'"));
 assert.ok(section.length>0);
 assert.match(section,/DailyWinnerBanner/);
 assert.match(section,/HomeSlides/);
 assert.match(section,/HomeFeatureRow/);
 assert.match(section,/FeatureInline/);
 assert.doesNotMatch(section,/'inventory'|'reports'/);
 assert.match(featureHub,/OWNER_SWITCHED_FEATURES/);
 assert.match(featureHub,/featureFlags\[f\.id\]===true/);
 assert.match(featureHub,/grid grid-cols-2 gap-2/);
 assert.match(featureHub,/id:'calculator'/);
 assert.match(app,/currentTab === 'ai-video'/);
 assert.match(app,/currentTab === 'categories' &&/);
 assert.match(app,/isOwner=\{role === 'admin'\}/);
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
 assert.match(signed,/paths: \['release-batches\/\*\.txt'\]/,'only explicit release batch triggers signed APK');
 assert.match(signed,/versionCode 69/);
 assert.match(signed,/versionName "1\.0\.69"/);
});
