# Issue #11: रिलीज़ से पहले की स्थिति

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
  Cloud Shell helper। ये production की snapshot नहीं हैं।
- `manifest.json`: source commit, मूल ZIP का Git blob और हर file का SHA-256।
- `NOT-DEPLOYED.md`: शेष जाँच और owner approval की शर्तें।

CI package की copy extract करके असली Firebase SDK dependencies install करती है
और network रोककर backend को load करती है। कोई callable/trigger invoke नहीं होता।
साथ में backend/helper/Rules tests, web build और native Android compilation चलते
हैं। सभी checks सफल होने पर ही ZIP upload होती है।

Package में keys, credentials, node_modules, APK, customer records या root पर
सीधे चलने वाला Firebase deployment configuration शामिल नहीं है। किसी पूरे
codebase या source Rules को live पर overwrite करने के लिए इसका उपयोग न करें।

## असली release से पहले बाकी

1. [Cloud Shell निर्देश](CLOUD-SHELL-HINDI.md) से मौजूदा Firebase खाते की शुरुआती
   metadata report, या connected Firebase plugin से live inventory।
2. Live named database, Functions/triggers, पूरे deployed Rules, IAM/App Check,
   FCM permissions/logs और मौजूदा billing plan की पुष्टि। Helper अकेले यह पूरी
   जाँच नहीं करता।
3. Existing बनाम proposed Functions/Rules diff, अनुमानित लागत और ठोस rollback
   plan दिखाकर owner की production deployment मंजूरी। Billing बदलाव के लिए
   अलग स्पष्ट मंजूरी; Blaze अपने आप चालू नहीं होगा।
4. मंजूर test order और devices पर foreground/background/closed-app push,
   owner/staff/customer isolation, payment, pickup और duplicate behavior की जाँच।

1–2 नवंबर 2026 owner का लक्ष्य है। Firebase की authenticated पहुँच और वास्तविक
फोन परीक्षण मिलने से पहले इसे पक्की release तारीख नहीं माना जा सकता। इस
package को जारी करने से Issue #11 पूरा या live push सक्रिय नहीं हो जाता।
