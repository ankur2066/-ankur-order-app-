# Issue #11: लाइव जाँच और मंजूरी का प्रस्ताव

> मंजूर Rules-only चरण 20:38 UTC पर लागू हो चुका है। नीचे का प्रस्ताव और
> audit स्थिति ऐतिहासिक हैं; [वर्तमान स्थिति](DEPLOYMENT-STATUS-HINDI.md) देखें।

जाँच: 31 अक्टूबर 2026, 17:23–17:31 UTC। पुरानी signed v1.0.29 APK
और मूल source ZIP सुरक्षित हैं। इस प्रस्ताव की कोई Rules/Functions deployment नहीं हुई है।

## सही मौजूदा लक्ष्य

- Firebase project: `ankur-dryice-app` (`928793147689`)
- **Named** database: `ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673`
- Database location: Singapore, `asia-southeast1`
- Android package: `com.ankurdryice.events`; original signed APK certificate के
  SHA-1 और SHA-256 दोनों लाइव Android app में दर्ज hashes से मेल खाते हैं।
- Owner का Firebase Auth email verified है। Role/permissions की सीमित projection
  में दो legacy staff मिले; दोनों के missing permission maps का पुराना access बचाया गया है।
  कोई customer name/phone/order document इस जाँच में नहीं पढ़ा गया।

## अभी वास्तव में क्या चालू है

FCM API चालू है। Functions, Cloud Run, Eventarc, Build और Artifact Registry APIs
बंद हैं। Functions/Run/Eventarc inventory ने `403 SERVICE_DISABLED` दिया;
इसे “कोई पुराना function नहीं है” का प्रमाण नहीं माना गया है। Billing account
linked नहीं है और billingEnabled false है। Phone delivery अभी सत्यापित नहीं है।

Play Integrity provider configured है; Firestore/Auth App Check unenforced है।
App Check enforcement इस प्रस्ताव में नहीं बदलेगी। Owner के IAM अधिकार से
भविष्य के function runtime service account के FCM अधिकार साबित नहीं होते।

## पहले चरण का सटीक प्रस्ताव: केवल Rules

[सहेजी live Rules](firestore.baseline.rules), [candidate](firestore.candidate.rules)
और [पूरी छोटी diff](firestore.proposed.diff) review के लिए साथ हैं। Source ZIP से
निकाली अलग Rules को live पर चढ़ाने का प्रस्ताव नहीं है।

| अभी की live Rules | प्रस्तावित व्यवहार |
| --- | --- |
| ग्राहक अपने users document में role admin/staff लिख सकता है | केवल verified owner role/permissions दे सकेगा; अपना सामान्य profile edit चलेगा |
| Owner email के लिए email_verified जाँचा नहीं जाता | verified owner अनिवार्य; owner का मौजूदा खाता verified मिला |
| staff के explicit view/update denial अनदेखे होते हैं | false permissions लागू; दोनों पुराने staff का missing-map access जारी |
| push token registration paths मौजूद नहीं | owner, eligible team और secret tracking-token customer के लिए private write-only registrations |
| ग्राहक booking में payment_verified बना सकता है | ग्राहक की नई booking केवल pending_verification; owner की manual entry बनी रहेगी |

Pricing formula, rates, catalog, order history और records इस candidate से नहीं बदलते।
Guest booking का order+tracking batch, ग्राहक profile और पुराने staff का status
update emulator में सफल हैं। Tokens को कोई client, owner भी, पढ़/list नहीं कर सकता।

**लागत:** Rules release के लिए Blaze या billing account जोड़ने की जरूरत नहीं है।
पुरानी APK registration retry करे तो सामान्य Firestore token writes होंगे; लागू
Firestore quota/rates के अनुसार usage लग सकता है। इस चरण में कोई function/FCM
send नहीं होगा और billing plan नहीं बदलेगा।

**Rollout guard:** मंजूरी के बाद exact named Rules release और source SHA-256
फिर पढ़ेंगे। Baseline hash `51a3dba894b2fb4e7c27c893e4dcf0044e48af97fd091d127895c323350006b4`
या ruleset बदल चुका हो तो deployment रोककर नया diff/test बनेगा। `(default)` release
को नहीं छुएँगे। Candidate hash
`53d1a6a73915269ccea759a835e5b39c87d216e589094e532c474e331f2a17fb` है।

**Rollback:** केवल इसी named release को saved ruleset
`projects/ankur-dryice-app/rulesets/c4fec604-0258-43e8-b41e-0f54de9dcbc3`
पर वापस point करना; orders/users/registrations को delete या migrate नहीं करना।
Rollback से पुरानी role escalation खामी लौटती है, इसलिए सिर्फ जरूरी emergency
में और अगले reviewed correction के साथ। नई Rules किसी record को बदलती नहीं हैं।

