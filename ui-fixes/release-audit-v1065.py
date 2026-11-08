#!/usr/bin/env python3
"""Install the verified v1.0.65 source files into the reconstructed app tree."""
from pathlib import Path
import shutil

root = Path.cwd()
overlay = root / "ui-fixes/v1065-overlay"
files = [
    "android/app/build.gradle", "android/app/src/main/java/com/ankurdryice/events/MainActivity.java",
    "firestore.rules", "index.html", "src/App.tsx",
    "src/components/AdminDashboard.tsx", "src/components/AppUpdateNotice.tsx", "src/components/CustomerOrders.tsx",
    "src/components/OrderForm.tsx", "src/components/OrderTrackingView.tsx", "src/components/StaffDashboard.tsx", "src/components/UserManagement.tsx", "src/components/OwnerStorefrontManager.tsx",
    "src/components/customer/FeatureHub.tsx", "src/components/customer/BottomNav.tsx",
    "src/components/owner/FeatureSuiteSettings.tsx", "src/components/owner/CustomersView.tsx", "src/components/owner/PaymentProofPreview.tsx", "src/components/PaymentOptions.tsx",
    "src/data/products.ts", "src/data/rates.ts", "src/hooks/useInlinePromo.ts", "src/index.css",
    "src/services/appUpdate.ts", "src/services/customers.ts", "src/services/paymentProof.ts", "src/theme/designTokens.ts", "src/theme/themes.ts",
    "src/types.ts", "src/utils/dispatchSchedule.ts", "src/utils/dispatchSchedule.test.ts", "src/utils/upi.ts", "src/utils/upi.test.ts",
    "src/config/businessConfig.ts", "src/assets/primary-upi.svg",
]
for relative in files:
    source = overlay / relative
    target = root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
# Keep the offline QR generator dependency in the reconstructed app manifest.
import json
manifest = root / "package.json"
if manifest.exists():
    package = json.loads(manifest.read_text())
    package.setdefault("dependencies", {})["qrcode"] = "^1.5.4"
    package.setdefault("devDependencies", {})["@types/qrcode"] = "^1.5.6"
    package.setdefault("devDependencies", {})["@firebase/rules-unit-testing"] = "^4.0.1"
    package.setdefault("devDependencies", {})["firebase-tools"] = "^15.35.0"
    package.setdefault("devDependencies", {})["playwright"] = "^1.65.0"
    package.setdefault("scripts", {})["test:unit"] = "node --experimental-strip-types --test src/utils/*.test.ts"
    package.setdefault("scripts", {})["test:rules"] = "node --test ui-fixes/customer-rules-contract.test.mjs"
    package.setdefault("scripts", {})["test:rules:emulator"] = "firebase emulators:exec --only firestore --project demo-ankur-dryice-rules 'node --test tests/firestore.rules.test.mjs'"
    package.setdefault("scripts", {})["check:theme-colors"] = "node scripts/check-theme-colors.mjs"
    manifest.write_text(json.dumps(package, indent=2) + "\n")
print(f"Applied v1.0.65 feedback overlay ({len(files)} files)")
