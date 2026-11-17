import React from 'react';
import { activeStops, findStop, DELIVERY_MODES, DELIVERY_MODE_LABELS, type DeliveryMode, type DeliverySettings } from '../utils/delivery';

interface Props {
  mode?: DeliveryMode;
  busStopId?: string;
  settings: DeliverySettings;
  onChange: (next: { mode?: DeliveryMode; busStopId?: string }) => void;
  /** Saved default stop that is now inactive/removed: shown, never auto-replaced. */
  staleStopId?: string;
  language?: 'hi' | 'en';
  disabled?: boolean;
}

/** Delivery mode + bus stop chooser. Inactive stops are never offered for new orders. */
export function DeliveryModePicker({ mode, busStopId, settings, onChange, staleStopId, language = 'hi', disabled }: Props) {
  const stops = activeStops(settings);
  const stale = staleStopId ? findStop(settings, staleStopId) : undefined;
  return <fieldset className="delivery-picker space-y-2" disabled={disabled}>
    <legend className="font-bold">{language === 'hi' ? 'डिलीवरी कैसे?' : 'Delivery mode'}</legend>
    {staleStopId && <p role="alert" className="delivery-warning rounded-xl p-2 text-sm">
      {language === 'hi'
        ? `आपका सेव किया बस स्टॉप ${stale ? `"${stale.name}"` : ''} अभी उपलब्ध नहीं है। कृपया नया विकल्प चुनें।`
        : `The saved bus stop ${stale ? `"${stale.name}"` : ''} is not available now. Please choose again.`}
    </p>}
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Delivery mode">
      {DELIVERY_MODES.map((item) => <button type="button" key={item} role="radio" aria-checked={mode === item} className="pill-tab" aria-pressed={mode === item}
        onClick={() => onChange({ mode: item, busStopId: item === 'BUS' ? (busStopId && stops.some((s) => s.id === busStopId) ? busStopId : undefined) : undefined })}>
        {DELIVERY_MODE_LABELS[item][language]}
      </button>)}
    </div>
    {mode === 'BUS' && <label className="block text-sm font-bold">
      {language === 'hi' ? 'बस स्टॉप' : 'Bus stop'}
      <select className="mt-1 block w-full rounded-xl p-3 delivery-select" value={busStopId && stops.some((s) => s.id === busStopId) ? busStopId : ''}
        onChange={(event) => onChange({ mode: 'BUS', busStopId: event.target.value || undefined })} aria-label="Bus stop">
        <option value="">{language === 'hi' ? 'स्टॉप चुनें' : 'Choose stop'}</option>
        {stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.name}</option>)}
      </select>
    </label>}
  </fieldset>;
}

export default DeliveryModePicker;
