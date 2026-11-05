import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const signed=read('.github/workflows/all-features-signed-test-apk.yml');
const gate=read('.github/workflows/nov9-security-gate.yml');
const sourceReview=read('.github/workflows/all-features-review.yml');
test('a single signed APK cannot proceed without UI, staff, feature and push reviews',()=>{
 assert.match(signed,/needs: \[review, security\]/);
 assert.match(signed,/uses: \.\/\.github\/workflows\/nov9-security-gate\.yml/);
 for(const workflow of ['staff-privacy-review.yml','feature-suite-security.yml','push-privacy-review.yml']){
   assert.ok(gate.includes('./.github/workflows/'+workflow),'Missing security workflow '+workflow);
   assert.match(read('.github/workflows/'+workflow),/workflow_call:/);
 }
 assert.match(sourceReview,/nov9-feature-coverage\.test\.mjs/);
 assert.match(sourceReview,/nov9-ci-gate\.test\.mjs/);
 assert.match(gate,/workflow_call:/);
 assert.doesNotMatch(gate,/firebase deploy|gh release create|publish-to-play/i);
});
test('new original-signer private Android candidate has pinned package and version',()=>{
 assert.match(signed,/Ankur-Dryice-v1\.0\.56-PRIVATE-TEST/);
 assert.match(signed,/versionCode 56/);
 assert.match(signed,/EXPECTED_CERT_SHA256/);
 assert.match(signed,/com\.ankurdryice\.events/);
 assert.match(signed,/Verify signed Google Play App Bundle/);
});
