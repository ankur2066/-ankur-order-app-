// v1.0.78 (Ankur, 17 Nov 2026): the Home "Today's Lucky Winner" card looked empty
// (only heading + consent) and a big blank band sat between the booking form and it.
// Source contracts only; no Firestore rules change (settings/* is already public read).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const overlay = (p) => readFileSync(new URL('./v1065-overlay/' + p, import.meta.url), 'utf8');
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

test('winner card shows the owner-named winner (name, city, prize) or a friendly "soon" line', () => {
  const w = overlay('src/components/customer/DailyWinner.tsx');
  // dailyWinners first, then the owner's Home slide winner, then the older luckyWinner card.
  assert.match(w, /doc\(db,'dailyWinners',day\)/);
  assert.match(w, /doc\(db,'settings','homeSlides'\)/);
  assert.match(w, /doc\(db,'settings','luckyWinner'\)/);
  assert.match(w, /v\?\.active===true&&name&&city/, 'a hidden luckyWinner card is never shown');
  assert.match(w, /\{shown\.name\}/);
  assert.match(w, /\{shown\.city\}/);
  assert.match(w, /'इनाम':'Prize'/);
  assert.match(w, /आज का विजेता जल्द घोषित होगा — ऑर्डर करें और जीतें!/);
  // Consent checkbox unchanged: same callable, same disabled guard.
  assert.match(w, /'ankurWinnerConsent'/);
  assert.match(w, /disabled=\{consent===null\|\|consentBusy\|\|!isAndroidAppCheckReady\(\)\}/);
  // No writes from the customer card.
  const banner = w.slice(w.indexOf('export const DailyWinnerBanner'), w.indexOf('export const DailyWinnerStrip'));
  assert.doesNotMatch(banner, /setDoc|updateDoc|deleteDoc|addDoc/);
});

test('settings stay publicly readable and owner/staff-written (rules untouched by v1.0.78)', () => {
  assert.match(rules, /match \/settings\/\{settingId\} \{\s*allow read: if true;/);
});

test('no blank band between the booking form and the winner card', () => {
  for (const css of [overlay('src/index.css'), readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')]) {
    const tail = css.slice(css.indexOf('/* v1.0.78'));
    assert.ok(tail.length > 20, 'v1.0.78 block present');
    assert.match(tail, /\.aqp-form-only-home\.page-with-bottom-nav,\s*\.aqp-form-only-home\.min-h-screen \{ min-height: 0 !important; padding-bottom: 0 !important; \}/);
    assert.match(tail, /\.aqp-form-only-home \.aqp-form-only-main \{ padding-bottom: 12px !important; \}/);
    assert.match(tail, /\.aqp-form-only-home \.aqp-booking-form \{ padding-bottom: 6px !important; \}/);
  }
  // The section after the form still clears the bottom menu.
  const app = overlay('src/App.tsx');
  assert.match(app, /ankur-readable-customer-page max-w-lg mx-auto px-3 pb-24/);
});
