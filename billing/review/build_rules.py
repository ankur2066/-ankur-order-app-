"""Compose from the exact previously approved/deployed named-DB Rules. No network."""
from pathlib import Path
import hashlib,difflib
root=Path(__file__).resolve().parent
baseline=Path('notifications/live-review/firestore.candidate.rules').read_text()
expected='53d1a6a73915269ccea759a835e5b39c87d216e589094e532c474e331f2a17fb'
assert hashlib.sha256(baseline.encode()).hexdigest()==expected
needle='exists(/databases/$(database)/documents/order_tracking/$(trackingToken)) &&\n        isValidPushDevice(incoming());'
assert baseline.count(needle)==1
candidate=baseline.replace(needle,'(exists(/databases/$(database)/documents/order_tracking/$(trackingToken)) ||\n         exists(/databases/$(database)/documents/product_order_tracking/$(trackingToken))) &&\n        isValidPushDevice(incoming());',1)
anchor='    // =========================================================================\n    // COLLECTION ACCESS RULES'
assert candidate.count(anchor)==1
candidate=candidate.replace(anchor,(root/'product-billing-fragment.rules').read_text()+'\n\n'+anchor,1)
(root/'firestore.product-billing.rules').write_text(candidate)
(root/'firestore.product-billing.diff').write_text(''.join(difflib.unified_diff(baseline.splitlines(True),candidate.splitlines(True),fromfile='deployed-named-db.rules',tofile='proposed-unit-products.rules')))
print('Proposed Rules:',hashlib.sha256(candidate.encode()).hexdigest())
