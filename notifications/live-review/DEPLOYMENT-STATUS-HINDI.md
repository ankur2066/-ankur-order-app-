# Issue #11: लागू बदलाव और अगली मंजूरी

31 अक्टूबर 2026, **20:38:30 UTC** पर owner की मंजूरी के अनुसार केवल reviewed
Rules लागू की गईं। Firebase server compilation में कोई issue नहीं आया। Live
release और Rules source को फिर पढ़कर exact approved SHA-256 verify किया गया।

- Project: `ankur-dryice-app` (`928793147689`)
- Named database: `ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673`
- नया ruleset: `projects/ankur-dryice-app/rulesets/bfab829a-4bb0-4ec7-886d-c43546621092`
- Deployed SHA-256: `53d1a6a73915269ccea759a835e5b39c87d216e589094e532c474e331f2a17fb`
- [Deployment receipt](RULES-DEPLOYMENT-RECEIPT.json),
  [reviewed diff](firestore.proposed.diff), [baseline](firestore.baseline.rules)

## अब क्या ठीक हुआ

ग्राहक अपने profile से admin/staff role या permissions नहीं दे सकता। Verified
owner roles दे सकता है। ग्राहक का सामान्य profile और मौजूदा दो legacy staff
का access बना है। Explicit staff view/update denial लागू है। Private owner,
team और secret order tracking-token push registration paths खुल गए हैं; client
इन tokens को पढ़/list नहीं कर सकता। Customer-created booking में payment_verified
के बजाय pending_verification अनिवार्य है।

Pricing validators, product catalog और order forms नहीं बदले। कोई customer/order
record लिखा, हटाया या migrate नहीं हुआ। Source ZIP या पुरानी APK/signing नहीं
बदली। `(default)` Rules release का ruleset और updateTime पहले जैसा verify हुआ।

## अभी push चालू होने का दावा नहीं है

Functions API अभी DISABLED है। कोई notification Function deploy/invoke नहीं किया
गया। FCM API enabled है, लेकिन API enabled होने से phone delivery साबित नहीं
होती। BillingEnabled false और कोई billing account linked नहीं है। Cloud Billing
API फिर भी DISABLED है।

75 automated checks, complete backend package smoke, web build और native Android
compilation source commit `ed0ea9a3cf9016ec10ee77199fa41c608eab12f5` पर सफल हैं:
https://github.com/ankur2066/-ankur-order-app-/actions/runs/41226052997

पुराने backend review ZIP का NOT-DEPLOYED label Functions के लिए सही है; उस ZIP
में audit/deployment notes इस Rules release से पहले की snapshot हैं। इस receipt
को वर्तमान production स्थिति का प्रमाण मानें।

## अगली अलग मंजूरी: billing और Functions की inventory खोलना

Read-only listing में **एक खुला existing billing account**, अंत `F6C7AE`, currency
**INR**, मिला। अभी इसे project से link नहीं किया गया है। नया billing account,
नया Firebase project या payment method बनाने का प्रस्ताव नहीं है।

अगले approval scope का ठोस प्रस्ताव:

1. उसी existing account को `ankur-dryice-app` से link करके Blaze usage billing
   सक्रिय करना। इससे project के अन्य billable resources का usage भी charge हो
   सकता है; इसे केवल FCM के लिए अलग billing सीमा नहीं माना जा सकता।
2. Project-filtered **₹500 monthly budget alert**, 50/90/100% actual और 100%
   forecast thresholds। यह notification है, खर्च रोकने की hard limit नहीं।
3. Cloud Billing/Budget, Cloud Functions, Cloud Run, Eventarc, Cloud Build,
   Artifact Registry और आवश्यक Pub/Sub APIs सक्रिय करके v1/v2 Functions,
   Run और Eventarc की पूरी inventory पढ़ना। कोई Function deploy/delete,
   runtime IAM grant या order/test notification इस approval में शामिल नहीं है।
4. नया खर्च पैदा करने वाली test build/deploy अभी नहीं; inventory के बाद exact
   existing resource diff, saved revisions, runtime IAM और final deployment
   scope सामने रखेंगे। Unknown existing Functions को overwrite नहीं करेंगे।

**लागत:** Blaze में usage के अनुसार billing लगेगी। FCM स्वयं no-cost है। Prepared
notification compute में minInstances 0 और प्रति function maxInstances 1 रहेगा;
ये billing cap नहीं हैं। पहले दिए उदाहरण (1,000 monthly orders, 5 status updates,
2 seconds/invocation) में लगभग 11,000 invocations, 22,000 vCPU-seconds और 5,500
GiB-seconds हैं। Actual runtime, other account/project usage, region rates,
Firestore named-DB charges, Eventarc, builds, storage और network के बिना निश्चित
मासिक रकम या ₹0 का दावा नहीं है। ₹500 सिर्फ alert threshold का प्रस्ताव है।

**वापसी:** सिर्फ billing link को हटा देना सुरक्षित automatic rollback नहीं है—
वह project की सेवाएँ रोक सकता है। APIs/billing का rollback owner के साथ पूरे
project का प्रभाव देखकर होगा। Budget हटाने से खर्च बंद नहीं होता। Functions
की deployment मंजूरी और rollback inventory मिलने के बाद resource-specific होंगे।

## शेष release सीमाएँ

पुरानी APK में foreground Firestore + FCM duplicates की संभावना, pickup schema/
callable readiness और transport-total mismatch अभी unresolved हैं। APK को बदले
बिना full duplicate-free behavior का वादा नहीं है। Actual authorized test order
और owner/staff/customer test phones पर receipt के बिना Issue #11 बंद नहीं होगा।

## Rules rollback संदर्भ

जरूरी emergency में केवल इसी named release को पुराने saved ruleset
`projects/ankur-dryice-app/rulesets/c4fec604-0258-43e8-b41e-0f54de9dcbc3`
पर वापस point किया जा सकता है। इससे पुरानी escalation खामी लौटती है। Customer
records या registrations delete करने की जरूरत नहीं है। अपने-आप rollback या
किसी दूसरे release को बदलने का निर्णय नहीं लिया गया है।
