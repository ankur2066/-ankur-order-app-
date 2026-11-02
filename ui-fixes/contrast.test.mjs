import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('./seasonal-contrast-v135.css',import.meta.url),'utf8');
const patch=readFileSync(new URL('./seasonal_contrast_v135.py',import.meta.url),'utf8');
const review=readFileSync(new URL('../.github/workflows/all-features-review.yml',import.meta.url),'utf8');
const signed=readFileSync(new URL('../.github/workflows/all-features-signed-test-apk.yml',import.meta.url),'utf8');
function luminance(hex){
  const colors=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255);
  const linear=colors.map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
}
function contrast(front,back){
  const [l,h]=[luminance(front),luminance(back)].sort((a,b)=>a-b);
  return (h+0.05)/(l+0.05);
}
test('important customer booking states meet 4.5:1 normal-text contrast',()=>{
 for(const [name,foreground,background] of [
  ['field','#173b52','#ffffff'],
  ['placeholder','#475569','#ffffff'],
  ['idle slot','#334e62','#ffffff'],
  ['selected slot','#075985','#dcf5ff'],
  ['disabled slot','#455868','#f0f4f7'],
  ['total card','#ffffff','#0f2743'],
 ]){
  assert.ok(contrast(foreground,background)>=4.5,name+' contrast too low');
  assert.ok(css.includes(foreground)&&css.includes(background),name+' palette not applied');
 }
});
test('contrast is scoped and preserves booking logic, native focus and signed workflow',()=>{
 assert.match(css,/\.aqp-form-only-main \.ankur-premium-booking/);
 assert.match(css,/\.apb-slot-selected/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media \(forced-colors: active\)/);
 assert.doesNotMatch(patch,/OrderForm\.tsx|firestore\.rules|rates\.ts|tracking\.ts|Firebase/);
 assert.match(review,/ui-fixes\/seasonal_contrast_v135\.py/);
 assert.match(signed,/ui-fixes\/seasonal_contrast_v135\.py/);
});
