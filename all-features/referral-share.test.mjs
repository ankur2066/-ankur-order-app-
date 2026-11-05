import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=readFileSync(new URL('./templates/referralShare.template',import.meta.url),'utf8');
const {referralCode,referralDetails,shareReferral,shareNativeReferral}=await import('data:text/javascript,'+encodeURIComponent(stripTypeScriptTypes(source)));
test('referral links always use the public HTTPS landing page, never the WebView origin',()=>{
 for(const hi of [true,false]){
  const d=referralDetails('user_123-test',hi),u=new URL(d.url);
  assert.equal(u.origin,'https://www.ankurdryice.store');assert.equal(u.pathname,'/refer.html');
  assert.equal(u.searchParams.get('ref'),'user_123-test');assert.ok(d.text.includes('user_123-test'));
 }
 for(const bad of ['',null,'x','a/b','<script>','a'.repeat(129)])assert.equal(referralCode(bad),null);
 assert.throws(()=>referralDetails('bad/code'));
});
test('share success and cancellation do not also copy content',async()=>{
 const d=referralDetails('customer_123');let copies=0;
 const clipboard={writeText:async()=>{copies++;}};
 assert.equal(await shareReferral(d,{share:async()=>{},clipboard}),'shared');
 assert.equal(await shareReferral(d,{share:async()=>{throw {name:'AbortError'};},clipboard}),'cancelled');
 assert.equal(copies,0);
});
test('unsupported native share falls back to clipboard; denied clipboard offers manual copy',async()=>{
 const d=referralDetails('customer_123');let copied='';
 assert.equal(await shareReferral(d,{share:async()=>{throw Error('unsupported');},clipboard:{writeText:async s=>{copied=s;}}}),'copied');
 assert.ok(copied.includes(d.url));assert.ok(copied.includes(d.text));
 assert.equal(await shareReferral(d,{}),'manual');
 assert.equal(await shareReferral(d,{clipboard:{writeText:async()=>{throw Error('denied');}}}),'manual');
});

test('Android chooser receives public link and cancellation stays cancelled',async()=>{
 const d=referralDetails('customer_123',true);let received;
 assert.equal(await shareNativeReferral(d,async data=>{received=data;}),'shared');
 assert.deepEqual(received,d);
 for(const message of ['Share canceled','Share cancelled'])
  assert.equal(await shareNativeReferral(d,async()=>{throw Error(message);}),'cancelled');
 assert.equal(await shareNativeReferral(d,async()=>{throw Error('unavailable');}),'manual');
});
