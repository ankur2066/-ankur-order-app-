import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_DELIVERY_SETTINGS, normalizeDeliverySettings, type DeliverySettings } from '../utils/delivery';

/** settings/delivery: public read (no prices), owner-only write (firestore.rules). */
export const DELIVERY_SETTINGS_REF = () => doc(db, 'settings', 'delivery');

export function subscribeDeliverySettings(onChange: (settings: DeliverySettings) => void): () => void {
  return onSnapshot(DELIVERY_SETTINGS_REF(), (snap) => {
    onChange(snap.exists() ? normalizeDeliverySettings(snap.data()) : DEFAULT_DELIVERY_SETTINGS);
  }, () => onChange(DEFAULT_DELIVERY_SETTINGS));
}

export async function saveDeliverySettings(settings: DeliverySettings): Promise<void> {
  await setDoc(DELIVERY_SETTINGS_REF(), {
    busStops: settings.busStops.map((stop) => ({ id: stop.id, name: stop.name, color: stop.color, active: stop.active })),
    districtStopMap: settings.districtStopMap,
    updatedAt: serverTimestamp(),
  });
}
