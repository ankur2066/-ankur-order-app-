import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const script=readFileSync(new URL('./customer-home-language.py',import.meta.url),'utf8');
const review=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');
const reconstruct=readFileSync(new URL('../all-features/reconstruct.py',import.meta.url),'utf8');

test('customer Home shell localization is preference-driven, not a launch prompt',()=>{
 assert.match(script,/useLanguage/);
 assert.match(script,/language === 'hi'/);
 for(const line of ['प्रोडक्ट चुनें','ड्राई आइस (सामान्य बुकिंग)','ड्राई आइस बुकिंग फॉर्म','Loading products']){
   assert.ok(script.includes(line),line);
 }
 assert.match(script,/product\.hindiName \|\| product\.name/);
 assert.doesNotMatch(script,/\bsetDoc\(|\bupdateDoc\(|\baddDoc\(|\borderRef\(|totalAmount:\s*approvedAmount/);
});
test('local, review CI and signed APK apply the same shell overlay after the core app overlays',()=>{
 const cmd='python3 ui-fixes/customer-home-language.py';
 for(const source of [review,signed])assert.ok(source.includes(cmd),'workflow must call the patch');
 assert.ok(reconstruct.includes("'ui-fixes/customer-home-language.py'"));
 assert.ok(review.includes('ui-fixes/customer-home-language.test.mjs'));
 assert.ok(reconstruct.indexOf("'all-features/wire_additions.py'")<reconstruct.indexOf("'ui-fixes/customer-home-language.py'"));
});
