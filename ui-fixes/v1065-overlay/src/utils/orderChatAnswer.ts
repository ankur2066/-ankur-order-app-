/**
 * Owner AI chat (v1.0.66): answer common order questions locally from the orders
 * already loaded in the owner dashboard. No server, no deploy, no paid AI call.
 * Dates are Asia/Kolkata calendar days (YYYY-MM-DD).
 */
export interface ChatOrder {
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  quantityKg?: number;
  totalAmount?: number;
  customerTotal?: number;
  status?: string;
  paymentStatus?: string;
  dispatchDate?: string;
  bookedDate?: string | null; // IST booking day, computed by the caller
}

export type ChatLanguage = 'hi' | 'en';

export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return t.toISOString().slice(0, 10);
}

const money = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const amountOf = (o: ChatOrder) => Number(o.customerTotal ?? o.totalAmount ?? 0) || 0;
const active = (o: ChatOrder) => o.status !== 'cancelled';

function summary(list: ChatOrder[], hi: boolean): string {
  const kg = list.reduce((s, o) => s + (Number(o.quantityKg) || 0), 0);
  const amount = list.reduce((s, o) => s + amountOf(o), 0);
  const unpaid = list.filter(o => o.paymentStatus !== 'payment_verified');
  const due = unpaid.reduce((s, o) => s + amountOf(o), 0);
  const pending = list.filter(o => o.status === 'pending').length;
  return hi
    ? `${list.length} ऑर्डर · ${kg} KG · ${money(amount)} · भुगतान बाकी ${unpaid.length} (${money(due)}) · पेंडिंग ${pending}`
    : `${list.length} orders · ${kg} KG · ${money(amount)} · payment due ${unpaid.length} (${money(due)}) · pending ${pending}`;
}

function parseExplicitDates(q: string, today: string): string[] {
  const out: string[] = [];
  for (const m of q.matchAll(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g)) out.push(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`);
  for (const m of q.matchAll(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](20\d{2}))?\b/g)) {
    const y = m[3] || today.slice(0, 4);
    out.push(`${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  }
  return out;
}

/** Returns a reply, or null when the question is not about order numbers. */
export function answerOrderQuestion(question: string, orders: ChatOrder[], today: string, language: ChatLanguage): string | null {
  const hi = language === 'hi';
  const q = question.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!q) return null;
  const list = orders.filter(active);
  const lines: string[] = [];
  const byDay = (day: string) => {
    const booked = list.filter(o => o.bookedDate === day);
    const dispatch = list.filter(o => o.dispatchDate === day);
    return hi
      ? `${day}\n• बुक हुए: ${summary(booked, hi)}\n• इस दिन डिस्पैच: ${summary(dispatch, hi)}`
      : `${day}\n• Booked: ${summary(booked, hi)}\n• Dispatch on this day: ${summary(dispatch, hi)}`;
  };
  const wantsToday = /आज|aaj|today/.test(q);
  const wantsKal = /(^|[^a-z])kal([^a-z]|$)|कल/.test(q);
  const wantsTomorrow = /tomorrow/.test(q);
  const wantsYesterday = /yesterday/.test(q);
  const wantsParso = /परसों|parso|parson/.test(q);
  const explicit = parseExplicitDates(q, today);
  if (wantsToday) lines.push((hi ? 'आज · ' : 'Today · ') + byDay(today));
  if (wantsKal || wantsYesterday) lines.push((hi ? 'बीता कल · ' : 'Yesterday · ') + byDay(addDays(today, -1)));
  if (wantsKal || wantsTomorrow) lines.push((hi ? 'आने वाला कल · ' : 'Tomorrow · ') + byDay(addDays(today, 1)));
  if (wantsParso) lines.push((hi ? 'परसों · ' : 'Day after tomorrow · ') + byDay(addDays(today, 2)));
  for (const day of explicit) lines.push(byDay(day));
  if (wantsToday && (wantsKal || wantsTomorrow)) {
    const both = list.filter(o => o.dispatchDate === today || o.dispatchDate === addDays(today, 1));
    lines.push((hi ? 'आज + कल का डिस्पैच मिलाकर: ' : 'Today + tomorrow dispatch together: ') + summary(both, hi));
  }
  // Customer lookup by name word or last digits of mobile.
  if (!lines.length) {
    const digits = q.match(/\b\d{4,10}\b/)?.[0];
    const words = q.split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 3);
    const matches = list.filter(o => {
      const name = (o.customerName || '').toLowerCase();
      const phone = (o.customerPhone || '').replace(/\D/g, '');
      return (digits && phone.endsWith(digits)) || (name && words.some(w => name.split(/\s+/).includes(w)));
    });
    if (matches.length) {
      const name = matches[0].customerName || '';
      lines.push((hi ? `ग्राहक ${name}: ` : `Customer ${name}: `) + summary(matches, hi));
    }
  }
  if (!lines.length && /कुल|total|सभी|sab|all|kitne|कितने|ऑर्डर|order/.test(q)) {
    lines.push((hi ? 'सभी सक्रिय ऑर्डर: ' : 'All active orders: ') + summary(list, hi));
    const unpaid = list.filter(o => o.paymentStatus !== 'payment_verified');
    if (/बाकी|due|udhar|उधार|payment|भुगतान/.test(q)) lines.push((hi ? 'भुगतान बाकी: ' : 'Payment due: ') + summary(unpaid, hi));
  }
  return lines.length ? lines.join('\n\n') : null;
}
