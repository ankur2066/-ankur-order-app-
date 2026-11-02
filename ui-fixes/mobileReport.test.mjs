import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

const original = readFileSync(new URL('./mobileReport.ts', import.meta.url), 'utf8');
assert.match(original, /Directory\.Cache/, 'native report stays in private cache');
const injected = original
  .replace("import { Capacitor } from '@capacitor/core';", 'const Capacitor = globalThis.__ankurPdfDeps.capacitor;')
  .replace("import('@capacitor/filesystem')", 'Promise.resolve(globalThis.__ankurPdfDeps.filesystem)')
  .replace("import('@capacitor/share')", 'Promise.resolve(globalThis.__ankurPdfDeps.share)');
const pdfExporter = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(stripTypeScriptTypes(injected)));

function harness(platform = 'android') {
  const writes = [], shares = [], saves = [];
  const deps = {
    capacitor: {getPlatform: () => platform},
    filesystem: {
      Directory: {Cache:'CACHE'},
      Filesystem: {writeFile: async values => {
        writes.push(values);
        return {uri:'file:///data/user/0/com.ankurdryice.events/cache/Ankur_Monthly_Test.pdf'};
      }},
    },
    share: {Share:{share:async options=>{shares.push(options);}}},
  };
  globalThis.__ankurPdfDeps = deps;
  const pdf = {
    output: mode => {
      assert.equal(mode, 'datauristring');
      return 'data:application/pdf;filename=Ankur_Monthly_Test.pdf;base64,JVBERi0xLjQ=';
    },
    save: name => saves.push(name),
  };
  return {deps, writes, shares, saves, pdf};
}

test('native Android PDF is shared as an actual file from private cache, not as URL text', async()=>{
  const h = harness();
  await pdfExporter.exportPdf(h.pdf, 'Ankur_Monthly_Test.pdf');
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].path, 'Ankur_Monthly_Test.pdf');
  assert.equal(h.writes[0].data, 'JVBERi0xLjQ=');
  assert.equal(h.writes[0].directory, 'CACHE');
  assert.equal(h.shares.length, 1);
  assert.deepEqual(h.shares[0].files, ['file:///data/user/0/com.ankurdryice.events/cache/Ankur_Monthly_Test.pdf']);
  assert.equal(h.shares[0].url, undefined, 'file is not URL text');
  assert.equal(h.saves.length, 0, 'native Android must not call browser Blob download');
});

test('browser PDF keeps standard jsPDF save and never loads native share', async()=>{
  const h = harness('web');
  await pdfExporter.exportPdf({save:name=>h.saves.push(name), output:()=>{throw Error('wrong path');}}, 'Ankur_Monthly_Test.pdf');
  assert.deepEqual(h.saves, ['Ankur_Monthly_Test.pdf']);
  assert.equal(h.writes.length, 0);
  assert.equal(h.shares.length, 0);
});

test('missing PDF data fails before native write/share', async()=>{
  const h = harness();
  await assert.rejects(pdfExporter.exportPdf({output:()=>''}, 'Ankur_Monthly_Test.pdf'), /PDF/);
  assert.equal(h.writes.length, 0);
  assert.equal(h.shares.length, 0);
});

test('share failure is reported rather than claiming the PDF was saved', async()=>{
  const h = harness();
  h.deps.share.Share.share = async()=>{throw Error('no receiving app');};
  await assert.rejects(pdfExporter.exportPdf(h.pdf, 'Ankur_Monthly_Test.pdf'), /no receiving app/);
  assert.equal(h.writes.length, 1);
});
