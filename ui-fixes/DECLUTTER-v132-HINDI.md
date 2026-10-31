# दोहराए हुए controls की सफाई — v1.0.32 review

User के चार screenshots के आधार पर UI को सरल किया गया है। Navigation का मुख्य रास्ता नीचे के पाँच tabs हैं।

- Home से अतिरिक्त Products/AI पट्टी, खाली reserved box और दोहरा profile shortcut हटाया। Product selector, असली booking form और notification bell बने हैं।
- My Orders के ऊपर बार-बार आने वाले account/avatar/email, logout और नया-order shortcut हटाए। अब title और refresh हैं; हर order का record, amount, payment, tracking और reorder controls सुरक्षित हैं।
- Profile से दोहरा My Orders बटन हटाया। Owner dashboard, संपर्क और एक logout वहीं हैं। Rules की entry owner dashboard में उपलब्ध है।
- Standard, Pellets और Blocks के records अलग हैं; उन्हें नहीं हटाया। खाली image की जगह प्रत्येक category का अलग icon है।

**104 existing checks, web और native compilation पास।** [Verification](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41253033616)। चार screens दो themes में mobile viewport पर देखीं। Product selection, booking destination, bell, refresh, tracking, owner/profile callbacks और logout fixture boundary पर जाँचे। 35 KG पर ₹2100 दिखा। यह browser fixture preview है; physical Android proof नहीं। Final APK का वास्तविक stylesheet preview में इस्तेमाल हुआ।

[Signed build](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41253033578) · [Latest v1.0.32 APK ZIP](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41253033578/artifacts/13062067880)। APK package/version/certificate, Firebase resources, notification-tap और UI-build markers verify हैं। Downloaded ZIP digest और APK checksum CI से मेल खाते हैं। APK SHA-256: `04db0cb28ef3013a5b0df164650258f0c339db8be8ee3468fb0773578d607c56`।

Original v1.0.29 APK और पिछला v1.0.31 artifact सुरक्षित हैं। OrderForm, rates, catalog, Firebase client/configuration, notification routing और backend/Rules source byte-for-byte समान हैं। कोई ग्राहक/order/product record या live theme/billing setting नहीं बदली। कोई production deployment नहीं हुआ।

यह उसी package/certificate का private update है और पुराने notification fixes भी शामिल हैं। इसे अपने-आप install/publish नहीं किया गया। पुराने ऐप को uninstall करने की जरूरत नहीं है। [पूरा verification receipt](../notifications/live-review/UI-CANDIDATE-RECEIPT.json)।
