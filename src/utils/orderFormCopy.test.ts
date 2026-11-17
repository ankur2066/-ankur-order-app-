import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { averageRateNote, classifyOrderSubmitError, isPermissionDenied, orderSubmitErrorMessage } from './orderFormCopy.ts';

describe('order submit error copy', () => {
  it('shows a permission message (not "Connection failed") when Firestore rules refuse the batch', () => {
    const denied = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
    assert.equal(classifyOrderSubmitError(denied), 'permission');
    assert.equal(isPermissionDenied(denied), true);
    const hi = orderSubmitErrorMessage('permission', 'hi');
    const en = orderSubmitErrorMessage('permission', 'en');
    assert.match(hi, /ऑर्डर सर्वर ने मना कर दिया \(permission\)/);
    assert.match(hi, /95808 82066/);
    assert.match(en, /Order server refused this order \(permission\)/);
    assert.doesNotMatch(en, /Connection failed/);
  });
  it('keeps the offline retry message for real network errors', () => {
    for (const code of ['unavailable', 'deadline-exceeded', 'unknown']) {
      assert.equal(classifyOrderSubmitError(Object.assign(new Error('offline'), { code })), 'network');
    }
    assert.equal(classifyOrderSubmitError('boom'), 'network');
    assert.match(orderSubmitErrorMessage('network', 'en'), /^Connection failed\. Your order details are saved on this device\./);
    assert.match(orderSubmitErrorMessage('network', 'hi'), /इस फ़ोन में सेव है/);
  });
});

describe('average rate note under the total', () => {
  it('labels total ÷ kg as an average and says packing is included', () => {
    assert.equal(averageRateNote(60, { thermocolIncluded: true, transportRate: 0 }, 'hi'), '(औसत ₹60/kg, पैकिंग सहित)');
    assert.equal(averageRateNote(60, { thermocolIncluded: true, transportRate: 0 }, 'en'), '(average ₹60/kg, incl. packing)');
    assert.equal(averageRateNote(50, { thermocolIncluded: false, transportRate: 0 }, 'hi'), '(औसत ₹50/kg, केवल ड्राई आइस)');
    assert.equal(averageRateNote(65, { thermocolIncluded: true, transportRate: 5 }, 'hi'), '(औसत ₹65/kg, पैकिंग और परिवहन सहित)');
    assert.doesNotMatch(averageRateNote(60, { thermocolIncluded: true, transportRate: 0 }, 'hi'), /सभी लागू शुल्क/);
  });
});
