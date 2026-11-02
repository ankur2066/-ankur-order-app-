# ANKUR DRYICE — private Android v1.0.37 device acceptance

**Review only.** This plan does not confirm installation, customer data safety, live Firebase performance or Play Store release. The **new v1.0.37 certificate-pinned APK/AAB** passed GitHub CI. It remains a private test candidate; continue using the existing installed app until authorized in-place device testing.

## A. Package and in-place update

- Package ID: `com.ankurdryice.events`; candidate `versionCode=37` / `versionName=1.0.37-season-test`.
- Signing certificate SHA-256 (historical same-signer requirement): `ebb60e0b13f7b5bfa814a619d5e4acc0ee65f0e12835ad5a282c072bc9976a6e`.
- Use the [successful v1.0.37 signed APK artifact #13159639062](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41481537453/artifacts/13159639062) ([signed AAB artifact #13159798626](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41481537453/artifacts/13159798626)). Compare the embedded `apk-sha256.txt` and actual certificate before installation.
- Install **over** an existing signed v1.0.36 app; do **not uninstall**, clear data, bypass Android signature errors or lose saved orders/settings.
- Record prior version, new version, device + Android version and whether the existing user's language, Google login and My Orders remain available.

## B. Customer read-only checks (no new order required)

| Test area | Acceptance |
| --- | --- |
| Home | Exactly one active booking form, original five tabs, no duplicate promotional catalogue |
| English/Hindi | New install English; Profile language persists; Home selector, price heading and product name switch; note remaining untranslated legacy content |
| Products | Only currently active Dry Ice or approved Pyro; no invented prices or silently enabled other categories |
| Quantity and rates | Enter 10 kg / 20 kg locally without Submit; correct owner-managed rate, packing, extra transport and up-to-₹99,000 request reason |
| Dispatch | Today/Tomorrow and Morning/Evening existing keys and expiry rules retained |
| Tracking | Open only an already authorized existing record; do not expose tracking token, private contact or order PIN |
| Android app resume | Leave the app to background for 1 second and 20 seconds, reopen without process termination; update checker should never freeze |
| Manifest absent | No update banner without a real owner-published, allowlisted HTTPS release manifest |
| Update banner | For a **future valid owner-approved** v1.0.38+ release, show Later/Open update; never silently download or install |
| Theme | Check light/dark Booking/Tracking/Profile; legible focused inputs, selected/disabled slots and totals |
| Phone | Primary Call 95808 82066; WhatsApp 88963 32066, distinct correctly routed links |

## C. Owner PDF Save/Share QA

1. On an authorized owner phone, open the existing Monthly Report/Insights export. Verify the period runs from the **15th through the following 14th** in IST.
2. Trigger PDF export without editing or deleting any order. A real Android chooser should present **an attached PDF file**, not an unclickable text URI.
3. Choose an actual permitted PDF receiver/Save target, then open the resulting document. Confirm complete order/expenses pages, correct totals and verified payment separation. *The chooser appearing by itself is not proof of saving.*
4. Repeat when the receiver is unavailable/cancelled. The app must not say "saved" after failure; it must not silently expose private invoices or download to public storage without user action.
5. This remains **unverified on a physical phone** until a tester records result; automated mock tests establish only JavaScript/native-bridge intent.

## D. Controlled live checks — separately owner approved

- Use one explicitly authorized synthetic/test order only with a cleanup plan: customer booking → owner orders → packing → dispatch → complete → private tracking.
- Check separate owner, eligible staff and customer Android devices in foreground, background and cold-start FCM. Server `sent:1` does not prove Android receipt.
- Check payment verification, pickup reversal and staff permissions without changing unrelated records. No new Firestore Rules/Functions/feature switches or inventory auto-debit are implied.
- Block public Play/website manifest/live activation until documented device evidence and owner release approval.

**Status register:** Android in-place update: pending; English/Hindi real device: pending; PDF attachment Save/Share: pending; production notifications: pending; published update manifest: not approved/not verified.

## CI evidence
- Android signed APK + AAB, verified certificate: [run #41481537453](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41481537453), 2026-11-02. **This is not a completed phone test.**
- Offline React/product/notification/Monthly PDF contracts pass in GitHub review runs; do not equate mocked Android Share.file calls with a recipient receiving a PDF on the phone.
