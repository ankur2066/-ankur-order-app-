import type { FirebaseApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import { CustomProvider, getToken, initializeAppCheck } from 'firebase/app-check';

// Android is registered with Firebase App Check / Play Integrity.
// Do not use the debug attestation provider in release builds.
// Web App Check is deliberately OFF until the Web apps are registered.
let ready = false;
export function isAndroidAppCheckReady(): boolean {
  return Capacitor.getPlatform() === 'android' && ready;
}

export async function initializeAndroidAppCheck(app: FirebaseApp): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;

  // Native Play Integrity token -> Firebase JS SDK custom provider.
  // The app uses JS Firestore, JS Auth, and JS httpsCallable; connecting
  // both layers is necessary for callable requests to carry App Check.
  await FirebaseAppCheck.initialize({ isTokenAutoRefreshEnabled: true });
  const provider = new CustomProvider({
    getToken: async () => {
      const { token, expireTimeMillis } = await FirebaseAppCheck.getToken({ forceRefresh: false });
      if (!token || !expireTimeMillis || expireTimeMillis <= Date.now()) {
        throw new Error('Native Play Integrity did not return a usable App Check token');
      }
      return { token, expireTimeMillis };
    },
  });
  const jsAppCheck = initializeAppCheck(app, {
    provider,
    isTokenAutoRefreshEnabled: true,
  });
  const result = await getToken(jsAppCheck);
  if (!result.token) throw new Error('Firebase JS SDK App Check verification failed');
  ready = true;
}
