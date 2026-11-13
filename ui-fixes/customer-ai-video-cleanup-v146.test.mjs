import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.env.ANKUR_CLIENT_APP||process.cwd();
const app=readFileSync(resolve(root,'src/App.tsx'),'utf8');
const nav=readFileSync(resolve(root,'src/components/customer/BottomNav.tsx'),'utf8');
const hub=readFileSync(resolve(root,'src/components/customer/FeatureHub.tsx'),'utf8');
const originalStudio=readFileSync(resolve(root,'src/components/AIVideoStudio.tsx'),'utf8');
const local=readFileSync(new URL('../all-features/reconstruct.py',import.meta.url),'utf8');
const review=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');

test('AI Video route opens only the original Video Idea Builder for owner and customers',()=>{
 // v1.0.72: the bottom-bar AI Video entry became Products (coming soon); AI Video is reached from the Home feature row.
 assert.doesNotMatch(nav,/id: 'ai-video', label: 'AI Video'/);
 assert.match(nav,/id: 'products', label: 'Products'/);
 
 const route=app.match(/\{currentTab === 'ai-video' &&[^\n]*/);
 assert.ok(route);
 assert.match(route[0],/initial="video" allowed=\{\['video'\]\}/);
 assert.doesNotMatch(app,/<AIVideoStudio\b|import \{ AIVideoStudio \}/);
 assert.equal((app.match(/currentTab === 'ai-video'/g)||[]).length,1);
 assert.match(hub,/Generate an actual finished/);
 assert.match(hub,/ankur-video-occasion-grid grid grid-cols-3/);
 assert.match(originalStudio,/export (?:const|function) AIVideoStudio/);
});

test('Home services are owner-gated and the AI Video route remains (reached from the Home feature row)',()=>{
 assert.doesNotMatch(app,/currentTab === 'ai-features'/);
 assert.match(app,/FeatureHub/);
 assert.match(app,/currentTab === 'ai-video'/);
 assert.match(hub,/OWNER_SWITCHED_FEATURES/);
 assert.match(hub,/featureFlags\[f\.id\]===true/);
 assert.match(hub,/grid grid-cols-2 gap-2/);
 for(const id of ['calculator','video','loyalty','catalog','partner','subscriptions','promotions','inventory','reports','faq','rates','support','service-area','referral']) assert.ok(hub.includes("id:'"+id+"'"),id);
});
test('Core booking and privileged dashboards remain wired as before',()=>{
 assert.match(app,/bookingForm=\{\(inlineProduct\)/);
 assert.match(app,/onGoToTrack=\{handleGoToTrack\}/);
 assert.match(app,/<AdminDashboard/);
 assert.match(app,/<StaffDashboard/);
 assert.match(app,/currentTab === 'categories' && \(/);
 assert.match(app,/isOwner=\{role === 'admin'\}/);
});

test('Private review, local reconstruction and v1.0.46 signed APK share the exact cleanup',()=>{
 const p='ui-fixes/customer_ai_video_cleanup_v146.py';
 assert.equal(local.split("'"+p+"'").length-1,1);
 assert.equal(review.split('python3 '+p).length-1,1);
 assert.equal(signed.split('python3 '+p).length-1,1);
 assert.ok(local.indexOf('customer_profile_contact_v145.py')<local.indexOf(p));
 assert.match(signed,/paths: \['release-batches\/\*\.txt'\]/,'only explicit release batch triggers signed APK');
 assert.match(signed,/versionCode 72/);
 assert.match(signed,/versionName "1\.0\.72"/);
});
