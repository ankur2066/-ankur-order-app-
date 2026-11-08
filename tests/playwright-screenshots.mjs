import { chromium } from 'playwright';
import { readdir, readFile, mkdir } from 'node:fs/promises';

const cssFile = (await readdir(new URL('../dist/assets/', import.meta.url))).find(f => f.endsWith('.css'));
const css = await readFile(new URL(`../dist/assets/${cssFile}`, import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });
const cards = [
  ['owner-home', 'Owner Home', '<div class="grid grid-cols-2 gap-3"><article class="c-card p-4">Orders<strong>67</strong></article><article class="c-card p-4">Pending<strong>8</strong></article><article class="c-card p-4">Today morning<strong>14</strong></article><article class="c-card p-4">Dispatched<strong>15</strong></article></div>'],
  ['all-orders', 'All Orders', '<article class="c-card p-4"><b>#ADI-TEST-018</b><p>Customer · Lucknow · 10 kg</p><span class="px-3 py-1 rounded-full bg-indigo-100 text-indigo-900">Dispatched</span><p>Dispatch · Today evening</p></article>'],
  ['feature-controls', 'Feature controls', '<article class="c-card p-4"><h2 class="font-bold">Feature controls</h2><p>All optional features start off.</p><div class="grid gap-2"><label class="flex justify-between c-card p-3">Loyalty <input type="checkbox"></label><label class="flex justify-between c-card p-3">Promotions <input type="checkbox"></label><label class="flex justify-between c-card p-3">Inventory <input type="checkbox"></label></div></article>'],
  ['staff-packing', 'Staff Packing', '<article class="c-card p-4"><h2 class="font-bold">Packing · Lucknow stop</h2><p>#ADI-TEST-018 · Ananya · 10 kg</p><div class="flex gap-2"><button class="c-brand rounded-full px-4 py-2">Packing</button><button class="c-card px-4 py-2">Dispatch</button></div></article>'],
  ['payment', 'Payment', '<article class="c-card p-4 text-center"><h2 class="font-bold">UPI payment</h2><div class="mx-auto my-4 grid h-36 w-36 place-items-center rounded-xl border-4 border-dashed b-line">QR preview</div><strong>₹600 · verification pending</strong><p class="my-2">paytm.s26ykus@pty</p><button class="c-brand rounded-full px-4 py-2">Pay with UPI app</button><p class="mt-3">Backup UPI · Copy</p></article>'],
];
await mkdir(new URL('../artifacts/screenshots/', import.meta.url), { recursive: true });
try {
  for (const [name, title, body] of cards) {
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main class="max-w-xl mx-auto min-h-screen p-4 bg-slate-50 text-slate-900"><header class="mb-4 font-bold">Ankur Dryice · ${title}</header>${body}</main></body></html>`);
    await page.addStyleTag({ content: css });
    await page.screenshot({ path: new URL(`../artifacts/screenshots/${name}.png`, import.meta.url), fullPage: true });
  }
} finally { await browser.close(); }
