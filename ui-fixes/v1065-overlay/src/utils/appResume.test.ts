import test from 'node:test';
import assert from 'node:assert/strict';
import { createResumeGate, subscribeAppResume } from './appResume.ts';

// v1.0.76 (Ankur, 14 Nov 2026): data re-read when the app is opened again.
function fakeTarget(extra: Record<string, unknown> = {}) {
  const t = new EventTarget() as EventTarget & { visibilityState?: string };
  Object.assign(t, extra);
  return t as any;
}

test('resume gate collapses the burst of events of one resume', () => {
  const gate = createResumeGate(2000);
  assert.equal(gate.shouldRun(10_000), true);
  assert.equal(gate.shouldRun(10_500), false);
  assert.equal(gate.shouldRun(12_100), true);
});

test('visibility -> visible and window focus trigger a refresh; hidden does not', () => {
  const doc = fakeTarget({ visibilityState: 'hidden' }), win = fakeTarget();
  let calls = 0;
  const off = subscribeAppResume(() => { calls++; }, { doc, win, native: null, minIntervalMs: 0 });
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 0, 'going to background must not refresh');
  doc.visibilityState = 'visible';
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 1);
  win.dispatchEvent(new Event('focus'));
  assert.equal(calls, 2);
  off();
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 2, 'no refresh after unsubscribe');
});

test('native Capacitor resume triggers a refresh and is removed on unsubscribe', async () => {
  let nativeCb: (() => void) | null = null, removed = false, calls = 0;
  const off = subscribeAppResume(() => { calls++; }, {
    doc: null, win: null, minIntervalMs: 0,
    native: async (cb) => { nativeCb = cb; return () => { removed = true; }; },
  });
  await Promise.resolve(); await Promise.resolve();
  assert.ok(nativeCb);
  nativeCb!();
  assert.equal(calls, 1);
  off();
  assert.equal(removed, true);
});

test('one resume that fires visibility + focus + native refreshes only once', async () => {
  const doc = fakeTarget({ visibilityState: 'visible' }), win = fakeTarget();
  let nativeCb: (() => void) | null = null, calls = 0;
  const off = subscribeAppResume(() => { calls++; }, { doc, win, native: async (cb) => { nativeCb = cb; return () => {}; } });
  await Promise.resolve(); await Promise.resolve();
  nativeCb!();
  doc.dispatchEvent(new Event('visibilitychange'));
  win.dispatchEvent(new Event('focus'));
  assert.equal(calls, 1);
  off();
});
