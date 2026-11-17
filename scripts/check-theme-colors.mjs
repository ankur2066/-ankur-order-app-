import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Prevent newly introduced inline hex colours in PR changes. Existing legacy
// theme/artwork palettes are tracked separately for the ongoing token migration.
// Root src/ mirrors the reconstructed app, so a line that already exists in the
// archived app or in an earlier overlay/patch script is legacy, not new.
const base = 'origin/codex/release-audit-14features-20261108';
const diff = execFileSync('git', ['diff', '--unified=0', `${base}...HEAD`, '--', 'src'], { encoding: 'utf8' });

const legacy = new Set();
const addText = (text) => { for (const raw of text.split(/\r?\n|\\n/)) { const t = raw.trim(); if (t) legacy.add(t); } };
const zip = 'Ankur_Order_App_Upload_GitHub.zip';
if (existsSync(zip)) {
  const names = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter((n) => /^src\/.*\.(css|tsx?|svg)$/.test(n));
  for (const n of names) addText(execFileSync('unzip', ['-p', zip, n], { encoding: 'utf8', maxBuffer: 64 << 20 }));
}
const walk = (dir) => {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === 'v1065-overlay' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(py|template|css)$/.test(name)) addText(readFileSync(p, 'utf8'));
  }
};
for (const dir of ['ui-fixes', 'notifications', 'phase-a', 'billing', 'all-features', 'app-check', 'seasonal']) walk(dir);

let file = '';
const violations = [];
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ b/')) file = line.slice(6);
  if (!line.startsWith('+') || line.startsWith('+++')) continue;
  if (/^src\/theme\/(designTokens|themes)\./.test(file)) continue;
  // Generated QR artwork must stay pure black/white for scanners.
  if (/^src\/assets\/.*\.svg$/.test(file)) continue;
  const code = line.slice(1);
  if (!/(?:#[0-9a-fA-F]{3,8}\b)/.test(code)) continue;
  if (legacy.has(code.trim())) continue;
  violations.push(`${file}: ${code.trim()}`);
}
if (violations.length) {
  console.error('Hard-coded hex colours were added outside theme tokens:\n' + violations.join('\n'));
  process.exit(1);
}
console.log('Theme colour guard passed for changed source lines.');
