import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.env.ANKUR_CLIENT_APP||process.cwd();
const hub=readFileSync(resolve(root,'src/components/customer/FeatureHub.tsx'),'utf8');
const profile=readFileSync(resolve(root,'src/components/customer/ProfileTab.tsx'),'utf8');
const app=readFileSync(resolve(root,'src/App.tsx'),'utf8');
const css=readFileSync(resolve(root,'src/index.css'),'utf8');
const review=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');
const reconstruct=readFileSync(new URL('../all-features/reconstruct.py',import.meta.url),'utf8');

test('Video Idea Builder defaults to 30 seconds while keeping duration editable',()=>{
 assert.match(hub,/\[duration,setDuration\]=useState\(30\)/);
 assert.match(hub,/min=\"5\" max=\"120\" value=\{duration\}/);
});

test('Video Idea Builder shows event selection, prompt and two equal-width actions',()=>{
  assert.match(hub,/id="ankur-video-occasion"/);
  const occasions=hub.slice(hub.indexOf('const VIDEO_OCCASIONS = ['),hub.indexOf('] as const;',hub.indexOf('const VIDEO_OCCASIONS = [')));
  const ids=[...occasions.matchAll(/\{id:'([^']+)',name:/g)].map(m=>m[1]);
  assert.equal(ids.length,29,'29 occasion choices in compact 3-column rows');
  assert.equal(new Set(ids).size,29,'no duplicate occasion choices');
  assert.ok(!ids.includes('business'),'remove obsolete Dry Ice Supply');
  for(const category of ['Wedding Entry','Stage Fog','Engagement','Birthday','Cocktail','Reception','Haldi','Mehndi','Sangeet','DJ Night','Corporate Event','Anniversary','Baby Shower','Bridal Entry','Groom Entry','Varmala','First Dance','Ring Ceremony','Grand Opening','Award Ceremony','Fashion Show','College Fest','Product Launch','Baraat Entry','Pool Party','Diwali Party','New Year Party','Live Concert','Other Event'])
    assert.ok(occasions.includes(category),category);
  const video=hub.slice(hub.indexOf('function VideoIdeaPanel('),hub.indexOf('function ServiceAreaPanel()'));
  assert.doesNotMatch(video,/<select\b/,'native one-option-per-row dropdown must be removed');
  assert.match(video,/ankur-video-occasion-grid grid grid-cols-3/);
  assert.match(video,/aria-expanded=\{occasionOpen\}/);
  assert.match(video,/aria-pressed=\{occasion===item.id\}/);
  assert.match(video,/onClick=\{\(\)=>\{setOccasion\(item.id\);setOccasionOpen\(false\);\}\}/);
  assert.match(css,/grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css,/max-height: min\(72vh, 720px\)/);
  assert.match(hub,/id="ankur-video-prompt"/);
  assert.match(hub,/Generate an actual finished/);
  assert.match(hub,/playable video, not just a video concept/);
  assert.match(hub,/video generation is unavailable/);
  assert.match(hub,/\[duration,setDuration\]=useState\(30\)/);
  assert.match(hub,/Copy Prompt/);
  assert.match(hub,/Open Gemini/);
  assert.match(hub,/ankur-video-action ankur-video-copy/);
  assert.match(hub,/ankur-video-action ankur-gemini-button/);
  assert.match(css,/ANKUR VIDEO IDEA PROFILE v1\.0\.41/);
  assert.match(css,/width: 100%/);
  assert.match(css,/justify-content: center/);
});

test('contact inputs remain below prompt actions and saved only to device by account',()=>{
  const start=hub.indexOf('function VideoIdeaPanel('),end=hub.indexOf('function ServiceAreaPanel()',start);
  const panel=hub.slice(start,end);
  assert.ok(panel.indexOf('Copy Prompt')<panel.indexOf('ankur-video-saved-details'));
  assert.ok(panel.indexOf('Open Gemini')<panel.indexOf('ankur-video-saved-details'));
  assert.match(panel,/localStorage\.getItem\(storageKey\)/);
  assert.match(panel,/localStorage\.setItem\(storageKey,JSON\.stringify\(next\)\)/);
  assert.match(panel,/user\?\.uid\|\|'guest'/);
  assert.match(panel,/Company \/ Name/);
  assert.match(panel,/City \/ Place/);
  assert.match(panel,/Mobile Number/);
  assert.match(panel,/contact\.mobile\.length===10/);
  assert.doesNotMatch(panel,/setDoc\(|addDoc\(|updateDoc\(|fetch\(|XMLHttpRequest/);
});

test('Profile keeps settings and notifications but no longer duplicates AI Features tools',()=>{
  assert.doesNotMatch(profile,/<FeatureHub/);
  assert.match(profile,/<LanguageSettings/);
  assert.match(profile,/Notification preferences/);
  assert.match(profile,/BUSINESS_CALL_HREF/);
  assert.doesNotMatch(app,/currentTab === 'ai-features'/);
  assert.match(hub,/grid grid-cols-2 gap-2/);
});

test('v1.0.41 UI patch applied in local, CI and signed APK with correct version',()=>{
 const name='ui-fixes/video_idea_profile_v141.py';
 assert.equal(reconstruct.split("'"+name+"'").length-1,1);
 assert.equal(review.split('python3 '+name).length-1,1);
 assert.equal(signed.split('python3 '+name).length-1,1);
 assert.ok(reconstruct.indexOf('customer_features_nav_v140.py')<reconstruct.indexOf(name));
 assert.match(signed,/paths: \['release-batches\/\*\.txt'\]/,'only explicit release batch triggers signed APK');
 assert.match(signed,/versionCode 72/);
 assert.match(signed,/versionName "1\.0\.72"/);
});
