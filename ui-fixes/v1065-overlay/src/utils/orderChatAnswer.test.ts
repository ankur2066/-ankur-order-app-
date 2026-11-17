import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays, answerOrderQuestion, type ChatOrder} from './orderChatAnswer.ts';

const today = '2026-11-11';
const orders: ChatOrder[] = [
  {customerName: 'Ram Kumar', customerPhone: '9876543210', quantityKg: 10, totalAmount: 600, status: 'pending', paymentStatus: 'pending_verification', bookedDate: '2026-11-11', dispatchDate: '2026-11-11'},
  {customerName: 'Sita', customerPhone: '9123456789', quantityKg: 20, totalAmount: 1200, status: 'confirmed', paymentStatus: 'payment_verified', bookedDate: '2026-11-11', dispatchDate: '2026-11-12'},
  {customerName: 'Mohan', quantityKg: 5, totalAmount: 300, status: 'cancelled', paymentStatus: 'pending_verification', bookedDate: '2026-11-11', dispatchDate: '2026-11-12'},
  {customerName: 'Gita', quantityKg: 15, totalAmount: 900, status: 'pending', paymentStatus: 'pending_verification', bookedDate: '2026-11-10', dispatchDate: '2026-11-10'},
];

test('addDays crosses months', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test("answers Ankur's today + tomorrow question in Hindi, skipping cancelled orders", () => {
  const reply = answerOrderQuestion('आज और कल के दोनों दिन के आर्डर कितने हैं', orders, today, 'hi');
  assert.ok(reply);
  assert.match(reply!, /आज · 2026-11-11\n• बुक हुए: 2 ऑर्डर · 30 KG · ₹1,800/);
  assert.match(reply!, /आने वाला कल · 2026-11-12/);
  assert.match(reply!, /आज \+ कल का डिस्पैच मिलाकर: 2 ऑर्डर · 30 KG/);
});

test('English, customer lookup and unrelated questions', () => {
  assert.match(answerOrderQuestion('orders today', orders, today, 'en')!, /Booked: 2 orders/);
  assert.match(answerOrderQuestion('ram ka hisab', orders, today, 'hi')!, /ग्राहक Ram Kumar: 1 ऑर्डर · 10 KG/);
  assert.match(answerOrderQuestion('3210', orders, today, 'en')!, /Customer Ram Kumar/);
  assert.equal(answerOrderQuestion('hello', orders, today, 'en'), null);
});
