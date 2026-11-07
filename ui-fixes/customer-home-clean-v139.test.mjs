import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.env.ANKUR_CLIENT_APP||process.cwd();
const home=readFileSync(resolve(root,'src/components/customer/CustomerHome.tsx'),'utf8');
const profile=readFileSync(resolve(root,'src/components/customer/ProfileTab.tsx'),'utf8');
const app=readFileSync(resolve(root,'src/App.tsx'),'utf8');
const originalOrder=readFileSync(resolve(root,'src/components/OrderForm.tsx'),'utf8');
const css=readFileSync(resolve(root,'src/index.css'),'utf8');
const patch=readFileSync(new URL('./customer_home_clean_v139.py',import.meta.url),'utf8');
const review=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');
const reconstruct=readFileSync(new URL('../all-features/reconstruct.py',import.meta.url),'utf8');

test('Home no longer has duplicate product selector or Ice Calculator/Rate Card',()=>{
  assert.doesNotMatch(home,/aqp-top-product|Ice calculator and rate card|<FeatureHub/);
  assert.doesNotMatch(home,/<select\b/);
  assert.match(home,/bookingForm\(null\)/);
  assert.match(home,/Dry Ice Booking Form/);
  assert.match(home,/data-ui-build="1\.0\.39"/);
  assert.doesNotMatch(profile,/<FeatureHub/);
  assert.match(css,/ANKUR CUSTOMER HOME CLEAN v1\.0\.39/);
  assert.match(css,/justify-content: center !important/);
});

test('UI-only patch preserves real OrderForm, bookings, prices and private data',()=>{
  assert.match(app,/bookingForm=\{\(inlineProduct\)/);
  assert.match(app,/onGoToTrack=\{handleGoToTrack\}/);
  assert.match(originalOrder,/executeOrderSubmission/);
  assert.match(originalOrder,/getDispatchSlots/);
  assert.doesNotMatch(patch,/\.write_text\([^\n]*orders|\.write_text\([^\n]*OrderForm|firestore\.rules|deleteDoc|updateDoc|setDoc/);
});

test('Local, review and signed source reconstruction contain the same v1.0.39 cleanup',()=>{
 const name='ui-fixes/customer_home_clean_v139.py';
 assert.equal(reconstruct.split("'"+name+"'").length-1,1);
 assert.equal(review.split('python3 '+name).length-1,1);
 assert.equal(signed.split('python3 '+name).length-1,1);
 assert.ok(reconstruct.indexOf('customer_dark_contrast_v138.py')<reconstruct.indexOf(name));
 assert.match(signed,/paths: \['release-batches\/\*\.txt'\]/,'only explicit release batch triggers signed APK');
});
