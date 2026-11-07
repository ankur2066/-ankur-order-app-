import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

const source = readFileSync(new URL('./monthlyReport.ts', import.meta.url), 'utf8');
const transformed = source
  .replace("import jsPDF from 'jspdf';", 'const jsPDF = globalThis.__monthlyQa.Pdf;')
  .replace("import autoTable from 'jspdf-autotable';", 'const autoTable = (...args) => globalThis.__monthlyQa.autoTable(...args);')
  .replace("import { exportPdf } from './mobileReport';", 'const exportPdf = (...args) => globalThis.__monthlyQa.exportPdf(...args);')
  .replace('istParts(new Date())', 'istParts(new Date(globalThis.__monthlyQa.now))');

class Pdf {
  texts = [];
  tables = [];
  pages = 1;
  setFontSize() {}
  text(text) { this.texts.push(String(text)); }
  addPage() { this.pages++; }
}
const observed = [];
globalThis.__monthlyQa = {
  Pdf,
  now:'2026-11-02T12:00:00+05:30',
  autoTable(pdf, options) {
    pdf.tables.push(options);
    pdf.lastAutoTable = {finalY:62+options.body.length*2};
  },
  async exportPdf(pdf,name) { observed.push({pdf,name}); },
};
const report = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(stripTypeScriptTypes(transformed)));
const stamp = value => ({seconds: Math.floor(Date.parse(value) / 1000)});
const makeOrder = (orderId, date, quantityKg, totalAmount, extras={}) => ({
  orderId, customerName:'Synthetic Customer', createdAt:date ? stamp(date) : null,
  quantityKg,totalAmount,status:'pending',paymentStatus:'pending_verification',...extras,
});
const makeExpense = (date, amount) => ({
  date:stamp(date),amount,category:'Transport',description:'Synthetic test expense',
});

test('15th-to-14th IST boundary, payment verification and expenses are calculated without writing live orders',async()=>{
 const orders=[
  makeOrder('ADI-20261014-OUT','2026-10-14T23:59:00+05:30',1,60),
  makeOrder('ADI-20261015-IN','2026-10-15T00:00:00+05:30',10,600,{paymentStatus:'payment_verified'}),
  makeOrder('ADI-20261114-IN','2026-11-14T23:59:00+05:30',20,1200),
  makeOrder('ADI-20261018-LEGACY',null,30,1800),
  makeOrder('ADI-20261020-TRASH','2026-10-20T12:00:00+05:30',50,3000,{isTrash:true}),
  makeOrder('ADI-20261115-OUT','2026-11-15T00:00:00+05:30',1,60),
 ];
 const expenses=[makeExpense('2026-10-20T08:00:00+05:30',100),makeExpense('2026-11-15T00:01:00+05:30',999)];
 await report.generateMonthlyPDF(orders,expenses);
 const {pdf,name}=observed.at(-1);
 assert.equal(name,'Ankur_Monthly_2026-10-15_to_2026-11-14.pdf');
 assert.ok(pdf.texts.some(t=>t.includes('Period (IST): 2026-10-15 to 2026-11-14')));
 assert.ok(pdf.texts.some(t=>t.includes('Orders: 3 | Quantity: 60 KG | Booked: INR 3600')));
 assert.ok(pdf.texts.some(t=>t.includes('Payment verified: INR 600 | Unverified: INR 3000')));
 assert.ok(pdf.texts.some(t=>t.includes('Expenses: INR 100 | Booked less expenses: INR 3500')));
 assert.deepEqual(pdf.tables[0].body.map(row=>row[0]),['ADI-20261015-IN','ADI-20261114-IN','ADI-20261018-LEGACY']);
 assert.equal(pdf.tables[1].body.length,1);
});

test('monthly report includes all orders rather than silently truncating to 40',async()=>{
 const orders=Array.from({length:75},(_,i)=>makeOrder('ADI-20261020-TEST'+i,'2026-10-20T13:00:00+05:30',10,600));
 await report.generateMonthlyPDF(orders,[]);
 const {pdf}=observed.at(-1);
 assert.equal(pdf.tables[0].body.length,75);
});

test('PDF export failures surface to caller rather than reporting a completed download',async()=>{
 const previous=globalThis.__monthlyQa.exportPdf;
 globalThis.__monthlyQa.exportPdf=async()=>{throw Error('Android chooser unavailable');};
 try{
  await assert.rejects(report.generateMonthlyPDF([],[]),/Android chooser unavailable/);
 }finally{globalThis.__monthlyQa.exportPdf=previous;}
});
