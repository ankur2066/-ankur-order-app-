# Issue #11: रिलीज़ से पहले की स्थिति

> Update 2026-10-31 20:38 UTC: owner-approved Rules-only release is now live and
> read-back verified. Backend Functions remain NOT DEPLOYED; billing is unlinked.
> See [current deployment status](live-review/DEPLOYMENT-STATUS-HINDI.md).

इस branch का deliverable **backend review package** है। यह नया Android APK,
production deployment नहीं है। मौजूदा v1.0.29 APK,
उसका package/signing और source ZIP नहीं बदले गए हैं।

## तैयार package

PR #12 की सफल **Verify Push Notifications without Production Access** CI run
के Artifacts में `Ankur-Issue11-Backend-Review-NOT-DEPLOYED-<commit>` मिलेगा।
नाम में commit जोड़ने से जिस code की जाँच हुई थी, उसका package पहचाना जा सकता है।

ZIP में:

- `runtime/firebase-functions/`: `index.js`, `notificationPush.js`,
  `pickupPolicy.js`, `package.json` और dependency lock। पुराने artifact में
  `pickupPolicy.js` छूट गई थी; वह कमी ठीक की गई है।
- `review/`: source से बनी Rules/configuration, audit notes और read-only
  Cloud Shell helper। source files production की snapshot नहीं हैं। `review/live-review/` में अलग
  captured live Rules, candidate/diff, sanitized evidence और approval packet हैं।
- `manifest.json`: source commit, मूल ZIP का Git blob और हर file का SHA-256।
- `NOT-DEPLOYED.md`: शेष जाँच और owner approval की शर्तें।

CI package की copy extract करके असली Firebase SDK dependencies install करती है
और network रोककर backend को load करती है। कोई callable/trigger invoke नहीं होता।
साथ में backend/helper/Rules tests, web build और native Android compilation चलते
हैं। सभी checks सफल होने पर ही ZIP upload होती है।

Package में keys, credentials, node_modules, APK, customer records या root पर
सीधे चलने वाला Firebase deployment configuration शामिल नहीं है। किसी पूरे
codebase या source Rules को live पर overwrite करने के लिए इसका उपयोग न करें।

## लाइव जाँच पूरी होने के बाद की स्थिति

सही project/named database, Singapore location, पुराने APK का certificate,
owner verification और दो legacy staff की पुष्टि हो गई है। FCM API चालू है;
Functions API बंद और billing account unlinked है। Functions की गिनती/API बंद
होने पर नहीं मिली; phone receipt अभी नहीं जाँची गई है।

Live Rules source Rules से अलग हैं। [छोटी प्रस्तावित diff और rollback](live-review/APPROVAL-HINDI.md)
तैयार हैं: profile role escalation बंद करना, explicit staff permissions लागू
करना और private token registrations जोड़ना। इसकी अलग Rules-only मंजूरी चाहिए;
Blaze या Functions deploy की मंजूरी इसमें शामिल नहीं है।

Official MCP ने Cloud Billing API गलती से enable की; केवल उस activation को
वापस करके DISABLED verify किया गया। कोई account link/Blaze activation नहीं हुआ।
Rules/Functions/customer data/APK नहीं बदले।

अगला बाकी काम: मंजूर Rules rollout; अलग billing/API/function approval और runtime
IAM; actual test phones पर receipt। पुराने APK के foreground duplicates, live
pickup schema और transport-total mismatch की सीमाएँ approval packet में स्पष्ट
हैं। सभी features को ready कहना अभी सही नहीं होगा।

1–2 नवंबर 2026 owner का लक्ष्य है; approval और phone verification के बिना पक्की
release तारीख नहीं दी जा सकती। तैयार review ZIP नया APK या live release नहीं है।
