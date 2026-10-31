# Issue #11: तीन notification Functions का अंतिम deployment प्रस्ताव

Rules live हैं। Owner की अगली मंजूरी के बाद existing INR account (अंत F6C7AE)
से Blaze जुड़ गया है; project-filtered ₹500/month alert और 50/90/100% actual,
100% forecast thresholds read-back verify हैं। Alert खर्च रोकता नहीं है। कोई
नई payment method/account नहीं बनाई गई। [Billing/API receipt](BILLING-STAGE-RECEIPT.json)।

## लाइव inventory का निष्कर्ष

31 अक्टूबर 2026, 21:07–21:10 UTC: सभी locations वाली Cloud Functions v1 और v2
lists सफल और खाली हैं; Eventarc global list भी खाली है। Singapore और Mumbai की
Cloud Run lists पूरी और खाली हैं। Global Run list में पाँच अन्य regions
unreachable हैं; उसे complete global Run inventory नहीं कहा जा रहा। Deployment
का scope केवल Singapore है, जिसकी inventory पूरी मिली है।

## लागू करने के लिए तैयार सटीक बदलाव

Project `ankur-dryice-app`, named DB
`ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673`, region
`asia-southeast1`, नया isolated codebase **orderpush**:

| नया Function | Trigger | उपयोग |
| --- | --- | --- |
| notifyNewAnkurOrder | orders/{orderId} create | owner और eligible staff/delivery को नए order का alert |
| notifyAnkurOrderProgress | order_tracking/{trackingToken} update | उसी order के customer और owner को status/payment alert |
| notifyAnkurSelfPickup | orders/{orderId} update | selfPickup status बदलने पर उस customer और owner को alert |

अलग entrypoint सिर्फ यही तीन exports रखता है। `changeSelfPickup` callable
इसमें export नहीं है; HTTP/callable या पूरे पुराने pickup codebase की deployment
नहीं होगी। Stage में कोई Firestore configuration नहीं है; approved live Rules
फिर नहीं चढ़ाई जाएँगी। Deploy command, मंजूरी के बाद ही:

```
firebase deploy --project ankur-dryice-app --only functions:orderpush --non-interactive
```

यह command केवल notifications/stage_push.py से बनाए अलग staging directory में
चलनी है। Original extracted app directory या पूरे review ZIP से deploy नहीं करना।
Staging helper package manifest के file hashes जाँचता है और network/deploy नहीं करता।

Runtime Node.js 22; प्रति Function minInstances 0, maxInstances 1, concurrency 10,
256 MiB, CPU 1, timeout 60 seconds और application retry false। At-least-once event
repetition फिर भी संभव है। कोई scheduled job या periodic order scan नहीं बनेगा।

## Runtime IAM

[Exact IAM प्रस्ताव](push-iam.proposed.json): नई keyless service account
`ankur-order-push@ankur-dryice-app.iam.gserviceaccount.com` के लिए दो custom roles।
पहले में Firestore read/list और invalid-token pruning के लिए transaction/delete
permissions हैं, **सिर्फ exact named database** की IAM condition के साथ। दूसरे
में सिर्फ `cloudmessaging.messages.create` है, target project पर। Firebase CLI
इसी explicit identity को Eventarc delivery में भी इस्तेमाल करती है; इसलिए इसे
project पर eventarc.eventReceiver और run.invoker भी चाहिए। Runtime को
Owner/Editor और order create/update permissions नहीं दिए जाएँगे। IAM database
condition document collection तक सीमित नहीं होती; code के pruning paths अलग
worker tests से जाँचे गए हैं। कोई service-account key नहीं बनेगी।

Firebase-managed agents की standard service roles तथा default compute identity
को eventarc.eventReceiver/run.invoker, और जरूरत हो तो run.builder, लग सकते हैं।
Pub/Sub managed agent को token-creator binding Firebase CLI लगा सकती है। ये
managed delivery/build permissions प्रस्ताव का हिस्सा हैं; existing unrelated
members/bindings नहीं हटेंगे। Live policy में default compute और appspot identities को पहले से
Editor role मिला है; उसे यह rollout हटाएगा नहीं। Dedicated notification runtime
को उस basic role से अलग रखा गया है। नए IAM changes के पहले policy/etag snapshot होगा।
Custom roles की सभी छह permissions को live IAM ने GA/SUPPORTED बताया है और
operator के account-create/custom-role-create/policy-update अधिकार verified हैं।

## लागत और सीमाएँ

Blaze usage billing पहले से मंजूर और चालू है। FCM no-cost है। Functions compute,
Firestore reads/subscriptions/pruning, Eventarc, builds, image storage, logging और
network usage bill हो सकते हैं। 1,000 orders/month, 5 updates/order और 2 seconds
per invocation का पहले वाला उदाहरण करीब 11,000 invocations, 22,000 vCPU-seconds
और 5,500 GiB-seconds है; actual usage/credits/rates के बिना रुपये में निश्चित
मासिक quote या ₹0 का दावा नहीं है। ₹500 budget **alert** है, hard cap नहीं।

नई Functions केवल नए events पर चलेंगी। कोई order backfill/migration, पुराने
customer record का update या synthetic test order इस deployment scope में नहीं
है। Notifications से stale invalid registrations का conditional pruning होगा;
यह पहले reviewed token-refresh-safe transaction है।

## Rollback और rollout guard

Deploy से तुरंत पहले v1/v2 target Functions और target-region services फिर पढ़ेंगे।
समान नाम का नया resource दिखे तो उसे overwrite नहीं करेंगे। तीन नए Functions
और उनके generated Eventarc/Run resources की returned names/revisions receipt
में बचेंगी। Failure पर केवल इसी deployment के नए resources हटाकर push रोका जा
सकता है। User/order records, live Rules, existing unrelated IAM और billing link
नहीं हटेंगे। केवल अपने नए runtime bindings/account/roles को, कहीं और इस्तेमाल
न होने की पुष्टि पर, वापस लिया जा सकता है। Shared API/service-agent permissions
अपने-आप delete नहीं होंगी। Billing unlink कोई automatic rollback नहीं है।

## पूरा Issue बंद करने से पहले

Actual owner/staff/customer phones पर foreground/background/closed receipt अभी
बिना जाँच के सफल नहीं कहा जाएगा। नए synthetic test order/target devices की
अनुमति deployment से अलग होगी; इस प्रस्ताव में कोई customer document नहीं लिखा
जाएगा। पुराने APK के Firestore+FCM foreground duplicates की सीमा बनी है।
Pickup callable/schema और transport-total mismatch इस तीन-trigger deployment से
ठीक नहीं होते। पुरानी APK को बदले बिना duplicate-free पूरा release कहना सही
नहीं होगा। Phone receipt के प्रमाण तक Issue #11 खुला रहेगा।

यह reviewed प्रस्ताव है; production Functions और IAM की मंजूरी अभी लंबित है।