## अगला चरण: Functions और billing की अलग मंजूरी अभी बाकी

Prepared functions: `notifyNewAnkurOrder` → orders create,
`notifyAnkurOrderProgress` → order_tracking update,
`notifyAnkurSelfPickup` → orders update। Singapore region, minInstances 0,
maxInstances 1 प्रति function, concurrency 10, 256 MiB, CPU 1, timeout 60s,
application retry false। Delivery फिर भी at-least-once हो सकती है।

FCM messaging स्वयं no-cost है; Functions चलाने के लिए Blaze और billing account
की स्पष्ट मंजूरी चाहिए। Compute, Firestore reads/token writes/pruning transactions,
Eventarc, build, image storage, logs और network अलग usage खर्च कर सकते हैं।
उदाहरण: 1,000 orders/month और हर order पर 5 status updates (orders+tracking दोनों
लिखे जाएँ) लगभग 11,000 trigger invocations हैं; हर invocation 2 seconds मानी जाए
तो 22,000 vCPU-seconds और 5,500 GiB-seconds हैं। यह workload assumption है,
रुपये में quote या ₹0 की guarantee नहीं। Named DB की free-quota eligibility और
बाकी project usage जाँचे बिना मुफ्त usage मानना गलत होगा। maxInstances/budget
alerts खर्च की hard limit नहीं हैं। Account और budget चुने बिना billing activation
का प्रस्ताव मंजूरी के लिए तैयार नहीं माना गया है।

Billing/API enable की अलग मंजूरी के बाद पहले v1/v2 functions + Run/Eventarc फिर
list करेंगे; मौजूद function मिले तो उसकी config/revision/trigger बचाकर नया diff
दिखाएँगे। सिर्फ तीन reviewed exports select होंगे; पूरे `pickup` codebase की
deploy/delete नहीं होगी। Runtime service account की named-DB/FCM IAM permissions
अलग verify करनी होंगी। मौजूदा callable `changeSelfPickup` को इस चरण में नहीं बदलेंगे।

Functions rollback की शर्त: अगर नया resource हो, केवल उसी approved function और
उसके नए trigger/service को हटाना; अगर पुराना मिले, उसकी saved revision/config
restore करना। Billing downgrade, APIs बंद करना या shared IAM वापस लेना automatic
rollback नहीं होगा; उनके बाकी project पर प्रभाव की अलग समीक्षा जरूरी है।

## पुराने APK की वास्तविक सीमाएँ

- Foreground Firestore listener और FCM bridge उसी event को दो बार दिखा सकते हैं।
  Tray tag background notification को replace कर सकता है; वह sound/foreground
  deduplication या exactly-once delivery नहीं है। पुरानी APK को बदले बिना backend
  अकेले इस requirement की guarantee नहीं दे सकता।
- Live Rules में selfPickup/pickupBoxes/verifiedReceivedAmount schema और staffRequests
  support नहीं है। Proposed minimal Rules इसे चुपचाप नहीं बढ़ातीं। Existing pickup
  callable की उपलब्धता API बंद होने से नहीं पता चली; pickup readiness लंबित है।
- पुराने client का nonzero transport rate per-kg total और live Rules का flat
  transportPrice validator मेल नहीं खाते। Optional higher booking total भी उस
  validator से टकरा सकता है। Emulator में transport mismatch दर्ज है। Pricing या
  order form इस notification fix में बदला नहीं गया है।

इसलिए पहली मंजूरी **सिर्फ ऊपर की Rules security/registration diff** के लिए माँगी
जाएगी। इससे “push release पूरी हो गई” नहीं कहा जाएगा। अलग billing/function
मंजूरी, named runtime IAM, अधिकृत test order/phones और foreground/background/closed
receipt, payment, pickup, isolation तथा duplicates परीक्षण के बाद ही Issue #11 पूरा होगा।

## MCP की अनचाही API activation का खुलासा

Official Firebase MCP की project-context billing check ने 17:07 UTC पर चुपचाप
Cloud Billing **API** enable कर दी थी। यह अपेक्षित read-only व्यवहार नहीं था।
कोई billing account link या Blaze activation नहीं हुआ। MCP रोककर write guard
लगाया गया और केवल अपनी इस API activation को वापस किया गया; 17:20:54 UTC पर
API फिर DISABLED verify हुई। Rules, Functions, APK या customer data नहीं बदला।
यह घटना metadata evidence में दर्ज है; पूरी session को zero-write audit नहीं कहा गया है।

## आधिकारिक संदर्भ

- [Pricing](https://firebase.google.com/pricing)
- [Plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Runtime limits](https://firebase.google.com/docs/functions/manage-functions)
- [Regions](https://firebase.google.com/docs/functions/locations)
- [Android tag की सीमा](https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.androidnotification#androidnotificationtag)
