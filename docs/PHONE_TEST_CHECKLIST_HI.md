# Android phone QA checklist

इसे signed test build पर owner, staff और test customer accounts के साथ करें। Production customer data न डालें।

1. Play/Test APK पर install या same-signature update करें; app version और package `com.ankurdryice.events` देखें।
2. पहली बार app English में खुले; language popup न आए।
3. Home, My Orders, AI Video और Profile चारों tabs खोलें; back navigation देखें।
4. Profile → Settings → Language से Hindi चुनें, app बंद/खोलें और भाषा persistence जाँचें; फिर English पर लौटाएँ।
5. Ice Calculator में अलग-अलग occasion/quantity डालें; estimate को booking न मानें; Home पर quantity handoff देखें।
6. Dry Ice booking बनाकर confirmation, order ID, tracking PIN और My Orders history जाँचें।
7. Owner account से order खोलें, amount/status/dispatch बदलें; customer tracking पर वही update देखें।
8. Staff account से sign-in करें; permissions के बाहर owner data न दिखे। Phone number तभी दिखे जब staff call action चुने।
9. Staff/owner order alerts और notification tap destination जाँचें; दूसरे customer का नाम/number notification में न हो।
10. Feature settings में सभी सात switches OFF देखें। हर feature को केवल staging पर एक-एक कर ON/OFF करें और customer view से verify करें।
11. Loyalty, promotion, partner, subscription और referral के लिए blank values पर action reject हो; कोई points/discount/credit स्वतः न बने।
12. Inventory में test SKU/opening balance, adjustment audit और dispatch debit को staging order पर सत्यापित करें।
13. 360 px और 440 px screen widths पर light/dark themes में text, buttons और dialogs देखें; white-on-white text, clipped controls और horizontal scroll न हो।
14. Call button `95808 82066` और WhatsApp button `88963 32066` अलग-अलग सही destination खोलें।
15. App को force close/reopen करके order, language, feature settings और update-check behavior की persistence जाँचें; परिणाम/स्क्रीनशॉट दर्ज करें।
