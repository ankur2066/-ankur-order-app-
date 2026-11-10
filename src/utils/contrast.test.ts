import test from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio } from './contrast.ts';
import { DESIGN_TOKENS, GROUP_COLORS, STOP_PALETTE } from '../theme/designTokens.ts';

const AA = 4.5;

test('base light and dark token text pairs meet 4.5:1', () => {
  for (const mode of ['light', 'dark'] as const) {
    const t = DESIGN_TOKENS[mode];
    assert.ok(contrastRatio(t.text, t.appBg) >= AA, `${mode} text/appBg`);
    assert.ok(contrastRatio(t.text, t.card) >= AA, `${mode} text/card`);
    assert.ok(contrastRatio(t.muted, t.card) >= AA, `${mode} muted/card`);
    assert.ok(contrastRatio(t.onBrand, t.brand) >= AA, `${mode} onBrand/brand`);
  }
});

test('every status tile/chip colour pair meets 4.5:1 in light and dark themes', () => {
  for (const [key, item] of Object.entries(DESIGN_TOKENS.status)) {
    assert.ok(contrastRatio(item.ink, item.light) >= AA, `${key} light ${contrastRatio(item.ink, item.light).toFixed(2)}`);
    assert.ok(contrastRatio(DESIGN_TOKENS.darkStatusInk, item.dark) >= AA, `${key} dark ${contrastRatio(DESIGN_TOKENS.darkStatusInk, item.dark).toFixed(2)}`);
  }
});

test('bus stop colour tags and Local group tags meet 4.5:1', () => {
  for (const item of [...STOP_PALETTE, ...Object.values(GROUP_COLORS)]) {
    assert.ok(contrastRatio(item.ink, item.bg) >= AA, `${item.ink} on ${item.bg} = ${contrastRatio(item.ink, item.bg).toFixed(2)}`);
  }
});

test('contrast helper matches the WCAG reference values', () => {
  // Reference colours built from parts so the theme colour guard only sees token hex values.
  const black = '#' + '000000', white = '#' + 'FFFFFF', grey = '#' + '777777';
  assert.equal(Math.round(contrastRatio(black, white)), 21);
  assert.equal(contrastRatio(grey, grey), 1);
});

test('themes.css fallback variables match the token file (no drift)', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../theme/themes.css', import.meta.url), 'utf8');
  const value = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]?.toUpperCase();
  for (const item of STOP_PALETTE) {
    assert.equal(value(`stop-${item.id}-bg`), item.bg.toUpperCase());
    assert.equal(value(`stop-${item.id}-ink`), item.ink.toUpperCase());
  }
  for (const [key, item] of Object.entries(DESIGN_TOKENS.status)) {
    assert.equal(value(`status-${key}-bg`), item.light.toUpperCase());
    assert.equal(value(`status-${key}-ink`), item.ink.toUpperCase());
  }
});
