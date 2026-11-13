import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.env.ANKUR_CLIENT_APP || process.cwd();
const nav = readFileSync(resolve(root, 'src/components/customer/BottomNav.tsx'), 'utf8');
const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const patch = readFileSync(new URL('./customer_nav_v138.py', import.meta.url), 'utf8');

test('duplicate customer Products/Categories tab is not rendered', () => {
  const tabIds = [...nav.matchAll(/\{ id: '([^']+)', label:/g)].map(x => x[1]);
  // v1.0.72 (Ankur, 13 Nov 2026): the lower AI Video entry became Products (coming soon);
  // AI Video stays in the upper Home feature row.
  assert.deepEqual(tabIds, ['home', 'products', 'my-orders', 'profile']);
  assert.match(nav, /id: 'products', label: 'Products', Icon: ShoppingBag/);
  assert.doesNotMatch(nav, /id: 'ai-video', label: 'AI Video'/);
  
  assert.match(nav, /grid-cols-4/);
  assert.doesNotMatch(nav, /Icon: LayoutGrid/);
});

test('legacy customer catalogue promo routes to Home, not dead Categories page', () => {
  assert.match(app, /else if \(action === 'categories'\) setCurrentTab\('home'\)/);
  assert.doesNotMatch(app, /else if \(action === 'categories'\) setCurrentTab\('categories'\)/);
  assert.match(app, /\{currentTab === 'categories' && \(/, 'customer Categories remains reachable');
  assert.match(app, /isOwner=\{role === 'admin'\}/);
});

test('existing booking and private product records remain untouched', () => {
  assert.match(app, /bookingForm=\{\(inlineProduct\)/);
  assert.match(app, /onGoToTrack=\{handleGoToTrack\}/);
  assert.match(app, /CategoriesTab/); // Internal compatibility kept until owner sign-off.
  assert.doesNotMatch(patch, /firestore\.rules|deleteDoc|updateDoc|setDoc|order\.delete|rates\.ts/);
});

test('v1.0.72: Products tile only shows a coming-soon note (Hindi/English), no navigation or Firestore', () => {
  assert.match(nav, /hi: 'बहुत जल्द यह सुविधा शुरू होगी।', en: 'Very soon, this will work\.'/);
  assert.match(nav, /hi \? 'प्रोडक्ट्स' : 'Products'/);
  assert.match(nav, /onClick=\{\(\) => \(id === 'products' \? setSoon\(true\) : onChange\(id\)\)\}/);
  assert.match(nav, /role="status" aria-live="polite"/);
  assert.doesNotMatch(nav, /firebase|firestore|setDoc|updateDoc|onSnapshot/);
  assert.doesNotMatch(nav, /onChange\('products'/);
  assert.doesNotMatch(app, /currentTab === 'products'/);
  // exactly one AI Video entry remains on Home: the upper feature row
  const row = readFileSync(resolve(root, 'src/components/customer/HomeFeatureRow.tsx'), 'utf8');
  assert.match(row, /video: 'AI Video'/);
  assert.match(row, /video: 'AI वीडियो'/);
  assert.doesNotMatch(nav, /label: 'AI Video'|Clapperboard/);
});
