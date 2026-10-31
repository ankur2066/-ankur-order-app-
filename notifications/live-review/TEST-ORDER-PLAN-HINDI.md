# अगली जाँच: एक नया, स्पष्ट synthetic TEST order

> Update: owner ने इस योजना को मंजूर किया। पाँच runtime paths और cleanup सफल
> हैं; [test receipt](SYNTHETIC-ORDER-TEST-RECEIPT.json) देखें। नीचे मूल योजना है।

तीनों Functions live हैं। Authenticated operator से भेजे सीधे FCM TEST की
phone receipt owner ने confirm की है। इससे device/FCM path साबित है; Firestore
order event से runtime Function चलने और उसके status/payment/pickup alerts की
end-to-end जाँच अभी बाकी है।

यह मूल pre-approval योजना थी; ऊपर के update और receipt में execution दर्ज है।
मंजूरी मिलने पर सटीक सीमा:

1. केवल **एक नया** order `TEST-FCM-20261031-98EE1A` बनाएँगे।
   customerName `TEST ONLY - notification check`, phone `0000000000`,
   city/district `TEST ONLY`, paymentNotes `SYNTHETIC TEST - not a real customer order`,
   quantity 1, dry ice subtotal ₹50, thermocol subtotal ₹10, transport ₹0 और
   test total ₹60 होंगे। कोई payment collect नहीं होगा और कोई असली booking नहीं है।
2. उसी नए order का एक `order_tracking` document और एक अस्थायी private customer
   push subscription बनाएँगे। Subscription में केवल पहले से authorized owner
   phone का token रहेगा; token कभी report/log में नहीं जाएगा। Secret tracking
   PIN सार्वजनिक नहीं होगा। Existing subscriptions/profile/order records नहीं बदलेंगे।
3. `exists:false` preconditions से collision होने पर कुछ overwrite नहीं होगा।
   नया order event, status change, fake payment-verification metadata, pickup
   confirmation और pickup reversal—कुल लगभग **5 TEST notifications** जाँचेंगे।
   New-order alert eligible registered staff को भी सामान्य code के अनुसार मिल
   सकता है; messages में TEST order ID होगा। यह किसी असली customer की सूचना नहीं है।
4. Runtime logs में इसी synthetic order ID के sent/failed counts और errors
   जाँचेंगे। Owner/customer subscriptions का physical destination यही authorized
   owner phone होगा; इसे अलग customer/staff phone पर verified receipt नहीं कहेंगे।
5. जाँच के बाद केवल अपने बनाए ये तीन temporary documents हटाएँगे। Marker और
   latest updateTime जाँचकर ही cleanup होगा; unrelated अथवा बदले हुए record पर
   deletion नहीं होगी। पुराने customer data, rates, users/roles, APK और billing
   को नहीं छुएँगे।

यह test pickup **notification observer** जाँचेगा; इससे missing `changeSelfPickup`
callable या client pickup schema तैयार होने का दावा नहीं होगा। Foreground
Firestore+FCM duplicate behavior की पुरानी APK सीमा बनी है। ₹500 alert खर्च की
hard limit नहीं है; इस परीक्षण के Functions/Firestore usage पर सामान्य Blaze
rates/credits लागू हैं।
