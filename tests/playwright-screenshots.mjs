import { chromium } from 'playwright';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Mock-data screen previews rendered with the BUILT app stylesheet (dist/assets/*.css),
// so token colours, soft 3D shadows, pill tabs and stop tags come from the real CSS.
// No Firebase, no network, no customer data.
const cssFile = (await readdir(new URL('../dist/assets/', import.meta.url))).find(f => f.endsWith('.css'));
const css = await readFile(new URL(`../dist/assets/${cssFile}`, import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });

const stops = [
  { id: 'alambagh', name: 'Alambagh', color: 'teal', count: 3, kg: 42 },
  { id: 'kaiserbagh', name: 'Kaiserbagh', color: 'orange', count: 2, kg: 25 },
  { id: 'bus-stop-3', name: 'Bus Stop 3', color: 'violet', count: 1, kg: 10 },
];
const local = { id: 'LOCAL', name: 'Local', color: 'local', count: 3, kg: 18, sub: 'Porter 1 · Dukan pickup 1 · Local delivery 1' };
const pills = (selected) => `<div class="packing-stop-pills">${[...stops, local].map(s => `<button class="stop-pill stop-tag-${s.color}" aria-pressed="${s.id === selected}"><span>${s.name}</span><b>${s.count}</b>${s.sub ? `<small class="block">${s.sub}</small>` : ''}</button>`).join('')}</div>`;
const card = (name, district, kg, tag, color, actions) => `<li class="packing-card soft-card-inset p-3 space-y-2"><div class="flex justify-between gap-2"><b>${name}</b><span class="stop-chip stop-tag-${color}">${tag}</span></div><p class="text-sm">${district} · <b>${kg} KG</b> · 2 box</p><div class="flex gap-2"><span class="status-chip status-pending">Pending</span></div><div class="grid grid-cols-2 gap-2"><button class="soft-button status-action status-packing">Packing done</button><button class="soft-button status-action ${actions === 'local' ? 'status-delivered">Handed over' : 'status-dispatch">Dispatched'}</button></div></li>`;
const staffPacking = (stop) => {
  const isLocal = stop.id === 'LOCAL';
  const orders = isLocal
    ? [card('Mohan', 'Lucknow', 5, 'Porter', 'local', 'local'), card('Sita', 'Lucknow', 3, 'Dukan pickup', 'local', 'local'), card('Ravi', 'Lucknow', 10, 'Local delivery', 'local', 'local')]
    : Array.from({ length: stop.count }, (_, i) => card(['Ram', 'Shyam', 'Gita'][i], ['Sitapur', 'Barabanki', 'Hardoi'][i], Math.round(stop.kg / stop.count), stop.name, stop.color, 'bus'));
  return `<section class="packing-board soft-card space-y-3"><div class="flex justify-between"><h2 class="text-lg font-black">Packing</h2><div class="flex gap-2"><button class="pill-tab" aria-pressed="true">Aaj</button><button class="pill-tab" aria-pressed="false">Kal</button></div></div><p class="text-sm t-sub">2026-11-11 · 9 order · 95 KG</p>${pills(stop.id)}<div class="flex justify-between"><p class="font-bold">${stop.name} · ${stop.count} order · <span class="packing-total">${stop.kg} KG</span></p><button class="soft-button secondary-button">Share (WhatsApp)</button></div><ul class="space-y-2">${orders.join('')}</ul></section>`;
};
const statusTiles = ['total', 'pending', 'confirmed', 'packing', 'dispatch', 'delivered'].map((k, i) => `<div class="status-tile status-${k} rounded-xl p-2 text-center"><b class="block">${[67, 8, 6, 9, 15, 29][i]}</b><span>${k[0].toUpperCase() + k.slice(1)}</span></div>`).join('');

const cards = [
  ['owner-home', 'Owner Home', `<nav class="owner-segmented-nav mb-4"><button aria-pressed="true">Orders (67)</button><button aria-pressed="false">Customers</button><button aria-pressed="false">Tools aur Settings</button></nav><section class="soft-card mb-3"><h3 class="font-bold">Aaj · summary</h3><div class="grid grid-cols-3 gap-2 mt-2">${statusTiles}</div></section><section class="packing-board soft-card space-y-3"><h2 class="text-lg font-black">Packing by stop</h2>${pills(null)}</section>`],
  ['all-orders', 'All Orders', `<div class="flex flex-wrap gap-2 mb-3"><span class="status-chip status-total">All 67</span><span class="status-chip status-pending">Pending 8</span><span class="status-chip status-confirmed">Confirmed 6</span><span class="status-chip status-packing">Packing 9</span><span class="status-chip status-dispatch">Dispatched 15</span><span class="status-chip status-delivered">Delivered 29</span></div>${pills('alambagh')}<article class="owner-order-card p-4 mt-3"><b>#ADI-TEST-018</b><p>Ram · Sitapur · 10 kg</p><span class="status-chip status-dispatch">Dispatched</span> <span class="stop-chip stop-tag-teal">Bus · Alambagh</span><p class="ankur-order-card-details p-2 mt-2">Dispatch · Today, Evening · ₹600 · Verification pending</p></article>`],
  ['feature-controls', 'Feature controls', `<section class="feature-controls soft-card space-y-3"><h2 class="font-black">Feature controls</h2><p class="text-sm t-sub">All fourteen optional features start off.</p>${[['Loyalty', 'Owner-managed rewards policy and points.', true], ['Promotions', 'Owner-approved promotional codes and offers.', false], ['Inventory', 'Track owner-entered stock and SKUs.', true], ['Rate Card', 'Show owner-entered rates to customers.', false]].map(([l, d, on]) => `<label class="feature-toggle-row flex min-h-14 items-center justify-between gap-3 rounded-2xl p-3"><span><b class="block">${l}</b><small class="block">${d}</small></span><input type="checkbox" role="switch" ${on ? 'checked' : ''}></label>`).join('')}</section>`],
  ...[...stops, local].map((stop) => [`staff-packing-${stop.id.toLowerCase()}`, `Staff Packing · ${stop.name}`, staffPacking(stop)]),
  ['bus-stop-settings', 'Bus stop settings', `<section class="soft-card space-y-3"><h2 class="text-lg font-black">Bus stops</h2><p class="text-sm t-sub">Inactive stop naye orders me nahi dikhega.</p>${stops.map((s, i) => `<div class="feature-toggle-row flex items-center gap-2 rounded-2xl p-3"><span class="stop-chip stop-tag-${s.color}">${s.name.slice(0, 2).toUpperCase()}</span><input class="delivery-select flex-1 rounded-xl p-2" value="${s.name}"><label class="flex items-center gap-2 text-sm font-bold">${i === 2 ? 'Inactive' : 'Active'} <input type="checkbox" role="switch" ${i === 2 ? '' : 'checked'}></label></div>`).join('')}<h3 class="font-bold">District → Bus stop</h3><p class="soft-card-inset p-2 text-sm"><b>sitapur</b> → Alambagh</p><button class="soft-button primary-button">Save</button></section>`],
  ['payment', 'Payment', `<section class="payment-options space-y-3 rounded-2xl p-4 text-center"><h3 class="font-bold">Pay by UPI</h3><div class="mx-auto grid h-36 w-36 place-items-center rounded-xl border-4 border-dashed b-line">QR (bundled)</div><strong>₹600 · Verification pending</strong><div class="flex flex-wrap items-center justify-center gap-2"><button class="soft-button primary-button">Pay with UPI app</button><span class="font-mono text-sm">paytm.s26ykus@pty</span><button class="soft-button secondary-button">Copy UPI ID</button></div><div class="backup-upi rounded-xl p-3"><p class="text-sm">QR se payment na ho to is UPI ID par bhejein: <strong class="font-mono">ankur.singh332066@okhdfcbank</strong></p><button class="soft-button secondary-button">Copy</button><button class="soft-button secondary-button mt-2">Dusre UPI se pay karein</button></div></section>`],
];
await mkdir(new URL('../artifacts/screenshots/', import.meta.url), { recursive: true });
try {
  for (const [name, title, body] of cards) {
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="c-app"><main class="max-w-xl mx-auto min-h-screen p-4" style="background:var(--app-bg);color:var(--text-main)"><header class="mb-4 font-bold">Ankur Dryice · ${title}</header>${body}</main></body></html>`);
    await page.addStyleTag({ content: css });
    await page.screenshot({ path: fileURLToPath(new URL(`../artifacts/screenshots/${name}.png`, import.meta.url)), fullPage: true });
  }
  console.log(`Captured ${cards.length} mock-data screenshots`);
} finally { await browser.close(); }
