import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const local=readFileSync(new URL('./reconstruct.py',import.meta.url),'utf8');
const reviewed=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');
const patch='ui-fixes/seasonal_contrast_v135.py';

test('local reconstruction matches CI and signed APK CSS overlay ordering',()=>{
 const i=local.indexOf('all-features/wire_additions.py');
 const j=local.indexOf(patch);
 assert.ok(i>=0 && j>i,'contrast must be applied after all app overlays');
 assert.equal(local.split(patch).length-1,1,'apply contrast once in local reconstruction');
 assert.equal(reviewed.split(patch).length-1,1,'apply contrast once in review reconstruction');
 assert.equal(signed.split('python3 '+patch).length-1,1,'apply contrast once in signed APK reconstruction');
 assert.match(local,/subprocess.run\(\['python3',script\]/);
 assert.match(local,/ANKUR_APP_DIR/);
});

test('review and signed APK run the entire local reconstruction chain in order',()=>{
 const chain=local.match(/CHAIN=\[([^\]]+)\]/)[1].match(/'([^']+\.py)'/g).map(x=>x.slice(1,-1));
 const scripts=text=>[...text.matchAll(/python3 ([\w./-]+\.py)/g)]
   .map(x=>x[1]).filter(x=>x!=='all-features/protected_audit.py');
 assert.deepEqual(scripts(reviewed),chain,'review source must match local source');
 assert.deepEqual(scripts(signed),chain,'signed APK must include every reviewed overlay');
});

test('private signing depends on successful same-commit review before accessing signing secrets',()=>{
 assert.match(reviewed,/^  workflow_call:/m);
 assert.match(signed,/review:\n    uses: \.\/\.github\/workflows\/all-features-review\.yml/);
 assert.match(signed,/signed-test-apk:\n    needs: review/);
 assert.doesNotMatch(signed,/continue-on-error: true/);
 for(const path of ['ui-fixes/customer_nav_v138.py','ui-fixes/customer_dark_contrast_v138.py','ui-fixes/customer-dark-contrast-v138.css']) {
   assert.ok(signed.split('permissions:')[0].includes("'"+path+"'"),'UI change must trigger a fresh binary: '+path);
 }
});
