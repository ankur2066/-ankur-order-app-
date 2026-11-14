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
    "src/components/OrderForm.tsx", "src/components/OrderTrackingView.tsx", "src/components/StaffDashboard.tsx", "src/components/StaffOrderAccessManager.tsx", "src/components/UserManagement.tsx", "src/components/OwnerStorefrontManager.tsx",
    "src/components/customer/FeatureHub.tsx", "src/components/customer/BottomNav.tsx", "src/components/customer/ReferralSharePanel.tsx",
    "src/components/owner/FeatureSuiteSettings.tsx", "src/components/owner/CustomersView.tsx", "src/components/owner/PaymentProofPreview.tsx", "src/components/PaymentOptions.tsx",
    "src/data/products.ts", "src/data/rates.ts", "src/hooks/useInlinePromo.ts", "src/index.css",
    "src/services/appUpdate.ts", "src/services/customers.ts", "src/services/paymentProof.ts", "src/theme/designTokens.ts", "src/theme/themes.ts", "src/theme/themes.css",
    "src/types.ts", "src/utils/dispatchSchedule.ts", "src/utils/dispatchSchedule.test.ts", "src/utils/referralShare.ts", "src/utils/upi.ts", "src/utils/upi.test.ts",
    "src/config/businessConfig.ts", "src/assets/primary-upi.svg",
    # v1.0.66: delivery mode, bus stops, packing, Spark staff path, theme contrast
    "src/hooks/useAccess.ts", "src/components/PackingBoard.tsx", "src/components/DeliveryModePicker.tsx",
    "src/components/owner/BusStopSettings.tsx", "src/components/owner/StaffMembersManager.tsx", "src/components/owner/OrderDeliveryEditor.tsx",
    "src/services/deliverySettings.ts", "src/services/staffRegistry.ts", "src/services/staffSync.ts",
    "src/utils/delivery.ts", "src/utils/delivery.test.ts", "src/utils/staffProjection.ts", "src/utils/staffProjection.test.ts",
    "src/utils/contrast.ts", "src/utils/contrast.test.ts",
    # v1.0.66 hotfix: permission-denied message, average-rate note
    "src/utils/orderFormCopy.ts", "src/utils/orderFormCopy.test.ts",
    # v1.0.66 night batch: whole-app Hindi/English, Home feature row, winner strip,
    # owner chat local order answers, GitHub-release update check
    "src/i18n/AutoTranslate.tsx", "src/i18n/messagesV1066.json",
    "src/components/customer/HomeFeatureRow.tsx", "src/components/customer/DailyWinner.tsx",
    "src/components/AIChat.tsx", "src/utils/orderChatAnswer.ts", "src/utils/orderChatAnswer.test.ts",
    # v1.0.67 front page: floating winner/offer/poll slide
    "src/components/customer/HomeSlides.tsx",
    # v1.0.70 owner: new-orders tab, per-stop loading ticks, today alert, overdue fix
    "src/utils/orderWorkflow.ts", "src/utils/orderWorkflow.test.ts",
    # v1.0.71: native AI chat microphone in the APK, status-aware staff WhatsApp text
    "src/utils/voiceInput.ts", "src/utils/voiceInput.test.ts",
    "src/utils/staffWhatsApp.ts", "src/utils/staffWhatsApp.test.ts",
    "src/data/customerContacts.ts", "src/utils/customerContacts.test.ts", "src/components/customer/CustomerContactFooter.tsx",
    # v1.0.72: bus number on customer tracking + staff WhatsApp text; Products (coming soon) bottom tile
    "src/utils/busDispatch.ts", "src/utils/busDispatch.test.ts", "src/services/busDispatch.ts",
    # v1.0.75: UPI fallback, Mode required on confirm, 5-account stock ledger (Spark, no delete)
    "src/utils/stockLedger.ts", "src/utils/stockLedger.test.ts", "src/services/stockLedger.ts", "src/components/StockLedgerPanel.tsx",
    # v1.0.76: customer status step tracker, refresh on app open/resume, staff Call opens the dialer
    "src/utils/orderProgress.ts", "src/utils/orderProgress.test.ts", "src/components/customer/OrderStatusTracker.tsx",
    "src/utils/appResume.ts", "src/utils/appResume.test.ts", "src/utils/staffDial.ts", "src/utils/staffDial.test.ts",
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
    # v1.0.71: native speech recognition for the AI chat microphone inside the APK.
    package.setdefault("dependencies", {})["@capacitor-community/speech-recognition"] = "7.0.1"
    package.setdefault("devDependencies", {})["@types/qrcode"] = "^1.5.6"
    package.setdefault("devDependencies", {})["@firebase/rules-unit-testing"] = "^4.0.1"
    package.setdefault("devDependencies", {})["firebase-tools"] = "^15.35.0"
    package.setdefault("devDependencies", {})["playwright"] = "^1.65.0"
    package.setdefault("scripts", {})["test:unit"] = "node --experimental-strip-types --test src/utils/*.test.ts"
    package.setdefault("scripts", {})["test:rules"] = "node --test ui-fixes/customer-rules-contract.test.mjs"
    package.setdefault("scripts", {})["test:rules:emulator"] = "firebase emulators:exec --only firestore --project demo-ankur-dryice-rules 'node --test tests/firestore.rules.test.mjs'"
    package.setdefault("scripts", {})["check:theme-colors"] = "node scripts/check-theme-colors.mjs"
    manifest.write_text(json.dumps(package, indent=2) + "\n")
