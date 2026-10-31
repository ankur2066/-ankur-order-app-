# Issue #11: वर्तमान live स्थिति

31 अक्टूबर 2026, अंतिम read-back 22:14 UTC:

- Owner-approved security/registration **Rules live** हैं।
- मंजूर existing INR account से **Blaze linked** है और **₹500 monthly budget
  alert** सत्यापित है। यह खर्च रोकने की सीमा नहीं है।
- मंजूर तीन notification Functions अब Singapore में **ACTIVE** हैं:
  `notifyNewAnkurOrder`, `notifyAnkurOrderProgress`, `notifyAnkurSelfPickup`।
  Codebase **orderpush**, Node.js 22, minInstances 0, maxInstances 1, concurrency
  10, 256 MiB, CPU 1 और 60s timeout read-back verify हैं।
- हर Eventarc trigger सही **named database** और reviewed document pattern पर है।
  Public Run invoker नहीं है। Runtime keyless account को named-database-conditioned
  custom data role, single-permission FCM sender role और आवश्यक event delivery
  roles मिले हैं; Owner/Editor role नहीं दिया गया। Existing IAM सुरक्षित है।
- तीनों deployed source ZIPs के Cloud Storage MD5 hashes reviewed CI source ZIP
  से मेल खाते हैं। Deployment codebase label सुधारते समय Google ने नई revisions
  बनाईं; अंतिम source bytes समान verify हुईं।
- मालिक के **1 Android push registration** की पुष्टि है। सीधे FCM से भेजे
  **Ankur Dryice — TEST** को server ने स्वीकार किया और owner ने फोन पर मिलना
  स्पष्ट रूप से confirm किया। यह वास्तविक device delivery है।

लक्ष्य: `ankur-dryice-app` (`928793147689`), database
`ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673`, region
`asia-southeast1`। `(default)` Rules release और named Rules का reviewed hash नहीं
बदला। पुरानी APK, signing और original source ZIP नहीं बदले। कोई existing
customer/order record और कोई synthetic order नहीं लिखा गया है।

प्रमाण:

- [Functions deployment receipt](FUNCTIONS-DEPLOYMENT-RECEIPT.json)
- [Final runtime/trigger/IAM/source verification](LIVE-PUSH-VERIFICATION.json)
- [Owner phone FCM test receipt](OWNER-PUSH-TEST-RECEIPT.json)
- [Rules receipt](RULES-DEPLOYMENT-RECEIPT.json)
- [Billing/API receipt](BILLING-STAGE-RECEIPT.json)

75 checks, दोनों real-SDK package/stage smoke checks, web build और native Android
compilation source commit `ef141cabf47fc23fe5557c24ee01ce8a1029ccfa` पर पास हैं:
https://github.com/ankur2066/-ankur-order-app-/actions/runs/41242545373

## शेष जाँच और सीमाएँ

सीधे FCM TEST की phone receipt, Firestore order → Function → FCM परीक्षण से
अलग प्रमाण है। वास्तविक order event, status/payment और pickup observer के
runtime alerts की जाँच अभी नहीं हुई। [एक नए synthetic TEST order की सीमित
योजना](TEST-ORDER-PLAN-HINDI.md) तैयार है; उस data write की अलग अनुमति अभी बाकी है।
अलग staff/customer फोन की physical receipt भी अभी नहीं जाँची गई है।

पुरानी APK में foreground Firestore+FCM duplicate व्यवहार, transport-total
mismatch और pickup callable/schema readiness की सीमाएँ बनी हैं।
`changeSelfPickup` callable इस तीन-trigger rollout में deploy नहीं हुआ है।
इसलिए पूरा duplicate-free release या Issue #11 पूरा होने का दावा नहीं है।
केवल अपने नए तीन Function resources का resource-specific rollback deployment
receipt से किया जा सकता है; पुराने customer data, shared IAM, Rules या billing
को automatic rollback में नहीं हटाना है।
