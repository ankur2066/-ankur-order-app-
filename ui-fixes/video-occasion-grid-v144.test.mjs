import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.env.ANKUR_CLIENT_APP||process.cwd();
const hub=readFileSync(resolve(root,'src/components/customer/FeatureHub.tsx'),'utf8');
const css=readFileSync(resolve(root,'src/index.css'),'utf8');
const app=readFileSync(resolve(root,'src/App.tsx'),'utf8');
const home=readFileSync(resolve(root,'src/components/customer/CustomerHome.tsx'),'utf8');
const local=readFileSync(new URL('../all-features/reconstruct.py',import.meta.url),'utf8');
const review=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');

test('24 occasion choices with legacy options kept but Dry Ice Supply removed',()=>{
 const menu=hub.match(/const VIDEO_OCCASIONS = \[([\s\S]*?)\] as const;/);
 assert.ok(menu,'typed occasion list');
 const ids=[...menu[1].matchAll(/\{id:'([^']+)'/g)].map(x=>x[1]);
 assert.equal(ids.length,24);
 assert.equal(new Set(ids).size,24);
 for(const id of ['wedding','stage','engagement','birthday','cocktail','reception','haldi','mehndi','sangeet','dj-night','corporate','anniversary','ring-ceremony','bride-entry','groom-entry','couple-dance','baby-shower','college-fest','school-function','product-launch','opening','awards','new-year','other']){
   assert.ok(ids.includes(id),'missing '+id);
 }
 assert.doesNotMatch(menu[1],/Dry Ice Supply|ड्राई आइस सप्लाई/);
});

test('tapping Occasion opens accessible 3-per-row choice grid, not native one-option-per-line picker',()=>{
 assert.match(hub,/id="ankur-video-occasion"/);
 assert.match(hub,/aria-expanded=\{occasionOpen\}/);
 assert.match(hub,/setOccasionOpen\(open=>!open\)/);
 assert.match(hub,/aria-pressed=\{occasion===item\.id\}/);
 assert.match(hub,/onClick=\{\(\)=>\{setOccasion\(item\.id\);setOccasionOpen\(false\);\}\}/);
 assert.doesNotMatch(hub,/<select id="ankur-video-occasion"/);
 assert.match(css,/ANKUR VIDEO OCCASION GRID v1\.0\.44/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/max-height: min\(65vh, 610px\)/);
});

test('prompt, local contact, timing, booking and owner behavior unchanged',()=>{
 assert.match(hub,/Generate an actual finished/);
 assert.match(hub,/Render and return a playable video/);
 assert.match(hub,/\[duration,setDuration\]=useState\(30\)/);
 assert.match(hub,/localStorage\.setItem\(storageKey,JSON\.stringify\(next\)\)/);
 assert.match(hub,/Copy Prompt/);
 assert.match(hub,/Open Gemini/);
 assert.match(home,/bookingForm\(null\)/);
 assert.match(app,/bookingForm=\{\(inlineProduct\)/);
 assert.match(app,/<AdminDashboard/);
 assert.match(app,/<StaffDashboard/);
});

test('same occasion grid patch applied locally, in review and in signed v1.0.44',()=>{
 const p='ui-fixes/video_occasion_grid_v144.py';
 assert.equal(local.split("'"+p+"'").length-1,1);
 assert.equal(review.split('python3 '+p).length-1,1);
 assert.equal(signed.split('python3 '+p).length-1,1);
 assert.ok(local.indexOf('video_idea_profile_v141.py')<local.indexOf(p));
 assert.ok(signed.split('permissions:')[0].includes("'"+p+"'"));
 assert.match(signed,/versionCode 44/);
 assert.match(signed,/versionName "1\.0\.44-season-test"/);
});
