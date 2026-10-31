# Issue #11: notification backend की live स्थिति

मौजूदा signed **v1.0.29 APK** के लिए notification backend अब live है। पुरानी
APK, signing और मूल source ZIP नहीं बदले गए हैं; कोई नया APK install करना
इस rollout के लिए आवश्यक नहीं पड़ा।

- Security/registration Rules लागू और named database पर verify हैं।
- मंजूर Blaze account link और ₹500 monthly alert live हैं; alert hard cap नहीं है।
- तीनों notification Functions `orderpush` में ACTIVE हैं। Runtime/source,
  Eventarc filters और सीमित IAM verify हैं।
- Owner ने सीधे भेजा गया **Ankur Dryice — TEST** फोन पर मिलने की पुष्टि की।
- अलग मंजूर TEST order से **पाँच runtime paths** ने FCM को message भेजा:
  नया order, status, payment, pickup completion और reversal। हर बार **sent 1,
  failed 0**; पाँच अलग event IDs मिले। Temporary test records साफ और absent verify हैं।
- 75 automated checks, real-SDK package/stage smoke, web और native compilation
  source `ef141cabf47fc23fe5557c24ee01ce8a1029ccfa` पर पास हैं।

[एकत्र रिपोर्ट और नई client review build](FINAL-REPORT-HINDI.md) तथा
[backend का वर्तमान status/प्रमाण](live-review/DEPLOYMENT-STATUS-HINDI.md) देखें।
पुराने review artifact का NOT-DEPLOYED label उसकी build-time snapshot था;
वर्तमान live स्थिति के लिए नए deployment/test receipts authoritative हैं।

अभी पाँच order-event alerts की अलग phone confirmation माँगी गई है। Separate
staff/customer फोन की physical receipt भी बाकी है। पुरानी APK के foreground
Firestore+FCM duplicates के सुधार अलग v1.0.30 review candidate में हैं; पुरानी
installed APK नहीं बदली है। Pickup callable/schema और transport-total mismatch की
सीमाएँ notification rollout में नहीं बदली गई हैं। Pickup observer के सफल test का मतलब `changeSelfPickup` callable
live होना नहीं है। इसलिए पूरे app की हर feature ready या Issue #11 पूरा होने
का दावा अभी नहीं है। कोई existing customer/order record नहीं बदला या हटाया गया।

अलग signed **v1.0.30 review APK** का build सफल है; 90/90 checks, web/native
compilation और actual APK/package/certificate/Firebase resource verification
सफल हैं। [एकत्र रिपोर्ट, download और बाकी device gates](FINAL-REPORT-HINDI.md)
देखें। नई APK installed/published नहीं है; original v1.0.29 सुरक्षित है।
