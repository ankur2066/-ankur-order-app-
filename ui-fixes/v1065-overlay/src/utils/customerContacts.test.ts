import test from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOMER_CONTACTS, contactTelHref, contactWhatsAppHref, contactDisplay } from '../data/customerContacts.ts';

test('v1.0.71: customer footer has exactly the three owner contact numbers with Hindi + English labels', () => {
  assert.deepEqual(CUSTOMER_CONTACTS.map((c) => [c.id, c.phone]), [['packing', '9151416323'], ['delivery', '9532844538'], ['complaint', '8896332066']]);
  assert.deepEqual(CUSTOMER_CONTACTS.map((c) => c.labelHi), ['पैकिंग से जुड़ी बात — विकास गौतम', 'डिलीवरी से जुड़ी बात', 'शिकायत']);
  for (const c of CUSTOMER_CONTACTS) {
    assert.match(c.phone, /^[6-9][0-9]{9}$/);
    assert.ok(c.labelEn.length > 3);
  }
});

test('tel and WhatsApp links use +91 / 91 with the 10-digit number', () => {
  assert.equal(contactTelHref('9151416323'), 'tel:+919151416323');
  assert.equal(contactWhatsAppHref('9532844538'), 'https://wa.me/919532844538');
  assert.equal(contactDisplay('8896332066'), '88963 32066');
});
