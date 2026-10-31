# Issue #11: वर्तमान live स्थिति

31 अक्टूबर 2026:

- मंजूर security/registration **Rules live** हैं। Existing INR account से
  **Blaze linked** और **₹500 monthly budget alert** सत्यापित है। यह hard cap नहीं है।
- तीनों notification Functions Singapore में **ACTIVE** हैं, codebase **orderpush**:
  `notifyNewAnkurOrder`, `notifyAnkurOrderProgress`, `notifyAnkurSelfPickup`।
- Node.js 22, minInstances 0, maxInstances 1, concurrency 10, 256 MiB, CPU 1 और
  timeout 60s verify हैं। Every trigger exact named database/document pattern पर
  है; public Run invoker नहीं है। Runtime keyless identity को named-DB-conditioned
  read/list/pruning, single FCM send permission और आवश्यक event roles मिले हैं।
  Runtime को Owner/Editor नहीं मिला; पहले की IAM bindings सुरक्षित हैं।
- तीनों deployed source ZIP object hashes reviewed CI ZIP से मेल खाते हैं।
  Codebase label सुधार पर Google ने नई revisions बनाईं; अंतिम code bytes समान हैं।
- सीधे FCM से भेजा **Ankur Dryice — TEST** owner ने फोन पर मिलने की पुष्टि की।
- फिर अलग मंजूर synthetic order `TEST-FCM-20261031-98EE1A` से असली Firestore
  events ने runtime Functions चलाए। New order, status, payment, pickup completion
  और reversal—**पाँच अलग events में हर बार sent 1, failed 0, pruneFailed 0** मिला।
  उस test के पाँच logged event IDs अलग हैं; extra new-order send नहीं मिला।
- TEST order, tracking और temporary subscription हटाकर absence verify की गई।
  Logging quota interruption के बाद केवल undo के लिए same TEST fixture को
  trash-marked करके फिर बनाया गया था; दोनों cycles की cleanup सफल है।

लक्ष्य: `ankur-dryice-app` (`928793147689`), database
`ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673`, region
`asia-southeast1`। Approved Rules और `(default)` release नहीं बदले। पुरानी APK,
signing और source ZIP नहीं बदले। कोई existing customer/order record नहीं बदला
या हटाया गया। केवल अनुमति वाले नए synthetic fixtures पर writes/cleanup हुईं।

प्रमाण:

- [Live deployment](FUNCTIONS-DEPLOYMENT-RECEIPT.json)
- [Runtime/trigger/IAM/source verification](LIVE-PUSH-VERIFICATION.json)
- [Owner direct FCM receipt](OWNER-PUSH-TEST-RECEIPT.json)
- [Five runtime paths and cleanup](SYNTHETIC-ORDER-TEST-RECEIPT.json)
- [Rules](RULES-DEPLOYMENT-RECEIPT.json) और [billing/API receipt](BILLING-STAGE-RECEIPT.json)

75 checks, real-SDK full-package तथा isolated-stage smoke, web build और native
compilation source `ef141cabf47fc23fe5557c24ee01ce8a1029ccfa` पर पास हैं:
https://github.com/ankur2066/-ankur-order-app-/actions/runs/41242545373

## अभी बाकी प्रमाण/सीमाएँ

FCM accepted/sent count, phone receipt से अलग प्रमाण है। सीधे TEST का owner
phone receipt confirmed है; पाँच order-event alerts का अलग phone confirmation
अभी माँगा गया है। Customer test subscription का physical destination उसी owner
phone का token था; इसे अलग customer या staff phone पर physical verification
नहीं कहा जाएगा। Those separate-device checks remain pending.

पुरानी APK के foreground Firestore+FCM duplicates, transport-total mismatch और
pickup callable/schema readiness की सीमाएँ बनी हैं। `changeSelfPickup` callable
इस rollout में deploy नहीं हुआ; pickup observer test उस callable workflow को
साबित नहीं करता। Exactly-once delivery या पूरे app की हर feature readiness की
guarantee नहीं है। Issue #11 अभी खुला है।

केवल अपने बनाए तीन Functions/resources का rollback receipt से किया जा सकता है;
shared IAM, पुराने customer data, Rules और billing को automatic rollback में
नहीं हटाना है। इस समय rollback नहीं किया गया है।
