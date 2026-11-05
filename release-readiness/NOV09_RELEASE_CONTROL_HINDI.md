# Ankur Dryice — 9 नवंबर 2026 पब्लिक रिलीज़ कंट्रोल

**लक्ष्य:** 9 नवंबर 2026. **स्थिति:** इस दस्तावेज़ की तैयारी का अर्थ लाइव रिलीज़, Google Play स्वीकृति या Firebase डिप्लॉयमेंट नहीं है। कोई डिप्लॉयमेंट / पब्लिक लिंक तब तक जारी नहीं किया जाएगा जब तक नीचे के प्रमाण पूरे न हों।

## नवंबर रिलीज़ में फीचर-स्कोप (कोई फीचर चुपके से हटाना नहीं)

| फीचर | ऐप में स्थान | चालू होने की शर्त |
|---|---|---|
| 1. Ice Calculator | Customer AI Features | स्थानीय गणना, राशि अंतिम बुकिंग पर सत्यापित |
| 2. AI Video Idea Builder | Customer AI Video (अलग टैब) | Prompt Copy + Gemini external; यह अपने आप वीडियो रेंडर नहीं करता |
| 3. Loyalty Rewards | AI Features | Backend enabled + verified loyalty policy/points |
| 4. Application Catalogue | Code module उपलब्ध, customer Product टैब हटाया गया | पुरानी नवंबर की owner-approved Dry Ice-only स्क्रीन सीमा; जनवरी के लिए रखे अन्य products सार्वजनिक न करें |
| 5. Wholesale Partner | AI Features | Backend + owner approval, quoted price |
| 6. Regular Supply | AI Features | Backend + owner approval; कोई auto-charge नहीं |
| 7. Promotions | AI Features | Verified price/limit/rules, owner-activated active code |
| 8. Inventory | Owner features | Verified starting stock, SKU mapping and backend |
| 9. Reports Hub | Owner features | Verified orders, actual receipts, monthly PDF device test |
| 10. FAQ / How-to | AI Features | Local guidance |
| 11. Rate Card | AI Features | Current verified rates |
| 12. Support Hub | AI Features | Call/WhatsApp links verified |
| 13. Service Area | AI Features | UP district selection; dispatch commitment per order |
| 14. Referral Share | AI Features | Backend; no automatic reward before owner verification |
| Daily Winner | Full-width banner above AI Features | Explicit user consent, owner controls, verified server Functions and Rules, initially disabled |
| Owner Dashboard | Owner login | All 7 operational sections, accounting, order control, staff permission |
| Staff Privacy | Staff login | **Requires live restrictive Rules**, sanitized projections, assignment/status/contact Functions + historical backfill |
| Booking + Tracking | Home / My Orders | Owner/customer real-device flow, rates and UPI manual verification |
| Customer navigation | Home / My Orders / AI Features / AI Video / Profile | Exact five tabs, no duplicate Products page |

**Important:** 14 feature definitions and screens in the private APK do not imply 14 production backends are enabled. The optional suite is deliberately gated by `settings/featureSuite.enabled===true`. Do not set it true before the Firebase Rules, IAM, financial configuration, App Check, cost and device tests are verified. Do not auto-enable promotions/rewards/pricing.

## Go/no-go gate for all-feature public launch

1. **Firebase current state (not just old GitHub receipts):** read-only extract named database Rules release/hash; deployed Functions with service-account IAM, App Check status, Firestore indexes and billing. Validate difference against proposed code. Avoid `(default)` DB.
2. **Backup & rollback:** read-back Rules backup, named Firestore collection export and restore rehearsal; no customer PII exported to GitHub artefacts. Never overwrite live Rules from an assumed baseline.
3. **Staff security:** deploy audited contact/status/projection Functions; dry-run historical backfill and reconcile two-way parity via `privacy/auditProjections.mjs --read-only` (zero missing/unsafe/stale/orphan); activate restrictive named-DB Rules and prove old staff APK cannot read raw customer orders/tracking; test owner/customer flows.
4. **Optional features:** deploy and verify `ankurFeatureAction`, receipt triggers and necessary Rules; prepare real owner-approved opening stock, partner roles and wholesale quotes, promotion limits, subscription dates, loyalty/referral terms. Only then enable `settings/featureSuite`; verify each module using test accounts with zero real charges.
5. **Daily Winner:** deploy `ankurWinnerConsent`, owner settings/manual pick and reviewed scheduler; verify opt-in, opt-out removal and customer-facing banner using synthetic records; owner chooses whether to enable it. No fabricated winner/gift.
6. **FCM:** current live notification Functions must be replaced/reviewed with the privacy-hardened worker and tested against revoked staff tokens. No phone/address in push contents.
7. **Android real-device QA:** original signer, package/version upgrade without uninstall; owner, two distinct staff roles, customer; booking 10/20 KG, payment pending/verified, tracking, notification tap, Monthly Report PDF Save/Share, AI Video, Daily Winner opt-out, soft delete, offline/retry.
8. **Public hosting:** upload the verified signed APK to owner-controlled HTTPS `/app-releases/<version>.apk`; verify public 200, correct APK SHA256 and content-type, no login requirements; then publish owner-approved `/app-updates/android-stable.json`. **Do not point public users to temporary private GitHub Actions ZIP.**
9. **Google Play:** separate Play Console account eligibility, store listing, privacy policy, Data Safety, AAB version/signature, testing tracks and Google approval; public Play availability by Nov 9 cannot be promised without an existing eligible account and approval. If a new personal developer account was created after 13 Nov 2023, Google requires 12 continuously opted-in testers for 14 days before production access application.
10. **Final approval:** owner signs off on deployed Functions/Rules, test receipts, APK hosting and legal/privacy documents. Only then mark **PUBLIC READY**.

## Evidence ledger (fill only with verified facts)

- Exact release-source SHA:
- Source CI and Firestore Emulator PASS URLs:
- Signed APK versionCode, versionName, certificate SHA256 and SHA256 file:
- Production named-DB Rules BEFORE and AFTER releases:
- Firestore backup/export location (private, no credentials here):
- Staff raw-read denial/owner/customer acceptance:
- Feature Suite owner-approved configuration/activation:
- Winner explicit-consent/opt-out live smoke test:
- FCM active staff/privacy test:
- Real Android device roles and installer upgrade:
- HTTPS APK URL and SHA256 fetch verification:
- Play Console track, testing requirement and review status:
- Final owner go/no-go:

Until these items are completed, **PRIVATE QA ONLY / PRODUCTION NOT VERIFIED**.

## Release-day fallback

If any server privacy gate remains unverified, do NOT publicly distribute an APK that exposes staff raw order access or advertises disabled backends as active. Keep the tested private APK for limited controlled QA and publish an accurate launch-update message rather than putting customer data at risk.
