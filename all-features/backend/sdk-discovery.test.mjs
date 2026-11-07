/** Real installed Firebase SDK discovery only: creates no documents and deploys nothing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.ANKUR_FEATURE_SDK_ROOT;
assert.ok(root,'Point ANKUR_FEATURE_SDK_ROOT at the staged functions package');
process.env.GCLOUD_PROJECT='demo-ankur-feature-sdk';
const api=await import(pathToFileURL(resolve(root,'index.mjs')).href);
test('real feature SDK discovers only three bounded named-database exports',()=>{
 assert.deepEqual(Object.keys(api).sort(),['ankurDeliveredReceipt','ankurFeatureAction','ankurProductDeliveredReceipt']);
 for(const fn of Object.values(api)){const e=fn.__endpoint;assert.equal(e.platform,'gcfv2');assert.deepEqual(e.region,['asia-southeast1']);assert.equal(e.minInstances,0);assert.equal(e.maxInstances,1);assert.equal(e.serviceAccountEmail,'ankur-feature-suite@ankur-dryice-app.iam.gserviceaccount.com');}
 assert.ok(api.ankurFeatureAction.__endpoint.callableTrigger);
 for(const[name,path]of [['ankurDeliveredReceipt','orders/{orderId}'],['ankurProductDeliveredReceipt','product_orders/{orderId}']]){const e=api[name].__endpoint.eventTrigger;assert.equal(e.eventFilters.database,'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673');assert.equal(e.eventFilterPathPatterns.document,path);assert.equal(e.retry,true);}
});
