import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.env.ANKUR_CLIENT_APP || process.cwd();
const css = readFileSync(new URL('./customer-dark-contrast-v138.css', import.meta.url), 'utf8');
const profile = readFileSync(resolve(root, 'src/components/customer/ProfileTab.tsx'), 'utf8');
const video = readFileSync(resolve(root, 'src/components/AIVideoStudio.tsx'), 'utf8');
const hub = readFileSync(resolve(root, 'src/components/customer/FeatureHub.tsx'), 'utf8');

function luminance(value) {
  const channels = value.substring(1).match(/../g).map(c => parseInt(c, 16) / 255);
  const linear = channels.map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}
function contrast(a, b) {
  const [small, large] = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (large + .05) / (small + .05);
}

test('Profile and AI Video get independent dark-mode readable surfaces', () => {
  assert.match(profile, /ankur-readable-customer-page/);
  assert.match(video, /ankur-readable-customer-page/);
  assert.match(hub, /ankur-readable-customer-page/);
  assert.match(css, /html\[data-theme='dark'\] \.ankur-readable-customer-page/);
  assert.doesNotMatch(css, /html\[data-theme='dark'\] body\s*\{/);
});

test('dark text, secondary labels, light chips and action buttons have >=4.5:1 contrast', () => {
  for (const [name, fg, bg] of [
    ['main text', '#F8FAFC', '#182C46'],
    ['secondary text', '#CBD5E1', '#182C46'],
    ['chip text', '#FFDBB5', '#31415A'],
    ['action text', '#FFFFFF', '#9A3412'],
    ['input text', '#F8FAFC', '#102038'],
  ]) {
    assert.ok(contrast(fg, bg) >= 4.5, name + ' ratio ' + contrast(fg, bg));
    assert.ok(css.includes(fg) && css.includes(bg), 'palette missing ' + name);
  }
  assert.match(css, /\.ankur-readable-customer-page \.t-brand,/);
  assert.match(css, /button\.c-soft,/);
  assert.match(css, /border-color: #8092AB/);
  assert.ok(contrast('#FFDBB5','#31415A') >= 4.5, 'settings choice/button text contrast');
  assert.match(css, /:focus-visible/);
  assert.match(css, /::placeholder/);
});
