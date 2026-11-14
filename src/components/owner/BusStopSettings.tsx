import React, { useEffect, useState } from 'react';
import { STOP_PALETTE } from '../../theme/designTokens';
import { subscribeDeliverySettings, saveDeliverySettings } from '../../services/deliverySettings';
import { DEFAULT_DELIVERY_SETTINGS, districtKey, slugStopId, isRetiredStop, type BusStop, type DeliverySettings } from '../../utils/delivery';

/** Owner-only: bus stops (add, rename, colour, Active/Inactive) and district -> stop mapping. */
export function BusStopSettings() {
  const [settings, setSettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  const [draft, setDraft] = useState<DeliverySettings | null>(null);
  const [newStop, setNewStop] = useState('');
  const [district, setDistrict] = useState('');
  const [districtStop, setDistrictStop] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => subscribeDeliverySettings(setSettings), []);
  const view = draft || settings;
  const edit = (next: DeliverySettings) => setDraft(next);
  const updateStop = (id: string, patch: Partial<BusStop>) => edit({ ...view, busStops: view.busStops.map((stop) => (stop.id === id ? { ...stop, ...patch } : stop)) });

  const addStop = () => {
    const name = newStop.trim();
    if (name.length < 2) return;
    let id = slugStopId(name);
    while (view.busStops.some((stop) => stop.id === id)) id = `${id}-2`;
    edit({ ...view, busStops: [...view.busStops, { id, name, color: STOP_PALETTE[view.busStops.length % STOP_PALETTE.length].id, active: true }] });
    setNewStop('');
  };
  const addMapping = () => {
    const key = districtKey(district);
    if (!key || !districtStop) return;
    edit({ ...view, districtStopMap: { ...view.districtStopMap, [key]: districtStop } });
    setDistrict(''); setDistrictStop('');
  };
  const removeMapping = (key: string) => {
    const map = { ...view.districtStopMap }; delete map[key];
    edit({ ...view, districtStopMap: map });
  };
  const save = async () => {
    if (!draft) return;
    setSaving(true); setMessage('');
    try { await saveDeliverySettings(draft); setDraft(null); setMessage('Bus stop settings save ho gayi.'); }
    catch { setMessage('Save nahi hua. Owner login aur Firestore rules check karein.'); }
    finally { setSaving(false); }
  };

  return <section className="soft-card space-y-3" aria-labelledby="bus-stop-settings-title">
    <h2 id="bus-stop-settings-title" className="text-lg font-black">Bus stops</h2>
    <p className="text-sm t-sub">Inactive stop naye orders me nahi dikhega. Purane orders apne stop par hi rahenge.</p>
    {/* v1.0.71: retired stops (Bus Stop 3) stay saved as inactive but are not listed. */}
    <ul className="space-y-2">{view.busStops.filter((stop) => !isRetiredStop(stop.id)).map((stop) => <li key={stop.id} className="feature-toggle-row flex flex-wrap items-center gap-2 rounded-2xl p-3">
      <span className={`stop-chip stop-tag-${stop.color}`} aria-hidden="true">{stop.name.slice(0, 2).toUpperCase()}</span>
      <input aria-label={`Rename ${stop.name}`} className="delivery-select flex-1 rounded-xl p-2" value={stop.name} maxLength={60} onChange={(event) => updateStop(stop.id, { name: event.target.value })} />
      <select aria-label={`Colour for ${stop.name}`} className="delivery-select rounded-xl p-2" value={stop.color} onChange={(event) => updateStop(stop.id, { color: event.target.value })}>
        {STOP_PALETTE.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm font-bold">{stop.active ? 'Active' : 'Inactive'}
        <input type="checkbox" role="switch" aria-label={`${stop.name} active`} checked={stop.active} onChange={(event) => updateStop(stop.id, { active: event.target.checked })} />
      </label>
    </li>)}</ul>
    <div className="flex gap-2">
      <input aria-label="New bus stop name" className="delivery-select flex-1 rounded-xl p-2" placeholder="Naya bus stop" value={newStop} onChange={(event) => setNewStop(event.target.value)} />
      <button type="button" className="soft-button secondary-button" onClick={addStop}>Add stop</button>
    </div>

    <h3 className="font-bold">District → Bus stop</h3>
    <ul className="space-y-1">{Object.entries(view.districtStopMap).map(([key, stopId]) => <li key={key} className="flex items-center justify-between gap-2 soft-card-inset p-2 text-sm">
      <span><b>{key}</b> → {view.busStops.find((stop) => stop.id === stopId)?.name || stopId}</span>
      <button type="button" className="soft-button secondary-button" onClick={() => removeMapping(key)} aria-label={`Remove ${key} mapping`}>Remove</button>
    </li>)}</ul>
    <div className="flex flex-wrap gap-2">
      <input aria-label="District" className="delivery-select flex-1 rounded-xl p-2" placeholder="District / city" value={district} onChange={(event) => setDistrict(event.target.value)} />
      <select aria-label="Stop for district" className="delivery-select rounded-xl p-2" value={districtStop} onChange={(event) => setDistrictStop(event.target.value)}>
        <option value="">Stop chunein</option>
        {view.busStops.filter((stop) => stop.active).map((stop) => <option key={stop.id} value={stop.id}>{stop.name}</option>)}
      </select>
      <button type="button" className="soft-button secondary-button" onClick={addMapping}>Map</button>
    </div>
    <div className="flex gap-2">
      <button type="button" className="soft-button primary-button" disabled={!draft || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</button>
      {draft && <button type="button" className="soft-button secondary-button" onClick={() => setDraft(null)}>Cancel</button>}
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}

export default BusStopSettings;
