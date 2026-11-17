/**
 * v1.0.71 AI chat microphone (pure helpers, no React, no Firebase).
 *
 * Inside the Android APK the Capacitor WebView has no webkitSpeechRecognition,
 * so the native @capacitor-community/speech-recognition plugin is used there.
 * The plugin object is passed in, so this file is testable with a fake plugin.
 *
 * Android plugin quirks handled here (plugin 7.0.1):
 *  - with partialResults:true, start() resolves at once; text arrives only via
 *    the "partialResults" event (the final result too, slightly after speech ends);
 *  - stop() never resolves on Android, so it is never awaited;
 *  - a recognition error after start() is not reported to JS, so isListening()
 *    is polled and a safety time limit ends the session.
 */

export const VOICE_LANGUAGES = ['hi-IN', 'en-IN'] as const;

export const VOICE_MESSAGES = {
  denied: 'माइक की अनुमति नहीं मिली। फ़ोन की Settings → Apps → Ankur Dryice → Permissions में Microphone चालू करें, फिर दोबारा माइक दबाएँ।',
  unavailable: 'इस फ़ोन में बोलकर लिखने की सुविधा उपलब्ध नहीं है। Google ऐप / Speech Services चालू करें, या सवाल टाइप करें।',
  failed: 'आवाज़ समझ नहीं आई। माइक दबाकर फिर से साफ़ बोलें।',
} as const;

export type VoiceProblem = keyof typeof VOICE_MESSAGES;

type PermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | string;

export interface NativeSpeechPlugin {
  available(): Promise<{ available: boolean }>;
  checkPermissions(): Promise<{ speechRecognition: PermissionState }>;
  requestPermissions(): Promise<{ speechRecognition: PermissionState }>;
  start(options: { language: string; maxResults?: number; partialResults?: boolean; popup?: boolean; prompt?: string }): Promise<unknown>;
  stop(): Promise<void>;
  isListening?(): Promise<{ listening: boolean }>;
  addListener(event: 'partialResults', fn: (data: { matches?: string[] }) => void): Promise<unknown> | unknown;
  addListener(event: 'listeningState', fn: (data: { status?: string }) => void): Promise<unknown> | unknown;
  removeAllListeners(): Promise<void>;
}

export interface VoiceCallbacks {
  /** Latest recognised text (partial or final): fill the chat input with it. */
  onText: (text: string) => void;
  /** Session finished (stopped by tap, silence, error or time limit). Called once. */
  onEnd: () => void;
  /** A problem the user must see, with its Hindi message. */
  onProblem: (problem: VoiceProblem, message: string) => void;
}

export interface VoiceOptions {
  languages?: readonly string[];
  pollMs?: number;
  /** Wait after listening stops so the final result event can still fill the input. */
  graceMs?: number;
  /** Safety limit for one session. */
  maxMs?: number;
  /** An attempt that ends this fast with no text is treated as "language not supported": try the next language. */
  quickFailMs?: number;
  now?: () => number;
}

export interface VoiceSession { stop: () => void }

/** First non-empty recognised alternative, trimmed. */
export function bestMatch(matches: unknown): string {
  if (!Array.isArray(matches)) return '';
  for (const m of matches) if (typeof m === 'string' && m.trim()) return m.trim();
  return '';
}

/** Recognition language for the browser (Web Speech) path: same as before. */
export function webVoiceLanguage(appLanguage: string): string {
  return appLanguage === 'hi' ? 'hi-IN' : 'en-IN';
}

function isPermissionError(error: unknown): boolean {
  const text = String((error as any)?.message ?? error ?? '').toLowerCase();
  return text.includes('permission');
}
function isUnavailableError(error: unknown): boolean {
  const text = String((error as any)?.message ?? error ?? '').toLowerCase();
  return text.includes('not available') || text.includes('unavailable') || (error as any)?.code === 'UNAVAILABLE' || (error as any)?.code === 'UNIMPLEMENTED';
}

/** Microphone permission: check, ask once if needed. */
export async function ensureVoicePermission(plugin: NativeSpeechPlugin): Promise<boolean> {
  try {
    const current = await plugin.checkPermissions();
    if (current?.speechRecognition === 'granted') return true;
  } catch { /* fall through to request */ }
  try {
    const asked = await plugin.requestPermissions();
    return asked?.speechRecognition === 'granted';
  } catch {
    return false;
  }
}

