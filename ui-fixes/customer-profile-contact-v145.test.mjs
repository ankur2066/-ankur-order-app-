import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.env.ANKUR_CLIENT_APP||process.cwd();
const profile=readFileSync(resolve(root,'src/components/customer/ProfileTab.tsx'),'utf8');
const products=readFileSync(resolve(root,'src/data/products.ts'),'utf8');
const app=readFileSync(resolve(root,'src/App.tsx'),'utf8');
const local=readFileSync(new URL('../all-features/reconstruct.py',import.meta.url),'utf8');
const review=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');

test('Profile displays separate business Call and WhatsApp numbers',()=>{
 assert.match(profile,/Call: 95808 82066 · WhatsApp: 88963 32066/);
 assert.doesNotMatch(profile,/BUSINESS_PHONE_DISPLAY/);
 assert.match(profile,/href=\{BUSINESS_CALL_HREF\}/);
 assert.match(profile,/href=\{BUSINESS_WHATSAPP_BASE\}/);
 assert.match(products,/BUSINESS_CALL_HREF\s*=\s*'tel:\+919580882066'/);
 assert.match(products,/BUSINESS_WHATSAPP_BASE\s*=\s*'https:\/\/wa\.me\/918896332066'/);
});

test('Profile patch preserves staff approval and notifications, booking and tracking',()=>{
 assert.match(profile,/staffRequests/);
 assert.match(profile,/setDoc\(doc\(db, 'staffRequests', currentUser\.uid\)/);
 assert.match(profile,/Notification preferences/);
 assert.match(profile,/BUSINESS_CALL_HREF/);
 assert.match(app,/<AdminDashboard/);
 assert.match(app,/bookingForm=\{\(inlineProduct\)/);
 assert.match(app,/onGoToTrack=\{handleGoToTrack\}/);
});

test('same Profile-only fix applied in local/review/signed v1.0.45',()=>{
 const patch='ui-fixes/customer_profile_contact_v145.py';
 assert.equal(local.split("'"+patch+"'").length-1,1);
 assert.equal(review.split('python3 '+patch).length-1,1);
 assert.equal(signed.split('python3 '+patch).length-1,1);
 assert.ok(local.indexOf('video_idea_profile_v141.py')<local.indexOf(patch));
 assert.match(signed,/paths: \['release-batches\/\*\.txt'\]/,'only explicit release batch triggers signed APK');
 assert.match(signed,/versionCode 56/);
 assert.match(signed,/versionName "1\.0\.56-private-test"/);
});
