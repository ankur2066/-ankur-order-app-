import test from 'node:test';
import assert from 'node:assert/strict';
import { startNativeVoice, ensureVoicePermission, bestMatch, webVoiceLanguage, VOICE_LANGUAGES, VOICE_MESSAGES } from './voiceInput.ts';

type Listener = (data: any) => void;
function fakePlugin(opts: { available?: boolean; perm?: string; askPerm?: string; startFails?: Record<string, string> } = {}) {
  const listeners: Record<string, Listener[]> = {};
  const calls = { start: [] as any[], stop: 0, request: 0, removeAll: 0 };
  let listening = false;
  const plugin = {
    calls, listeners,
    emit(event: string, data: any) { for (const fn of listeners[event] || []) fn(data); },
    setListening(v: boolean) { listening = v; },
    available: async () => ({ available: opts.available ?? true }),
    checkPermissions: async () => ({ speechRecognition: opts.perm ?? 'granted' }),
    requestPermissions: async () => { calls.request++; return { speechRecognition: opts.askPerm ?? 'granted' }; },
    start: async (o: any) => { calls.start.push(o); const err = opts.startFails?.[o.language]; if (err) throw new Error(err); listening = true; return {}; },
    // Android plugin 7.0.1: stop() never resolves.
    stop: () => { calls.stop++; listening = false; return new Promise<void>(() => {}); },
    isListening: async () => ({ listening }),
    addListener: async (event: string, fn: Listener) => { (listeners[event] ||= []).push(fn); return { remove: async () => {} }; },
    removeAllListeners: async () => { calls.removeAll++; for (const k of Object.keys(listeners)) delete listeners[k]; },
  };
  return plugin;
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
function recorder() {
  const r = { texts: [] as string[], ended: 0, problems: [] as string[], messages: [] as string[] };
  return { r, cb: { onText: (t: string) => r.texts.push(t), onEnd: () => { r.ended++; }, onProblem: (p: string, m: string) => { r.problems.push(p); r.messages.push(m); } } };
}
const fast = { pollMs: 5, graceMs: 15, maxMs: 2000, quickFailMs: 0 };

test('starts in hi-IN with partial results and no popup, fills text, second tap stops', async () => {
  const p = fakePlugin(); const { r, cb } = recorder();
  const session = await startNativeVoice(p as any, cb, fast);
  assert.ok(session);
  assert.deepEqual(p.calls.start[0], { language: 'hi-IN', maxResults: 3, partialResults: true, popup: false });
  p.emit('partialResults', { matches: ['आज के'] });
  p.emit('partialResults', { matches: ['आज के ऑर्डर कितने हैं'] });
  assert.deepEqual(r.texts, ['आज के', 'आज के ऑर्डर कितने हैं']);
  session!.stop();
  assert.equal(p.calls.stop, 1, 'stop is called even though it never resolves');
  await wait(40);
  assert.equal(r.ended, 1);
  assert.deepEqual(r.problems, []);
  assert.ok(p.calls.removeAll >= 2, 'listeners removed after the session');
  session!.stop();
  assert.equal(p.calls.stop, 1, 'a stopped session does nothing on another stop');
});

test('falls back to en-IN when hi-IN cannot start', async () => {
  const p = fakePlugin({ startFails: { 'hi-IN': 'Language not supported' } }); const { r, cb } = recorder();
  const session = await startNativeVoice(p as any, cb, fast);
  assert.ok(session);
  assert.deepEqual(p.calls.start.map((c) => c.language), ['hi-IN', 'en-IN']);
  assert.deepEqual(VOICE_LANGUAGES, ['hi-IN', 'en-IN']);
  session!.stop(); await wait(40);
  assert.deepEqual(r.problems, []);
});

test('falls back to en-IN when hi-IN stops at once with no text (language not supported on device)', async () => {
  const p = fakePlugin(); const { r, cb } = recorder();
  await startNativeVoice(p as any, cb, { ...fast, quickFailMs: 10000 });
  p.setListening(false); p.emit('listeningState', { status: 'stopped' });
  await wait(5);
  assert.deepEqual(p.calls.start.map((c) => c.language), ['hi-IN', 'en-IN']);
  p.emit('partialResults', { matches: ['orders today'] });
  p.setListening(false); p.emit('listeningState', { status: 'stopped' });
  await wait(40);
  assert.deepEqual(r.texts, ['orders today']);
  assert.equal(r.ended, 1);
  assert.deepEqual(r.problems, []);
});

test('asks for microphone permission; denied shows the Hindi permission message', async () => {
  const p = fakePlugin({ perm: 'prompt', askPerm: 'denied' }); const { r, cb } = recorder();
  const session = await startNativeVoice(p as any, cb, fast);
  assert.equal(session, null);
  assert.equal(p.calls.request, 1);
  assert.equal(p.calls.start.length, 0);
  assert.deepEqual(r.problems, ['denied']);
  assert.equal(r.messages[0], VOICE_MESSAGES.denied);
  assert.match(VOICE_MESSAGES.denied, /माइक की अनुमति/);
  assert.equal(r.ended, 1);
});

test('permission granted on request continues to listening', async () => {
  const p = fakePlugin({ perm: 'prompt', askPerm: 'granted' });
  assert.equal(await ensureVoicePermission(p as any), true);
  const already = fakePlugin({ perm: 'granted' });
  assert.equal(await ensureVoicePermission(already as any), true);
  assert.equal(already.calls.request, 0, 'no prompt when already granted');
});

test('unavailable recognizer shows the Hindi unavailable message', async () => {
  const p = fakePlugin({ available: false }); const { r, cb } = recorder();
  assert.equal(await startNativeVoice(p as any, cb, fast), null);
  assert.deepEqual(r.problems, ['unavailable']);
  assert.equal(r.messages[0], VOICE_MESSAGES.unavailable);
  assert.equal(p.calls.start.length, 0);
});

test('start rejected for missing permission shows the permission message', async () => {
  const p = fakePlugin({ startFails: { 'hi-IN': 'Missing permission' } }); const { r, cb } = recorder();
  assert.equal(await startNativeVoice(p as any, cb, fast), null);
  assert.deepEqual(r.problems, ['denied']);
});

test('both languages failing shows the retry message', async () => {
  const p = fakePlugin({ startFails: { 'hi-IN': 'boom', 'en-IN': 'boom' } }); const { r, cb } = recorder();
  assert.equal(await startNativeVoice(p as any, cb, fast), null);
  assert.deepEqual(r.problems, ['failed']);
  assert.equal(r.ended, 1);
});

test('silent error after start (no text) ends the session with the retry message', async () => {
  const p = fakePlugin(); const { r, cb } = recorder();
  await startNativeVoice(p as any, cb, fast);
  p.setListening(false); // plugin error: isListening turns false, no event
  await wait(60);
  assert.equal(r.ended, 1);
  assert.deepEqual(r.problems, ['failed']);
});

test('final result arriving just after speech ends still fills the input', async () => {
  const p = fakePlugin(); const { r, cb } = recorder();
  await startNativeVoice(p as any, cb, { ...fast, graceMs: 30 });
  p.setListening(false); p.emit('listeningState', { status: 'stopped' });
  await wait(5);
  p.emit('partialResults', { matches: ['', 'राम का हिसाब'] });
  await wait(50);
  assert.deepEqual(r.texts, ['राम का हिसाब']);
  assert.equal(r.ended, 1);
  assert.deepEqual(r.problems, []);
});

test('safety time limit stops listening', async () => {
  const p = fakePlugin(); const { r, cb } = recorder();
  await startNativeVoice(p as any, cb, { ...fast, pollMs: 10000, maxMs: 10 });
  await wait(50);
  assert.equal(p.calls.stop, 1);
  assert.equal(r.ended, 1);
});

test('bestMatch and browser language', () => {
  assert.equal(bestMatch(['  ', ' नमस्ते ']), 'नमस्ते');
  assert.equal(bestMatch(undefined), '');
  assert.equal(bestMatch([1, null]), '');
  assert.equal(webVoiceLanguage('hi'), 'hi-IN');
  assert.equal(webVoiceLanguage('en'), 'en-IN');
});
