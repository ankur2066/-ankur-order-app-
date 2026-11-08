import { execFileSync } from 'node:child_process';

// Prevent newly introduced inline hex colours in PR changes. Existing legacy
// theme/artwork palettes are tracked separately for the ongoing token migration.
const diff = execFileSync('git', ['diff', '--unified=0', 'HEAD^', 'HEAD', '--', 'src'], { encoding: 'utf8' });
let file = '';
const violations = [];
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ b/')) file = line.slice(6);
  if (!line.startsWith('+') || line.startsWith('+++')) continue;
  if (/^src\/theme\/(designTokens|themes)\./.test(file)) continue;
  const code = line.slice(1);
  if (/(?:#[0-9a-fA-F]{3,8}\b)/.test(code)) violations.push(`${file}: ${code.trim()}`);
}
if (violations.length) {
  console.error('Hard-coded hex colours were added outside theme tokens:\n' + violations.join('\n'));
  process.exit(1);
}
console.log('Theme colour guard passed for changed source lines.');
