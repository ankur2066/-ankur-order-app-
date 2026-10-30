import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order } from '../types';
import { exportPdf } from './mobileReport';

function istParts(date: Date): { year: number; month: number; day: number } {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const n = (kind: string) => Number(p.find(x => x.type === kind)?.value || 0);
  return { year: n('year'), month: n('month'), day: n('day') };
}
function key(year: number, month: number, day: number): string {
  return String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}
function cycle(): { start: string; end: string } {
  const p = istParts(new Date());
  const start = new Date(Date.UTC(p.year, p.month - 1 - (p.day < 15 ? 1 : 0), 15));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 14));
  return {
    start: key(start.getUTCFullYear(), start.getUTCMonth() + 1, 15),
    end: key(end.getUTCFullYear(), end.getUTCMonth() + 1, 14),
  };
}
function timestampDate(value: any): Date | null {
  if (!value) return null;
  const date = typeof value.toDate === 'function' ? value.toDate() :
    typeof value.seconds === 'number' ? new Date(value.seconds * 1000) :
    value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
function orderDate(order: Order): string | null {
  const date = timestampDate(order.createdAt);
  if (date) {
    const p = istParts(date);
    return key(p.year, p.month, p.day);
  }
  // Legacy orders sometimes have no Firestore timestamp; use the embedded order date.
  const m = (order.orderId || '').match(/^ADI-(\d{4})(\d{2})(\d{2})-/);
  return m ? key(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}
function expenseDate(expense: any): string | null {
  const date = timestampDate(expense.date);
  if (!date) return null;
  const p = istParts(date);
  return key(p.year, p.month, p.day);
}
export async function generateMonthlyPDF(orders: Order[], expenses: any[]): Promise<void> {
  // Owner-defined accounting month runs from the 15th through the following 14th, IST.
  const period = cycle();
  const inPeriod = (d: string | null) => !!d && d >= period.start && d <= period.end;
  const sales = orders.filter(o => !o.isTrash && inPeriod(orderDate(o)));
  const costs = expenses.filter(e => inPeriod(expenseDate(e)));
  const sum = (items: any[], field: string) => items.reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
  const booked = sum(sales, 'totalAmount');
  const kg = sum(sales, 'quantityKg');
  const totalCosts = sum(costs, 'amount');
  const verified = sales.filter(o => o.paymentStatus === 'payment_verified').reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  const pdf = new jsPDF();
  pdf.setFontSize(15);
  pdf.text('Ankur Dryice and Events - Accounting Report', 14, 17);
  pdf.setFontSize(10);
  pdf.text('Period (IST): ' + period.start + ' to ' + period.end, 14, 26);
  pdf.text('Orders: ' + sales.length + ' | Quantity: ' + kg + ' KG | Booked: INR ' + booked, 14, 33);
  pdf.text('Payment verified: INR ' + verified + ' | Unverified: INR ' + (booked - verified), 14, 40);
  pdf.text('Expenses: INR ' + totalCosts + ' | Booked less expenses: INR ' + (booked - totalCosts), 14, 47);
  pdf.setFontSize(8);
  pdf.text('Note: Booked value is not the same as verified cash received.', 14, 53);
  // Call the v5 function directly. The legacy doc.autoTable was undefined and its error was swallowed.
  autoTable(pdf, {
    startY: 62,
    head: [['Order ID', 'Customer', 'KG', 'INR', 'Status', 'Payment']],
    body: sales.map(o => [
      o.orderId || '', o.customerName || '', String(o.quantityKg || 0),
      String(o.totalAmount || 0), o.status || '', o.paymentStatus === 'payment_verified' ? 'Verified' : 'Unverified',
    ]),
    styles: { fontSize: 7, overflow: 'linebreak' },
  });
  const priorBottom = (pdf as any).lastAutoTable?.finalY || 62;
  let nextStart = priorBottom + 12;
  if (nextStart > 265) { pdf.addPage(); nextStart = 20; }
  pdf.text('Expenses', 14, nextStart);
  autoTable(pdf, {
    startY: nextStart + 6,
    head: [['Date (IST)', 'Category', 'Description', 'INR']],
    body: costs.map(e => [expenseDate(e) || '', e.category || '', e.description || '', String(e.amount || 0)]),
    styles: { fontSize: 7, overflow: 'linebreak' },
  });
  await exportPdf(pdf, 'Ankur_Monthly_' + period.start + '_to_' + period.end + '.pdf');
}
