/**
 * v1.0.76 (Ankur, 14 Nov 2026): "app kholne pe update nahi ho raha".
 * Customer screens loaded their order data once (getDocs/getDoc) and never
 * re-read it when the app was opened again from the background, so an old
 * status stayed on screen. This helper calls `onResume` whenever the app comes
 * back to the foreground: WebView visibility/focus events plus the native
 * Capacitor `appStateChange` signal (Android can keep the WebView alive
 * without a DOM event). A short gate stops the 2–3 events of one resume from
 * causing 2–3 reads.
 */

export interface ResumeGate {
  /** True when this resume should run (not within `minIntervalMs` of the last one). */
  shouldRun(nowMs?: number): boolean;
}

export function createResumeGate(minIntervalMs = 2000): ResumeGate {
  let last = -Infinity;
  return {
    shouldRun(nowMs = Date.now()) {
      if (nowMs - last < minIntervalMs) return false;
      last = nowMs;
      return true;
    },
  };
}

interface EventTargetLike {
  addEventListener(type: string, cb: () => void): void;
  removeEventListener(type: string, cb: () => void): void;
}

export interface AppResumeOptions {
  minIntervalMs?: number;
  win?: EventTargetLike | null;
  doc?: (EventTargetLike & { visibilityState?: string }) | null;
  /** Native resume source; defaults to Capacitor App.appStateChange inside the APK. */
  native?: ((onActive: () => void) => Promise<() => void>) | null;
}

async function capacitorNativeResume(onActive: () => void): Promise<() => void> {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return () => {};
  const { App } = await import('@capacitor/app');
  const handle = await App.addListener('appStateChange', ({ isActive }) => { if (isActive) onActive(); });
  return () => { void handle.remove(); };
}

/** Subscribes to app foreground/resume. Returns an unsubscribe function. */
export function subscribeAppResume(onResume: () => void, options: AppResumeOptions = {}): () => void {
  const win = options.win !== undefined ? options.win : (typeof window !== 'undefined' ? window : null);
  const doc = options.doc !== undefined ? options.doc : (typeof document !== 'undefined' ? document : null);
  const native = options.native !== undefined ? options.native : capacitorNativeResume;
  const gate = createResumeGate(options.minIntervalMs ?? 2000);
  let active = true;
  const fire = () => { if (active && gate.shouldRun()) onResume(); };
  const onVisible = () => { if (!doc || doc.visibilityState !== 'hidden') fire(); };
  doc?.addEventListener('visibilitychange', onVisible);
  win?.addEventListener('focus', onVisible);
  let removeNative: (() => void) | null = null;
  if (native) {
    native(fire).then((remove) => { if (active) removeNative = remove; else remove(); }).catch(() => { /* DOM events remain */ });
  }
  return () => {
    active = false;
    doc?.removeEventListener('visibilitychange', onVisible);
    win?.removeEventListener('focus', onVisible);
    if (removeNative) removeNative();
  };
}
