import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=process.cwd();
const products=readFileSync(resolve(root,'src/data/products.ts'),'utf8');
const wiring=readFileSync(new URL('./wire_additions.py',import.meta.url),'utf8');

test('customer product call link stays on the dedicated phone, never the WhatsApp number',()=>{
 assert.match(products,/BUSINESS_CALL_HREF\s*=\s*['"]tel:\+919580882066['"]/);
 assert.doesNotMatch(products,/BUSINESS_CALL_HREF\s*=\s*['"]tel:\+918896332066['"]/);
 assert.match(wiring,/tel:\+919580882066/);
 assert.match(wiring,/tel:\+918896332066/,'previous link remains recognized for deterministic migration only');
});