/**
 * Starts native listening (hi-IN first, en-IN fallback, partial results, no popup).
 * Returns a session whose stop() ends listening (second tap), or null when it
 * could not start (onProblem and onEnd have then been called).
 */
export async function startNativeVoice(plugin: NativeSpeechPlugin, cb: VoiceCallbacks, options: VoiceOptions = {}): Promise<VoiceSession | null> {
  const languages = options.languages?.length ? options.languages : VOICE_LANGUAGES;
  const pollMs = options.pollMs ?? 1000;
  const graceMs = options.graceMs ?? 1500;
  const maxMs = options.maxMs ?? 30000;
  const quickFailMs = options.quickFailMs ?? 1200;
  const now = options.now ?? (() => Date.now());

  let ended = false;
  let gotText = false;
  let attemptStartedAt = 0;
  let languageIndex = 0;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let limitTimer: ReturnType<typeof setTimeout> | null = null;
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  let stopping = false;
  let starting = false;

  const clearTimers = () => {
    if (pollTimer) clearInterval(pollTimer);
    if (limitTimer) clearTimeout(limitTimer);
    if (graceTimer) clearTimeout(graceTimer);
    pollTimer = limitTimer = graceTimer = null;
  };
  const finish = () => {
    if (ended) return;
    ended = true;
    clearTimers();
    try { void Promise.resolve(plugin.removeAllListeners()).catch(() => {}); } catch { /* ignore */ }
    cb.onEnd();
  };
  const fail = (problem: VoiceProblem) => {
    if (ended) return;
    cb.onProblem(problem, VOICE_MESSAGES[problem]);
    finish();
  };
  // Listening stopped: retry the next language on an instant empty failure, else wait for the final result.
  const onListeningStopped = () => {
    if (ended || graceTimer || starting) return;
    if (!stopping && !gotText && now() - attemptStartedAt < quickFailMs && languageIndex + 1 < languages.length) {
      languageIndex += 1;
      void attempt();
      return;
    }
    graceTimer = setTimeout(() => {
      if (!gotText && !stopping) cb.onProblem('failed', VOICE_MESSAGES.failed);
      finish();
    }, graceMs);
  };
  const stopNow = () => {
    if (ended || stopping) return;
    stopping = true;
    // Android plugin 7.0.1: stop() never resolves; never await it.
    try { void Promise.resolve(plugin.stop()).catch(() => {}); } catch { /* ignore */ }
    // Keep listeners a moment so the final result can still fill the input.
    if (!graceTimer) graceTimer = setTimeout(finish, graceMs);
  };

  async function attempt(): Promise<boolean> {
    starting = true;
    try {
      const ok = await tryLanguages();
      // A retry that started after the user already stopped: switch the mic off again.
      if (ok && (ended || stopping)) { try { void Promise.resolve(plugin.stop()).catch(() => {}); } catch { /* ignore */ } }
      return ok;
    } finally { starting = false; }
  }
  async function tryLanguages(): Promise<boolean> {
    while (languageIndex < languages.length) {
      attemptStartedAt = now();
      try {
        await plugin.start({ language: languages[languageIndex], maxResults: 3, partialResults: true, popup: false });
        return true;
      } catch (error) {
        if (isPermissionError(error)) { fail('denied'); return false; }
        if (isUnavailableError(error)) { fail('unavailable'); return false; }
        languageIndex += 1;
      }
    }
    fail('failed');
    return false;
  }

  try {
    const { available } = await plugin.available();
    if (!available) { fail('unavailable'); return null; }
  } catch {
    fail('unavailable');
    return null;
  }
  if (!(await ensureVoicePermission(plugin))) { fail('denied'); return null; }

  try { await plugin.removeAllListeners(); } catch { /* none yet */ }
  try {
    await plugin.addListener('partialResults', (data) => {
      if (ended) return;
      const text = bestMatch(data?.matches);
      if (text) { gotText = true; cb.onText(text); }
    });
    await plugin.addListener('listeningState', (data) => {
      if (data?.status === 'stopped') onListeningStopped();
    });
  } catch {
    fail('unavailable');
    return null;
  }

  if (!(await attempt())) return null;

  limitTimer = setTimeout(stopNow, maxMs);
  if (plugin.isListening) {
    pollTimer = setInterval(() => {
      if (ended || graceTimer || !plugin.isListening) return;
      plugin.isListening().then((state) => { if (state && state.listening === false) onListeningStopped(); }).catch(() => {});
    }, pollMs);
  }
  return { stop: stopNow };
}
