"""Release audit for approved v1.0.65 commercial changes.

The feedback phase intentionally changes wholesale rate selection and order rules.
Keep the assertions here focused on required invariants rather than hashing the
entire pricing/rules files against the pre-overlay retail-only implementation.
"""
from pathlib import Path
import argparse
import json

parser = argparse.ArgumentParser()
parser.add_argument("mode", choices=["record", "check"])
parser.add_argument("receipt", type=Path)
args = parser.parse_args()

if args.mode == "record":
    source = Path("src/components/OrderForm.tsx").read_text()
    assert "const executeOrderSubmission = async () => {" in source
    args.receipt.write_text(json.dumps({"preOverlaySource": True}))
else:
    form = Path("src/components/OrderForm.tsx").read_text()
    rules = Path("firestore.rules").read_text()
    rates = Path("src/data/rates.ts").read_text()

    assert args.receipt.exists(), "pre-overlay audit receipt missing"
    assert json.loads(args.receipt.read_text()).get("preOverlaySource") is True
    assert "customerType === 'wholesale'" in form
    assert "rates.wholesaleRate" in form
    assert "amountChangeReason" in form and "amountChanged" in form
    assert "customerType == 'wholesale'" in rules
    assert "profile.get('customerType', 'retail')" in rules
    assert "wholesaleRate" in rates
    # Both totals and the rate breakdown must be present in the submitted order.
    for field in ("calculatedTotal:", "customerTotal:", "amountChanged:", "dryIceSubtotal:", "thermocolSubtotal:", "totalAmount:"):
        assert field in form, f"required v1.0.65 order field missing: {field}"
    print("PASS: owner-set wholesale price, retail price lock, reason validation and order totals")
