import test from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOM_RATE_CHIPS, customRateLine, effectiveDryIceRate, orderRateLabel, parseCustomRate } from './customerRate.ts';

// v1.0.79 (Ankur, 17 Nov 2026): per-customer wholesale rate.
const rates = { dryIceRate: 50, wholesaleRate: 32 };

test('owner chips are ₹35, ₹30 and ₹28', () => {
  assert.deepEqual([...CUSTOM_RATE_CHIPS], [35, 30, 28]);
});

test('only a positive, sane rate counts as a customer rate', () => {
  assert.equal(parseCustomRate(30), 30);
  assert.equal(parseCustomRate('28'), 28);
  assert.equal(parseCustomRate(29.999), 30);
  for (const bad of [undefined, null, '', ' ', 0, -5, NaN, Infinity, 1001, 'abc', {}, true]) assert.equal(parseCustomRate(bad), undefined, String(bad));
});

test('a customer with their own rate pays it, retail or wholesale', () => {
  assert.equal(effectiveDryIceRate('retail', rates, 30), 30);
  assert.equal(effectiveDryIceRate('wholesale', rates, 28), 28);
});

test('customers without their own rate keep the normal price', () => {
  assert.equal(effectiveDryIceRate('retail', rates, undefined), 50);
  assert.equal(effectiveDryIceRate('wholesale', rates, undefined), 32);
  assert.equal(effectiveDryIceRate('retail', rates, 0), 50, 'a cleared/zero rate falls back');
  assert.equal(effectiveDryIceRate('wholesale', { dryIceRate: 50 }, null), undefined, 'unset wholesale stays unavailable');
});

test('customer line and owner order label', () => {
  assert.equal(customRateLine(30), 'आपका खास रेट: ₹30/kg');
  assert.equal(customRateLine(30, true), 'Your special rate: ₹30/kg');
  assert.equal(orderRateLabel({ dryIcePricePerKg: 30 }), 'Rate ₹30/kg');
  assert.equal(orderRateLabel({ dryIcePricePerKg: 50 }), 'Rate ₹50/kg');
  assert.equal(orderRateLabel({ dryIcePricePerKg: 0 }), '');
  assert.equal(orderRateLabel({}), '');
});
