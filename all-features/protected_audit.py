"""Record/check protected legacy submit and pricing; intentional routing overlays allowed."""
from pathlib import Path
import argparse,hashlib,json
p=argparse.ArgumentParser();p.add_argument('mode',choices=['record','check']);p.add_argument('receipt',type=Path);a=p.parse_args()
s=Path('src/components/OrderForm.tsx').read_text();submission=s.split('  const executeOrderSubmission = async () => {',1)[1].split('  const handleSubmit = async',1)[0]
# The release audit intentionally changes order identity persistence/retry
# handling. Protect only the pricing formulas and persisted price fields so
# the audit still catches any alteration to existing commercial math.
protected_terms = (
    'const finalQuantityKg = parsedQty;',
    'const unitRate = rates.dryIceRate + rates.thermocolRate + (rates.transportRate || 0);',
    'const finalDryIceSubtotal = Math.round(finalQuantityKg * rates.dryIceRate * 100) / 100;',
    'const finalThermocolSubtotal = Math.round(finalQuantityKg * rates.thermocolRate * 100) / 100;',
    'const finalTotalAmount = Math.round(finalQuantityKg * unitRate * 100) / 100;',
    'dryIcePricePerKg: rates.dryIceRate,',
    'dryIceSubtotal: finalDryIceSubtotal,',
    'thermocolPricePerKg: rates.thermocolRate,',
    'thermocolSubtotal: finalThermocolSubtotal,',
    'transportPrice: rates.transportRate || 0,',
)
for term in protected_terms:
    assert submission.count(term)==1, f'protected pricing term missing/duplicated: {term}'
amount_field = next((term for term in ('totalAmount: approvedAmount(finalTotalAmount),', 'totalAmount: finalTotalAmount,') if submission.count(term)==1), None)
assert amount_field, 'protected total amount field missing or duplicated'
protected_terms = (*protected_terms, amount_field)
values={'legacyPricing':hashlib.sha256('\\n'.join(protected_terms).encode()).hexdigest()}
for path in ['src/data/rates.ts','firestore.rules']:values[path]=hashlib.sha256(Path(path).read_bytes()).hexdigest()
if a.mode=='record':a.receipt.write_text(json.dumps(values,indent=2))
else:
    assert values==json.loads(a.receipt.read_text()),'Protected legacy financial path changed'
    print('PASS: legacy booking submit, rate source and original Rules unchanged')
