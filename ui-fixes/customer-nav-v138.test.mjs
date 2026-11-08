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
  assert.deepEqual(tabIds, ['home', 'my-orders', 'profile']);
  assert.match(nav, /id: isOwner \? 'ai-video' : 'categories'/);
  assert.match(nav, /label: isOwner \? 'AI Video' : 'Categories'/);
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
