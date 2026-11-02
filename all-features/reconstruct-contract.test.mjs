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
