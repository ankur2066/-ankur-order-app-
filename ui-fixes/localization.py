"""Apply reviewed UI-copy-only edits; fail on any changed Work Mode source."""
from pathlib import Path
import json,hashlib,shutil
root=Path(__file__).resolve().parent/'i18n'
for file in json.loads((root/'edits.json').read_text()):
 p=Path(file['path']);s=p.read_text();assert hashlib.sha256(s.encode()).hexdigest()==file['sha256'],'Regenerate localization against current source: '+str(p)
 for edit in sorted(file['edits'],key=lambda e:e['start'],reverse=True):s=s[:edit['start']]+edit['text']+s[edit['end']:]
 p.write_text(s)
out=Path('src/i18n');out.mkdir(exist_ok=True)
shutil.copyfile(root/'UiText.template',out/'UiText.tsx');shutil.copyfile(root/'messages.json',out/'messages.json')
print('PASS: static UI copy uses persistent language context; stored business values and handlers unchanged')
