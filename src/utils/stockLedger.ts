/**
 * v1.0.75 (Ankur, 13 Nov 2026) simple stock ledger (pure helpers, no Firebase).
 * Spark plan: client Firestore writes only, no Cloud Functions.
 *  - Entries are IN or OUT in KG; nobody can edit or delete an entry.
 *    A mistake is corrected with a reverse entry (reverseStockEntry).
 *  - At most 5 accounts use it: the owner login (always on) + up to 4 accounts
 *    the owner switches on (Ankur's own ID and up to 3 staff).
 */
export type StockEntryType = 'in' | 'out';
export interface StockEntry {
  id?: string;
  type: StockEntryType;
  kg: number;
  note?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: any;
}

export const STOCK_MAX_ACCOUNTS = 5;
/** Owner login always has access, so the switch list holds at most 4 accounts. */
export const STOCK_MAX_SWITCHED = STOCK_MAX_ACCOUNTS - 1;
export const STOCK_MAX_KG = 100000;
export const STOCK_NOTE_MAX = 200;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** KG typed by the user -> positive number with at most 2 decimals, or null. */
export function parseStockKg(text: string | number): number | null {
  const raw = String(text ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const kg = Number(raw);
  if (!Number.isFinite(kg) || kg <= 0 || kg > STOCK_MAX_KG) return null;
  return round2(kg);
}

export type StockValidation = { ok: true; type: StockEntryType; kg: number; note: string } | { ok: false; hi: string; en: string };

export function validateStockEntry(type: string, kgText: string | number, note = ''): StockValidation {
  if (type !== 'in' && type !== 'out') return { ok: false, hi: 'IN या OUT चुनें।', en: 'Choose IN or OUT.' };
  const kg = parseStockKg(kgText);
  if (kg === null) return { ok: false, hi: `सही KG लिखें (0 से ज़्यादा, ${STOCK_MAX_KG} तक, 2 दशमलव तक)।`, en: `Enter valid KG (more than 0, up to ${STOCK_MAX_KG}, max 2 decimals).` };
  const clean = String(note || '').trim();
  if (clean.length > STOCK_NOTE_MAX) return { ok: false, hi: `नोट ${STOCK_NOTE_MAX} अक्षर तक।`, en: `Note up to ${STOCK_NOTE_MAX} characters.` };
  return { ok: true, type, kg, note: clean };
}

const signed = (e: StockEntry) => (e.type === 'in' ? 1 : e.type === 'out' ? -1 : 0) * (Number(e.kg) || 0);

/** Current stock in KG = total IN - total OUT. */
export function stockBalance(entries: StockEntry[]): number {
  return round2(entries.reduce((sum, e) => sum + signed(e), 0));
}

export function stockTotals(entries: StockEntry[]): { inKg: number; outKg: number; balance: number } {
  const inKg = round2(entries.filter((e) => e.type === 'in').reduce((s, e) => s + (Number(e.kg) || 0), 0));
  const outKg = round2(entries.filter((e) => e.type === 'out').reduce((s, e) => s + (Number(e.kg) || 0), 0));
  return { inKg, outKg, balance: round2(inKg - outKg) };
}

const seconds = (e: StockEntry) => {
  const t = e.createdAt;
  if (!t) return Number.MAX_SAFE_INTEGER; // pending server timestamp = newest
  if (typeof t.seconds === 'number') return t.seconds + (t.nanoseconds || 0) / 1e9;
  if (typeof t.toMillis === 'function') return t.toMillis() / 1000;
  const d = new Date(t).getTime();
  return Number.isFinite(d) ? d / 1000 : 0;
};

/** Newest first, each row with the running balance right after that entry. */
export function withRunningBalance<T extends StockEntry>(entries: T[]): Array<T & { balanceAfter: number }> {
  const oldestFirst = [...entries].sort((a, b) => seconds(a) - seconds(b));
  let running = 0;
  const rows = oldestFirst.map((e) => { running = round2(running + signed(e)); return { ...e, balanceAfter: running }; });
  return rows.reverse();
}

/** The correction for a wrong entry: same KG, opposite direction. */
export function reverseStockEntry(entry: StockEntry): { type: StockEntryType; kg: number; note: string } {
  const label = entry.id ? ` #${entry.id.slice(0, 6)}` : '';
  return { type: entry.type === 'in' ? 'out' : 'in', kg: round2(Number(entry.kg) || 0), note: `Correction (reverse)${label}`.slice(0, STOCK_NOTE_MAX) };
}

export const normalizeStockEmail = (email: string) => String(email || '').trim().toLowerCase();

/**
 * Owner switch for one account. Returns the new switch list, or an error when
 * turning on a 5th switched account (owner + 4 = 5 accounts max).
 */
export function nextStockAccessEmails(current: string[], email: string, enable: boolean): { ok: true; emails: string[] } | { ok: false; hi: string; en: string } {
  const target = normalizeStockEmail(email);
  const list = Array.from(new Set((current || []).map(normalizeStockEmail).filter(Boolean)));
  if (!target) return { ok: false, hi: 'Email नहीं मिला।', en: 'Email missing.' };
  if (!enable) return { ok: true, emails: list.filter((e) => e !== target) };
  if (list.includes(target)) return { ok: true, emails: list };
  if (list.length >= STOCK_MAX_SWITCHED) {
    return { ok: false, hi: `स्टॉक अधिकतम ${STOCK_MAX_ACCOUNTS} ID (मालिक सहित) चला सकते हैं। पहले किसी और का Stock बंद करें।`, en: `Stock is limited to ${STOCK_MAX_ACCOUNTS} accounts (owner included). Turn one off first.` };
  }
  return { ok: true, emails: [...list, target] };
}
