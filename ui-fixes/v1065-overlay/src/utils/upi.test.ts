import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { backupUpiUri, primaryUpiUri } from './upi.ts';

describe('order UPI links', () => {
  it('uses the primary UPI account, merchant, amount and order ID memo', () => {
    const url = new URL(primaryUpiUri(1250, 'ADI-20261108-TEST'));
    assert.equal(url.protocol, 'upi:');
    assert.equal(url.searchParams.get('pa'), 'paytm.s26ykus@pty');
    assert.equal(url.searchParams.get('pn'), 'Ankur Dryice');
    assert.equal(url.searchParams.get('am'), '1250.00');
    assert.equal(url.searchParams.get('tn'), 'Order ADI-20261108-TEST');
  });
  it('provides the backup UPI ID and keeps payment links order-specific', () => {
    const url = new URL(backupUpiUri(600, 'ORDER-9'));
    assert.equal(url.searchParams.get('pa'), 'ankur.singh332066@okhdfcbank');
    assert.equal(url.searchParams.get('am'), '600.00');
    assert.equal(url.searchParams.get('tn'), 'Order ORDER-9');
  });
});
