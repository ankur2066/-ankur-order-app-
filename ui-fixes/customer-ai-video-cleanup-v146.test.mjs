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

test('AI Video bottom tab opens only the original Video Idea Builder',()=>{
 assert.match(nav,/id: 'ai-video', label: 'AI Video'/);
 const route=app.match(/\{currentTab === 'ai-video' &&[^\n]*/);
 assert.ok(route);
 assert.match(route[0],/initial="video" allowed=\{\['video'\]\}/);
 assert.doesNotMatch(app,/<AIVideoStudio\b|import \{ AIVideoStudio \}/);
 assert.equal((app.match(/currentTab === 'ai-video'/g)||[]).length,1);
 assert.match(hub,/Generate an actual finished/);
 assert.match(hub,/ankur-video-occasion-grid grid grid-cols-3/);
 assert.match(originalStudio,/export (?:const|function) AIVideoStudio/);
});

test('AI Features shows all ten non-owner customer tools, no second video tile',()=>{
 const section=app.slice(app.indexOf("currentTab === 'ai-features'"),app.indexOf("currentTab === 'ai-video'"));
 const a=section.match(/allowed=\{\[([^\]]+)\]\}/);
 assert.ok(a,'allowed customer tools');
 const ids=[...a[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
 assert.deepEqual(ids,['calculator','loyalty','partner','subscriptions','promotions','faq','rates','support','service-area','referral']);
 assert.ok(!ids.includes('video') && !ids.includes('catalog') && !ids.includes('inventory') && !ids.includes('reports'));
 assert.match(section,/<DailyWinnerBanner currentUser=\{currentUser\} \/>/);
 const winnerComponent=readFileSync(resolve(root,'src/components/customer/DailyWinner.tsx'),'utf8');
 assert.match(winnerComponent,/ankur-daily-winner/);
 assert.match(hub,/grid grid-cols-2 gap-2/);
});

test('Core booking and privileged dashboards remain wired as before',()=>{
 assert.match(app,/bookingForm=\{\(inlineProduct\)/);
 assert.match(app,/onGoToTrack=\{handleGoToTrack\}/);
 assert.match(app,/<AdminDashboard/);
 assert.match(app,/<StaffDashboard/);
 assert.match(app,/false && currentTab === 'categories' && \(/);
});

test('Private review, local reconstruction and v1.0.46 signed APK share the exact cleanup',()=>{
 const p='ui-fixes/customer_ai_video_cleanup_v146.py';
 assert.equal(local.split("'"+p+"'").length-1,1);
 assert.equal(review.split('python3 '+p).length-1,1);
 assert.equal(signed.split('python3 '+p).length-1,1);
 assert.ok(local.indexOf('customer_profile_contact_v145.py')<local.indexOf(p));
 assert.match(signed,/paths: \['release-batches\/\*\.txt'\]/,'only explicit release batch triggers signed APK');
 assert.match(signed,/versionCode 52/);
 assert.match(signed,/versionName "1\.0\.52-private-test"/);
});
