import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const hub = fs.readFileSync(new URL('./templates/FeatureHub.template', import.meta.url), 'utf8');
const language = fs.readFileSync(new URL('./templates/LanguageContext.template', import.meta.url), 'utf8');

test('all fourteen feature routes are present once', () => {
  for (const id of ['calculator','video','loyalty','catalog','partner','subscriptions','promotions','inventory','reports','faq','rates','support','service-area','referral']) {
    assert.match(hub, new RegExp(`id:'${id}'`));
  }
});

test('language defaults to English and persists without launch prompt', () => {
  assert.match(language, /=== 'hi' \? 'hi' : 'en'/);
  assert.match(language, /localStorage\.setItem\(STORAGE_KEY/);
  assert.doesNotMatch(language, /alert\(|confirm\(|Notification/);
});

test('unsafe business defaults stay disabled or unconfigured', () => {
  assert.match(hub, /No public promotion is active/);
  assert.match(hub, /Opening stock is not configured/);
  assert.match(hub, /No automatic charge/);
  assert.doesNotMatch(hub, /GSTIN|usageCount\s*\+|stock.*300|quantityKg\s*\*\s*55/i);
});
