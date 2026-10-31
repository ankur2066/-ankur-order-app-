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

[पूरा वर्तमान status और प्रमाण](live-review/DEPLOYMENT-STATUS-HINDI.md) देखें।
पुराने review artifact का NOT-DEPLOYED label उसकी build-time snapshot था;
वर्तमान live स्थिति के लिए नए deployment/test receipts authoritative हैं।

अभी पाँच order-event alerts की अलग phone confirmation माँगी गई है। Separate
staff/customer फोन की physical receipt भी बाकी है। पुरानी APK के foreground
Firestore+FCM duplicates, pickup callable/schema और transport-total mismatch की
सीमाएँ बनी हैं। Pickup observer के सफल test का मतलब `changeSelfPickup` callable
live होना नहीं है। इसलिए पूरे app की हर feature ready या Issue #11 पूरा होने
का दावा अभी नहीं है। कोई existing customer/order record नहीं बदला या हटाया गया।
