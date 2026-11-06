/** Real SDK manifest discovery for the isolated product workers. No live calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.ANKUR_PRODUCT_SDK_ROOT;
assert.ok(root,'Point ANKUR_PRODUCT_SDK_ROOT at the staged functions package');
process.env.GCLOUD_PROJECT='demo-ankur-product-sdk';
const api=await import(pathToFileURL(resolve(root,'index.js')).href);
test('real product SDK discovers only the two isolated named-database workers',()=>{
 assert.deepEqual(Object.keys(api).sort(),['notifyAnkurProductOrderProgress','notifyNewAnkurProductOrder']);
 for(const[name,path]of [['notifyNewAnkurProductOrder','product_orders/{orderId}'],['notifyAnkurProductOrderProgress','product_order_tracking/{trackingToken}']]){const e=api[name].__endpoint;assert.equal(e.platform,'gcfv2');assert.deepEqual(e.region,['asia-southeast1']);assert.equal(e.minInstances,0);assert.equal(e.maxInstances,1);assert.equal(e.serviceAccountEmail,'ankur-order-push@ankur-dryice-app.iam.gserviceaccount.com');assert.equal(e.eventTrigger.eventFilters.database,'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673');assert.equal(e.eventTrigger.eventFilterPathPatterns.document,path);}
});
