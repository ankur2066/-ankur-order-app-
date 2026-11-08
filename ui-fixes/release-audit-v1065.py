#!/usr/bin/env python3
"""Install the verified v1.0.65 source files into the reconstructed app tree."""
from pathlib import Path
import shutil

root = Path.cwd()
overlay = root / "ui-fixes/v1065-overlay"
files = [
    "android/app/build.gradle",
    "android/app/src/main/java/com/ankurdryice/events/MainActivity.java",
    "firestore.rules", "index.html", "src/App.tsx",
    "src/components/AdminDashboard.tsx", "src/components/AppUpdateNotice.tsx",
    "src/components/CustomerOrders.tsx", "src/components/OrderForm.tsx",
    "src/components/OrderTrackingView.tsx", "src/components/UserManagement.tsx",
    "src/components/StaffOrderAccessManager.tsx", "src/components/customer/ReferralSharePanel.tsx",
    "src/components/customer/FeatureHub.tsx", "src/components/customer/BottomNav.tsx",
    "src/components/owner/FeatureSuiteSettings.tsx", "src/data/products.ts", "src/data/rates.ts",
    "src/hooks/useInlinePromo.ts", "src/index.css", "src/services/appUpdate.ts",
    "src/types.ts", "src/utils/dispatchSchedule.ts", "public/assets/paytm-upi-qr.svg", "updates/appUpdate.template",
]
for relative in files:
    source = overlay / relative
    target = root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
print(f"Applied v1.0.65 feedback overlay ({len(files)} files)")
