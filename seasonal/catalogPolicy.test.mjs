import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

const policySource=readFileSync(new URL('./catalogPolicy.template',import.meta.url),'utf8');
const policy=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(stripTypeScriptTypes(policySource)));
const billing=readFileSync(new URL('../billing/apply_patch.py',import.meta.url),'utf8');
const wiring=readFileSync(new URL('../all-features/wire_additions.py',import.meta.url),'utf8');
const protectedSource=readFileSync(new URL('../all-features/protected_audit.py',import.meta.url),'utf8');

test('November/December public customer catalogue contains only active dry ice and pyro',()=>{
  for(const category of ['dry_ice','pyro']){
    assert.equal(policy.isSeasonalPublicProduct({category,active:true}),true,category);
    assert.equal(policy.isSeasonalPublicProduct({category,active:false}),false,category+' inactive');
  }
  for(const category of ['event_effects','accessories','event_packs','other','pyro_accessories',undefined,'']){
    assert.equal(policy.isSeasonalPublicProduct({category,active:true}),false,String(category));
  }
  assert.equal(policy.isSeasonalPublicProduct({category:'pyro'}),false,'missing active flag');
  assert.equal(policy.PUBLIC_OTHER_PRODUCTS_ENABLED,false);
  assert.deepEqual([...policy.PUBLIC_CATEGORY_IDS],['dry_ice','pyro']);
});

test('future season requires owner action and does not auto-publish January products',()=>{
  assert.doesNotMatch(policySource,/Date\s*\(|Date\.now\(|2027-01-15.*\?|setTimeout\s*\(/);
  assert.match(policySource,/owner must first/i);
  assert.match(policySource,/PUBLIC_OTHER_PRODUCTS_ENABLED = false/);
});

test('customer-only storefront gate preserves owner catalogue, native order tracking and five tabs',()=>{
  assert.match(billing,/filter\(isSeasonalPublicProduct\)/);
  assert.match(billing,/unit\.products\.filter\(isSeasonalPublicProduct\)/);
  assert.match(billing,/seasonal\/catalogPolicy\.template/);
  assert.match(wiring,/DO NOT inject a duplicate Other Products page/);
  assert.doesNotMatch(wiring,/s\.replace\(anchor,"      \{currentTab === 'categories' && <details>/);
  assert.match(wiring,/\["inventory","reports","catalog","partner","subscriptions","promotions","referral","loyalty"\]/);
  assert.match(protectedSource,/legacySubmission/);
  assert.match(protectedSource,/src\/data\/rates\.ts/);
  assert.match(protectedSource,/firestore\.rules/);
});
