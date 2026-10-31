# Issue #11: वर्तमान notification स्थिति

पुराने signed **v1.0.29 APK** के लिए approved notification backend live है।
तीनों Functions Singapore के `orderpush` codebase में ACTIVE हैं। Named database
के Rules, limited IAM/source/trigger verification और approved Blaze link/₹500
monthly alert के प्रमाण [deployment status](live-review/DEPLOYMENT-STATUS-HINDI.md)
में हैं। Alert hard cap नहीं है।

सीधा FCM TEST owner ने फोन पर मिलने की पुष्टि की। एक अलग approved synthetic
order ने पाँच real runtime event paths में हर बार sent 1 / failed 0 दिया और
उसके temporary records साफ/absent verify हैं। पाँच event-specific FCM phone
receipts अभी अलग से confirm नहीं हैं। Screenshot `1000985886.jpg` में दिखा
`New Order Received` toast existing Firestore in-app alert से मेल खाता है;
उसे अलग FCM receipt या successful tap का प्रमाण नहीं माना गया है।

Notification follow-up **v1.0.31 review candidate** में screenshot-style toast,
notification sheet और native action से order खोलने का एक रास्ता, TEST explanation,
readable Android data-only tap, earlier deduplication/cache/newest-order fixes हैं।
[एकत्र रिपोर्ट, latest build/download और प्रमाण](FINAL-REPORT-HINDI.md) देखें।
Older v1.0.30 candidate receipt एक historical build record है।

Installed app और original APK/source ZIP सुरक्षित हैं; candidate अपने-आप install,
publish या deploy नहीं होता। Separate customer/staff physical phones और candidate
foreground/background/closed-app/tap validation बाकी है। Pickup observer test,
`changeSelfPickup` callable के live होने का प्रमाण नहीं है। Existing transport-total
और pickup/schema readiness notification scope में नहीं बदली गई है।

Latest **v1.0.32 UI review candidate** में repeated navigation controls की सफाई
और पिछले notification/tap fixes शामिल हैं। Signed build, 104 checks और web/native
compilation सफल हैं। [Latest download और UI report](../ui-fixes/DECLUTTER-v132-HINDI.md)
देखें। Installed app/data/production settings नहीं बदले।
