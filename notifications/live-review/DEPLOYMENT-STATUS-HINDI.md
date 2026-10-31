# Issue #11: वर्तमान live स्थिति

31 अक्टूबर 2026:

- **Rules लागू:** 20:38:30 UTC पर owner-approved security/registration candidate
  exact named database में live किया और SHA-256 read-back verify किया।
  [Rules receipt](RULES-DEPLOYMENT-RECEIPT.json)।
- **Billing चरण पूरा:** अगली मंजूरी के बाद existing INR account (अंत F6C7AE) से
  Blaze link हुआ। Project-filtered **₹500 monthly budget alert**, actual
  50/90/100% और forecast 100% thresholds और recipients verify हैं। यह hard
  spending cap नहीं है। [Billing/API receipt](BILLING-STAGE-RECEIPT.json)।
- **APIs सक्रिय:** Cloud Functions, Run, Eventarc, Build, Artifact Registry और
  Pub/Sub उपलब्ध हैं। Cloud Functions v1/v2 और Eventarc global inventories
  सफल और खाली हैं। Singapore/Mumbai Cloud Run lists पूरी और खाली हैं। Global
  Run list के पाँच अन्य regions unreachable हैं; उस सीमा को receipt में दर्ज किया है।
- **Functions अभी deploy नहीं:** केवल तीन reviewed notification exports वाला
  अलग `orderpush` stage तैयार है। Old pickup callable export नहीं होगा।
  Runtime keyless identity और named-database IAM प्रस्ताव भी साथ है।
  [तीन Functions की मंजूरी, लागत और rollback](FUNCTIONS-APPROVAL-HINDI.md)।

सही लक्ष्य project `ankur-dryice-app`, number `928793147689`, database
`ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673`, Singapore है।
Live Rules hash `53d1a6a73915269ccea759a835e5b39c87d216e589094e532c474e331f2a17fb` है।

पुरानी signed v1.0.29 APK, certificate और मूल source ZIP नहीं बदले। कोई customer/
order record लिखा, हटाया या migrate नहीं हुआ। Pricing validator/order form,
`(default)` Rules और App Check enforcement नहीं बदले। Actual phone receipt अभी
सत्यापित नहीं है; नया test order या test push नहीं भेजा गया।

75 checks वाले पहले backend source पर CI सफल थी। अब explicit runtime identity
और isolated three-export stage की expanded smoke verification के साथ वही पूरी
CI फिर चलेगी; PR #12 के current checks देखें। Stage generation/dependency loading
स्थानीय तौर पर network रोके हुए सफल है; इससे phone delivery साबित नहीं होती।

अभी शेष: अलग Functions/IAM production approval, deployment read-back और अधिकृत
phones/test order पर वास्तविक receipt। पुराने APK की foreground duplicate
सीमा, pickup callable/schema readiness और transport-total mismatch unresolved
हैं। उनकी सीमा दूर हुए बिना पूरा duplicate-free release या Issue #11 पूरा नहीं
कहा जाएगा। Rollback के exact resource guards अगले approval packet में हैं।
