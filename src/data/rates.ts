import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { RateSettings } from '../types';
import { RETAIL_RATE_PER_KG, WHOLESALE_RATE_PER_KG } from '../config/businessConfig';

export const DEFAULT_RATES: RateSettings = {
  dryIceRate: RETAIL_RATE_PER_KG,
  thermocolRate: 10,
  transportRate: 0,
  ...(WHOLESALE_RATE_PER_KG > 0 ? { wholesaleRate: WHOLESALE_RATE_PER_KG } : {}),
};

const LOCAL_STORAGE_KEY = 'ankur_dryice_rates_v1';

export function getLocalRates(): RateSettings {
  if (typeof window === 'undefined') return DEFAULT_RATES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.dryIceRate === 'number' && typeof parsed.thermocolRate === 'number') {
        return {
          dryIceRate: parsed.dryIceRate,
          thermocolRate: parsed.thermocolRate,
          transportRate: parsed.transportRate || 0,
          wholesaleRate: typeof parsed.wholesaleRate === 'number' && parsed.wholesaleRate > 0 ? parsed.wholesaleRate : undefined,
        };
      }
    }
  } catch (err) {
    console.error('Error reading local rates:', err);
  }
  return DEFAULT_RATES;
}

export function saveLocalRates(rates: RateSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rates));
  } catch (err) {
    console.error('Error saving local rates:', err);
  }
}

export async function fetchCurrentRates(): Promise<RateSettings> {
  try {
    const ratesRef = doc(db, 'settings', 'rates');
    const snap = await getDoc(ratesRef);
    if (snap.exists()) {
      const data = snap.data();
      const loaded: RateSettings = {
        dryIceRate: typeof data.dryIceRate === 'number' ? data.dryIceRate : DEFAULT_RATES.dryIceRate,
        thermocolRate: typeof data.thermocolRate === 'number' ? data.thermocolRate : DEFAULT_RATES.thermocolRate,
        transportRate: typeof data.transportRate === 'number' ? data.transportRate : 0,
        wholesaleRate: typeof data.wholesaleRate === 'number' && data.wholesaleRate > 0 ? data.wholesaleRate : undefined,
      };
      saveLocalRates(loaded);
      return loaded;
    }
  } catch (err) {
    // If settings doc not yet created or permission pending, gracefully fall back to local storage
    console.warn('Using local rates cache fallback:', err);
  }
  return getLocalRates();
}

export async function saveCurrentRates(rates: RateSettings): Promise<void> {
  // Always update local cache immediately
  saveLocalRates(rates);

  try {
    const ratesRef = doc(db, 'settings', 'rates');
    // Firestore queues the write offline and resolves only on server ack,
    // which can hang the "सेव हो रहा है..." button. Wait at most 8 s; the
    // queued write still syncs in the background after that.
    const write = setDoc(ratesRef, {
      dryIceRate: rates.dryIceRate,
      thermocolRate: rates.thermocolRate,
      transportRate: rates.transportRate || 0,
      wholesaleRate: typeof rates.wholesaleRate === 'number' && rates.wholesaleRate > 0 ? rates.wholesaleRate : 0,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    const timedOut = await Promise.race([
      write.then(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 8000)),
    ]);
    if (timedOut) {
      write.catch((e) => console.error('Rates sync failed later:', e));
    }
  } catch (err) {
    console.error('Failed to sync rates to Firestore settings:', err);
    // Even if firestore write failed, local storage is preserved
    throw err;
  }
}

export function subscribeToRates(onUpdate: (rates: RateSettings) => void): () => void {
  // Emit initial local rates immediately
  onUpdate(getLocalRates());

  try {
    const ratesRef = doc(db, 'settings', 'rates');
    const unsub = onSnapshot(ratesRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const loaded: RateSettings = {
          dryIceRate: typeof data.dryIceRate === 'number' ? data.dryIceRate : DEFAULT_RATES.dryIceRate,
          thermocolRate: typeof data.thermocolRate === 'number' ? data.thermocolRate : DEFAULT_RATES.thermocolRate,
          transportRate: typeof data.transportRate === 'number' ? data.transportRate : 0,
          wholesaleRate: typeof data.wholesaleRate === 'number' && data.wholesaleRate > 0 ? data.wholesaleRate : undefined,
        };
        saveLocalRates(loaded);
        onUpdate(loaded);
      }
    }, (err) => {
      console.warn('Realtime rates subscription fallback:', err);
    });
    return unsub;
  } catch (err) {
    console.warn('Failed to setup rates listener:', err);
    return () => {};
  }
}
