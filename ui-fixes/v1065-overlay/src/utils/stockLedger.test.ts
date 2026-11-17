import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStockKg, validateStockEntry, stockBalance, stockTotals, withRunningBalance, reverseStockEntry, nextStockAccessEmails, STOCK_MAX_ACCOUNTS, STOCK_MAX_SWITCHED } from './stockLedger.ts';

const ts = (s: number) => ({ seconds: s, nanoseconds: 0 });

test('KG must be a positive number with at most 2 decimals', () => {
  assert.equal(parseStockKg('25'), 25);
  assert.equal(parseStockKg('12.5'), 12.5);
  assert.equal(parseStockKg('7,25'), 7.25);
  for (const bad of ['', '0', '-5', 'abc', '1.234', '100001', '1e3']) assert.equal(parseStockKg(bad), null, bad);
});

test('entry validation needs IN/OUT, valid KG and a short note', () => {
  assert.deepEqual(validateStockEntry('in', '40', '  truck  '), { ok: true, type: 'in', kg: 40, note: 'truck' });
  assert.equal(validateStockEntry('edit', '40').ok, false);
  assert.equal(validateStockEntry('out', '0').ok, false);
  assert.equal(validateStockEntry('out', '5', 'x'.repeat(201)).ok, false);
  const bad = validateStockEntry('in', 'abc');
  assert.ok(!bad.ok && (bad as any).hi && (bad as any).en, 'error must be Hindi + English');
});

test('balance = IN - OUT, and running balance follows time order', () => {
  const entries = [
    { id: 'c', type: 'out' as const, kg: 15.5, createdAt: ts(300) },
    { id: 'a', type: 'in' as const, kg: 100, createdAt: ts(100) },
    { id: 'b', type: 'out' as const, kg: 30, createdAt: ts(200) },
  ];
  assert.equal(stockBalance(entries), 54.5);
  assert.deepEqual(stockTotals(entries), { inKg: 100, outKg: 45.5, balance: 54.5 });
  const rows = withRunningBalance(entries);
  assert.deepEqual(rows.map((r) => [r.id, r.balanceAfter]), [['c', 54.5], ['b', 70], ['a', 100]]);
  // pending (no server time yet) counts as newest
  const pending = withRunningBalance([...entries, { id: 'p', type: 'in' as const, kg: 1 }]);
  assert.equal(pending[0].id, 'p');
  assert.equal(pending[0].balanceAfter, 55.5);
});

test('no edit/delete: a correction is a reverse entry that cancels the wrong one', () => {
  const wrong = { id: 'abcdef123', type: 'in' as const, kg: 50 };
  const fix = reverseStockEntry(wrong);
  assert.equal(fix.type, 'out');
  assert.equal(fix.kg, 50);
  assert.match(fix.note, /Correction/);
  assert.equal(stockBalance([wrong, fix]), 0);
});

test('max 5 accounts: owner login + 4 switched on', () => {
  assert.equal(STOCK_MAX_ACCOUNTS, 5);
  assert.equal(STOCK_MAX_SWITCHED, 4);
  let list: string[] = [];
  for (const e of ['A@x.com', 'b@x.com', 'c@x.com', 'd@x.com']) {
    const r = nextStockAccessEmails(list, e, true);
    assert.ok(r.ok); list = (r as any).emails;
  }
  assert.deepEqual(list, ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com']);
  const fifth = nextStockAccessEmails(list, 'e@x.com', true);
  assert.equal(fifth.ok, false);
  const again = nextStockAccessEmails(list, 'B@X.com', true);
  assert.ok(again.ok && (again as any).emails.length === 4, 're-enabling is not a new slot');
  const off = nextStockAccessEmails(list, 'b@x.com', false);
  assert.ok(off.ok && !(off as any).emails.includes('b@x.com'));
  assert.equal(nextStockAccessEmails(list, '', true).ok, false);
});
