import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');
const fingerprint='ebb60e0b13f7b5bfa814a619d5e4acc0ee65f0e12835ad5a282c072bc9976a6e';

test('signed private APK and AAB must match the known in-place upgrade certificate',()=>{
 assert.match(workflow,/EXPECTED_CERT_SHA256=/);
 assert.match(workflow,/APK_CERT_SHA256/);
 assert.match(workflow,/AAB_CERT_SHA256/);
 assert.equal(workflow.split(fingerprint).length-1,2,'expect one pinned fingerprint per binary');
 assert.match(workflow,/test "\$APK_CERT_SHA256" = "\$EXPECTED_CERT_SHA256"/);
 assert.match(workflow,/test "\$AAB_CERT_SHA256" = "/);
 assert.match(workflow,/aapt" dump badging/);
 assert.match(workflow,/package: name='com\.ankurdryice\.events' versionCode='60' versionName='1\.0\.60-private-test'/);
 assert.match(workflow,/REQUEST_INSTALL_PACKAGES\|MANAGE_EXTERNAL_STORAGE\|QUERY_ALL_PACKAGES/);
 assert.match(workflow,/versionCode 60/);
 assert.match(workflow,/versionName "1\.0\.60-private-test"/);
});
