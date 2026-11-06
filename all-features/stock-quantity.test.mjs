import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

const source=readFileSync(new URL('./templates/stockQuantity.template',import.meta.url),'utf8');
const stock=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(stripTypeScriptTypes(source)));

test('KG display and entry use grams in the backend',()=>{
 assert.equal(stock.parseStockQuantity('12.345','kg'),12345);
 assert.equal(stock.formatStockQuantity(12345,'kg'),'12.345 KG');
 assert.equal(stock.parseStockQuantity('0','kg'),0);
});

test('piece, box and package stock use whole-count quantities',()=>{
 for(const unit of ['piece','box','package']){
  assert.equal(stock.parseStockQuantity('12',unit),12);
  assert.equal(stock.formatStockQuantity(12,unit),'12 '+unit);
  assert.throws(()=>stock.parseStockQuantity('1.5',unit));
 }
});

test('audited adjustment accepts a signed quantity and rejects malformed values',()=>{
 assert.equal(stock.parseStockQuantity('-2.5','kg',true),-2500);
 assert.equal(stock.parseStockQuantity('2','box',true),2);
 assert.throws(()=>stock.parseStockQuantity('0','kg',true),/nonzero/);
 assert.throws(()=>stock.parseStockQuantity('-2','kg'),/KG/);
 assert.throws(()=>stock.parseStockQuantity('1.2345','kg'),/KG/);
 assert.throws(()=>stock.parseStockQuantity('4','carton'),/unit/);
 assert.equal(stock.formatStockQuantity(-1,'kg'),'Unavailable');
});
