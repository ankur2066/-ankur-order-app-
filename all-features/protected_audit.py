"""Record/check protected legacy submit and pricing; intentional routing overlays allowed."""
from pathlib import Path
import argparse,hashlib,json
p=argparse.ArgumentParser();p.add_argument('mode',choices=['record','check']);p.add_argument('receipt',type=Path);a=p.parse_args()
s=Path('src/components/OrderForm.tsx').read_text();submission=s.split('  const executeOrderSubmission = async () => {',1)[1].split('  const handleSubmit = async',1)[0]
values={'legacySubmission':hashlib.sha256(submission.encode()).hexdigest()}
for path in ['src/data/rates.ts','firestore.rules']:values[path]=hashlib.sha256(Path(path).read_bytes()).hexdigest()
if a.mode=='record':a.receipt.write_text(json.dumps(values,indent=2))
else:
    assert values==json.loads(a.receipt.read_text()),'Protected legacy financial path changed'
    print('PASS: legacy booking submit, rate source and original Rules unchanged')
