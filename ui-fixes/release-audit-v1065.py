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
    "src/components/OrderForm.tsx", "src/components/OrderTrackingView.tsx", "src/components/UserManagement.tsx", "src/components/OwnerStorefrontManager.tsx",
    "src/components/customer/FeatureHub.tsx", "src/components/customer/BottomNav.tsx",
    "src/components/owner/FeatureSuiteSettings.tsx", "src/components/owner/CustomersView.tsx", "src/components/PaymentOptions.tsx",
    "src/data/products.ts", "src/data/rates.ts", "src/hooks/useInlinePromo.ts", "src/index.css",
    "src/services/appUpdate.ts", "src/services/customers.ts", "src/theme/designTokens.ts", "src/theme/themes.ts",
    "src/types.ts", "src/utils/dispatchSchedule.ts", "src/utils/dispatchSchedule.test.ts", "src/utils/upi.ts",
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
    package.setdefault("scripts", {})["test:unit"] = "node --experimental-strip-types --test src/utils/*.test.ts"
    package.setdefault("scripts", {})["test:rules"] = "node --test ui-fixes/customer-rules-contract.test.mjs"
    manifest.write_text(json.dumps(package, indent=2) + "\n")
print(f"Applied v1.0.65 feedback overlay ({len(files)} files)")
