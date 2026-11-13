import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.env.ANKUR_CLIENT_APP||process.cwd();
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const form=read('src/components/OrderForm.tsx');
const app=read('src/App.tsx');
const admin=read('src/components/AdminDashboard.tsx');
const header=read('src/components/Header.tsx');
const css=read('src/index.css');
const local=readFileSync(new URL('../all-features/reconstruct.py',import.meta.url),'utf8');
const review=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');

test('four dispatch choices are compact check-circle + exact title only',()=>{
 const slots=form.slice(form.indexOf('apb-slot-grid apb-slot-compact-grid'),form.indexOf('Price Breakdown (Price Breakup)'));
 assert.match(slots,/dispatchSlots\.map\(\(slot\)/);
 for(const title of ['आज सुबह','आज शाम','कल सुबह','कल शाम'])assert.match(slots,new RegExp(title));
 assert.match(slots,/type="radio"/);
 assert.match(slots,/className="apb-slot-title text-sm font-bold"/);
 assert.doesNotMatch(slots,/slot\.timeWindow|apb-slot-time|apb-helper|समय समाप्त|Expired dispatch slots/);
 assert.match(css,/ANKUR COMPACT DISPATCH v1\.0\.47/);
 assert.match(css,/min-height: 48px !important/);
 assert.match(css,/flex-direction: row !important/);
});

test('time-slot validation remains in original booking logic despite shorter display',()=>{
 assert.match(form,/const dispatchSlots = getDispatchSlots\(\)/);
 assert.match(form,/dispatchSlots\.find\(s => !s\.disabled\)/);
 assert.match(form,/slot\.disabled \? 'apb-slot-disabled cursor-not-allowed'/);
 assert.match(form,/disabled=\{slot\.disabled\}/);
 assert.match(form,/checked=\{dispatchTiming === slot\.label\}/);
 assert.match(form,/onChange=\{\(\) => setDispatchTiming\(slot\.label\)\}/);
 assert.match(form,/dispatchSlots\.find\(s => s\.label === dispatchTiming\)/);
 assert.match(form,/executeOrderSubmission/);
 assert.match(app,/bookingForm=\{\(inlineProduct\)/);
});

test('security rules viewer and its raw rules import are excluded from shipped customer and owner app',()=>{
 assert.doesNotMatch(app,/RulesReviewModal|isRulesModalOpen|onOpenRulesReview/);
 assert.doesNotMatch(admin,/onOpenRulesReview|<span>रूल्स<\/span>/);
 assert.doesNotMatch(header,/onOpenRulesReview/);
 assert.equal(existsSync(resolve(root,'src/components/RulesReviewModal.tsx')),false);
 assert.match(app,/<AdminDashboard/);
 assert.match(app,/<StaffDashboard/);
 assert.doesNotMatch(app,/firestore\.rules\?raw/);
});

test('v1.0.47 patch applied to all source reconstructions; signed version checked',()=>{
 const name='ui-fixes/dispatch_rules_privacy_v147.py';
 assert.equal(local.split("'"+name+"'").length-1,1);
 assert.equal(review.split('python3 '+name).length-1,1);
 assert.equal(signed.split('python3 '+name).length-1,1);
 assert.ok(local.indexOf('customer_ai_video_cleanup_v146.py') < local.indexOf(name));
 assert.match(signed,/paths: \['release-batches\/\*\.txt'\]/,'only explicit release batch triggers signed APK');
 assert.match(signed,/versionCode 74/);
 assert.match(signed,/versionName "1\.0\.74"/);
});
