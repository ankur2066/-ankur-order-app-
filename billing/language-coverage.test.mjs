import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const form = readFileSync(new URL('./templates/UnitProductForm.template', import.meta.url), 'utf8');
const editor = readFileSync(new URL('./templates/UnitProductManager.template', import.meta.url), 'utf8');
const context = readFileSync(new URL('../all-features/templates/LanguageContext.template', import.meta.url), 'utf8');

test('new product booking and bill follow the existing English/Hindi preference', () => {
  assert.match(context, /localStorage\.getItem\(STORAGE_KEY\) === 'hi' \? 'hi' : 'en'/);
  assert.match(form, /import \{useLanguage\} from '\.\.\/context\/LanguageContext'/);
  assert.match(form, /export function UnitOrderBreakdown[\s\S]*?useLanguage\(\)/);
  assert.match(form, /export function UnitProductForm[\s\S]*?useLanguage\(\)/);
  for (const label of ['Product bill','Total amount','Order received','Private tracking PIN','Track order','Name','Mobile number','City / address','Quantity','Dispatch time','Book order']) {
    assert.ok(form.includes(label), 'Missing English checkout label: '+label);
  }
  assert.match(form, /hi\?quantityText\(order\):quantityTextEnglish\(order\)/);
  assert.match(form, /hi\?current\.hindiName:current\.name/);
});

test('input validation and persisted billing values stay independent of displayed language', () => {
  assert.match(form, /key==='phone'\?10:key==='name'\?100:300/);
  assert.match(form, /key==='phone'\?'tel':'text'/);
  assert.match(form, /productName:latest\.hindiName/);
  assert.match(form, /billing:bill/);
  assert.match(form, /tx\.set\(doc\(db,'product_orders',orderId\),value\)/);
  assert.match(form, /tx\.set\(doc\(db,'product_order_tracking',trackingToken\)/);
  assert.match(form, /if\(!enabled\)/);
  assert.match(form, /paymentStatus:'pending_verification'/);
});

test('owner product editor follows language choice while preserving disabled catalog guard', () => {
  assert.match(editor, /import \{useLanguage\} from '\.\.\/context\/LanguageContext'/);
  assert.match(editor, /const \{language\}=useLanguage\(\)/);
  for (const label of ['Piece, Box, Package and KG products','Price per unit','Minimum quantity','Packing charge','Delivery charge','Available to customers','Draft saved; hidden from customers.','English name','Hindi name']) {
    assert.ok(editor.includes(label), 'Missing English owner label: '+label);
  }
  assert.match(editor, /hi\?d\.hindiName:d\.name/);
  assert.match(editor, /hi\?p\.hindiName:p\.name/);
  assert.match(editor, /if\(!available\)/);
  assert.match(editor, /!available\|\|saving/);
  assert.match(editor, /billingVersion:2/);
});
