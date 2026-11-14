import test from 'node:test';
import assert from 'node:assert/strict';
import { staffDialHref, staffDialDisplay, openDialer } from './staffDial.ts';

// v1.0.76 (Ankur, 14 Nov 2026): staff Call button must open the dialer.
test('staff dial href is tel:+91 plus a valid 10-digit mobile only', () => {
  assert.equal(staffDialHref('9876543210'), 'tel:+919876543210');
  assert.equal(staffDialHref('+91 98765 43210'), 'tel:+919876543210');
  assert.equal(staffDialHref('919876543210'), 'tel:+919876543210');
  assert.equal(staffDialHref('09876543210'), 'tel:+919876543210');
  assert.equal(staffDialHref('12345'), '');
  assert.equal(staffDialHref('1234567890'), '', 'Indian mobiles start 6-9');
  assert.equal(staffDialHref(undefined), '');
  assert.equal(staffDialHref('javascript:alert(1)'), '');
});

test('openDialer navigates to the tel: URL (Android hands it to the dialer)', () => {
  const loc = { href: 'https://localhost/' };
  assert.equal(openDialer('tel:+919876543210', loc), true);
  assert.equal(loc.href, 'tel:+919876543210');
  const loc2 = { href: 'x' };
  assert.equal(openDialer('', loc2), false);
  assert.equal(openDialer('https://evil.example', loc2), false);
  assert.equal(loc2.href, 'x');
});

test('display format', () => {
  assert.equal(staffDialDisplay('tel:+919876543210'), '98765 43210');
  assert.equal(staffDialDisplay('bad'), '');
});
