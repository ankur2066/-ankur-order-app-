# Ankur Dryice — v1.0.37 Private Test Handoff
**Date:** 2 November 2026, India Standard Time  
**Status:** Signed Android build and source tests successful; **not a public production release**.

## उपयोग के लिए सबसे नया प्रमाणित बिल्ड

- [Signed APK ZIP — GitHub artifact #13160417227](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41482732286/artifacts/13160417227) — निजी Android टेस्ट; लगभग 9 नवंबर 2026 UTC तक उपलब्ध।
- [Signed Google Play AAB ZIP — artifact #13159509265](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41482732286/artifacts/13159509265) — निजी Play तैयारी; लगभग 16 नवंबर 2026 UTC तक उपलब्ध।
- [Actual Android build/verification run #41482732286](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41482732286) — SUCCESS. Android package `com.ankurdryice.events`; versionCode **37**; versionName `1.0.37-season-test`.
- Signed APK और AAB के लिए पुराने release certificate का SHA-256 `ebb60e0b13f7b5bfa814a619d5e4acc0ee65f0e12835ad5a282c072bc9976a6e` verify हुआ। Android package/version और तीन broad permissions (installer, all-files, all-packages) की check भी सफल।
- ZIP के अंदर `app-release.apk` और `apk-sha256.txt` हैं। APK को फोन में बिना पुराना ऐप uninstall किए केवल सही package/certificate के साथ update करना है।

## इस सत्र में कोड से किए गए सुधार

1. ऐप दोबारा खोलने पर native Android `appStateChange` से सुरक्षित update-manifest check; छोटे background/foreground cycle में भी recheck और duplicate focus events पर throttle।
2. Home/Booking shell के product chooser, product name, rate label और booking heading पर English/Hindi preference; पूरा पुराना OrderForm/Admin/Tracking अनुवाद अभी पूरा नहीं है।
3. Monthly PDF को Android के निजी cache से **file attachment** के रूप में Share chooser में देना; browser में पुरानी `pdf.save` विधि सुरक्षित। 15th–14th IST accounting, 75 synthetic orders, payment verified vs booked, PDF error-path automated tests।
4. पुरानी app के dedicated Call link **95808 82066** को WhatsApp-only नंबर **88963 32066** से अलग रखने की source contract check।
5. Signed APK/AAB के original certificate, package version और broad permission checks; गलत certificate/permission पर CI failure।

## स्रोत और टेस्ट

- [Latest source/React CI #41482833393](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41482833393) — 34 source/unit, 4 Phase A, 59 React/component = **97 passed / 0 failed**.
- [Optional backend security emulator CI #41482808455](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41482808455) — success, **कोई production Firebase deploy नहीं**।
- [Draft PR #15](https://github.com/ankur2066/-ankur-order-app-/pull/15) खुला है। `main` merge नहीं हुआ। 14 optional feature definitions/routes को live production feature न मानें।
- [Detailed phone acceptance](https://github.com/ankur2066/-ankur-order-app-/blob/codex/all-14-phase-bc-english/docs/ANDROID_V137_DEVICE_QA.md) और [latest project progress](https://github.com/ankur2066/-ankur-order-app-/blob/codex/all-14-phase-bc-english/PROJECT_PROGRESS.md)।

## अभी क्या बाकी है

- Android फोन पर पुराने Signed APK के **ऊपर** v1.0.37 install/update; existing sign-in, orders, language, tracking PIN और app data न मिटें।
- Home English/Hindi, active Dry Ice/Pyro, 10kg/20kg calculation, Morning/Evening slots, light/dark contrast, My Orders और authorized tracking का **physical test**।
- Monthly Report PDF chooser से फाइल **वास्तव में सेव और खुलती है** या नहीं, अलग परीक्षण; mock test पूरा प्रमाण नहीं।
- Owner/Staff/Customer के अलग फोनों पर notifications (foreground/background/cold start), duplicate prevention, correct order tap, controlled test booking के लिए **अलग मंजूरी**।
- HTTPS `https://ankurdryice.store/app-updates/android-stable.json` manifest और signed APK का public host **लाइव/verified नहीं**। इसे मालिक की मंजूरी तथा सही डाउनलोड/सर्टिफिकेट जाँच के बाद ही प्रकाशित करें। Installed v1.0.34 या उससे पुराने ऐप को पहले एक बार समान सर्टिफिकेट वाला update चाहिए।
- Google Play developer account, Privacy Policy, Data Safety, app screenshots, testing eligibility तथा owner sign-off के बिना public release न करें।

**Safety:** कोई ग्राहक रिकॉर्ड, लाइव Firebase Functions/Rules, pricing, Play release, billing या मुख्य `main` branch नहीं बदली गई है। अगला सुरक्षित कदम real-device QA और deployment approval की प्रतीक्षा है।