# v1.0.71: sliding banner (HomeSlides) at the very top of customer Home, above the
# booking form. CustomerHome is the reconstructed file; App passes the banner as topSlot.
customer_home = root / "src/components/customer/CustomerHome.tsx"
if customer_home.exists():
    text = customer_home.read_text()
    if "topSlot" not in text:
        steps = [
            ("  bookingForm: (product: ProductItem | null) => React.ReactNode;\n",
             "  bookingForm: (product: ProductItem | null) => React.ReactNode;\n  /** v1.0.71: sliding banner shown at the very top of Home. */\n  topSlot?: React.ReactNode;\n"),
            ("  bookingForm,\n}) => {", "  bookingForm,\n  topSlot,\n}) => {"),
            ('      <main className="aqp-main aqp-form-only-main">\n',
             '      <main className="aqp-main aqp-form-only-main">\n        {topSlot && <div className="aqp-home-top-slot mx-3 sm:mx-4">{topSlot}</div>}\n'),
        ]
        for old, new in steps:
            assert text.count(old) == 1, f"CustomerHome topSlot anchor missing: {old[:60]!r}"
            text = text.replace(old, new, 1)
        customer_home.write_text(text)
    assert "{topSlot &&" in customer_home.read_text()

# v1.0.71: the AI chat microphone needs RECORD_AUDIO and the speech service query
# (the plugin manifest also merges both; declared here so the app manifest is explicit).
android_manifest = root / "android/app/src/main/AndroidManifest.xml"
if android_manifest.exists():
    text = android_manifest.read_text()
    if "android.permission.RECORD_AUDIO" not in text:
        text = text.replace("</manifest>", '    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n</manifest>', 1)
    if "android.speech.RecognitionService" not in text:
        text = text.replace("</manifest>", '    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService" />\n        </intent>\n    </queries>\n</manifest>', 1)
    # v1.0.76: staff Call opens the dialer via a tel: intent; declare it for Android 11+ package visibility.
    if '<data android:scheme="tel"' not in text:
        tel = '        <intent>\n            <action android:name="android.intent.action.DIAL" />\n            <data android:scheme="tel" />\n        </intent>\n        <intent>\n            <action android:name="android.intent.action.VIEW" />\n            <data android:scheme="tel" />\n        </intent>\n'
        if "</queries>" in text:
            text = text.replace("</queries>", tel + "    </queries>", 1)
        else:
            text = text.replace("</manifest>", "    <queries>\n" + tel + "    </queries>\n</manifest>", 1)
    assert "android.permission.RECORD_AUDIO" in text and "android.speech.RecognitionService" in text and '<data android:scheme="tel"' in text
    android_manifest.write_text(text)
print(f"Applied v1.0.65 feedback overlay ({len(files)} files)")
