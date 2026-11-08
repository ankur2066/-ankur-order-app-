Warning: truncated output (original token count: 20106)
Total output lines: 1485

import React, { useState, useEffect, useMemo } from 'react';
import { UnitProductForm } from './UnitProductForm';
import { 
  Snowflake, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  Check, 
  ArrowRight,
  User,
  RotateCcw,
  X,
  CreditCard,
  MessageCircle,
  Upload,
  Image as ImageIcon,
  Share2,
  Loader2,
  QrCode,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { 
  writeBatch, 
  doc, 
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, signInWithGoogle, signOutUser } from '../firebase';
import { 
  getDispatchSlots, 
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_CALL_HREF,
  BUSINESS_WHATSAPP_BASE,
  UP_DISTRICTS
} from '../data/products';
import { addIstDays, formatDispatchDate, istDateKey } from '../utils/dispatchSchedule';
import { useInlinePromo } from '../hooks/useInlinePromo';
import { subscribeToRates, getLocalRates } from '../data/rates';
import type { Order, OrderTracking, ProductItem, RateSettings } from '../types';
import { applyProductRates, orderProductName } from '../data/catalog';
import type { User as FirebaseUser } from 'firebase/auth';

interface OrderFormProps {
  currentUser: FirebaseUser | null;
  onOrderSuccess: (orderId: string, trackingPin: string) => void;
  onGoToTrack?: (orderId: string, pin: string) => void;
  onGoToMyOrders?: () => void;
  reorderData?: Order | null;
  onClearReorder?: () => void;
  /** Product picked on the storefront (optional). Without it the form behaves exactly as before. */
  selectedProduct?: ProductItem | null;
  onClearProduct?: () => void;
}

const LegacyOrderForm: React.FC<OrderFormProps> = ({
  currentUser,
  onOrderSuccess,
  onGoToTrack,
  onGoToMyOrders,
  reorderData,
  onClearReorder,
  selectedProduct,
  onClearProduct
}) => {
  // Owner-controlled pricing rates
  const [baseRates, setRates] = useState<RateSettings>(getLocalRates());
  // Rates actually used for this booking: global rates, or the picked product's own rates.
  const rates: RateSettings = useMemo(
    () => (selectedProduct ? applyProductRates(baseRates, selectedProduct) : baseRates),
    [baseRates, selectedProduct]
  );
  const bookedProductName = orderProductName(selectedProduct);

  useEffect(() => {
    const unsub = subscribeToRates((loaded) => setRates(loaded));
    return () => unsub();
  }, []);

  // Form fields
  const pendingOrderStorageKey = 'ankur.pending.order.v1.' + (currentUser?.uid || 'guest');
  const [customerName, setCustomerName] = useState(currentUser?.displayName || '');
  const [customerType, setCustomerType] = useState<'retail' | 'wholesale'>('retail');
  const [thermocolIncluded, setThermocolIncluded] = useState(true);
  const [customerPhone, setCustomerPhone] = useState('');
  // Single city / place field: "शहर"
  const [address, setAddress] = useState('');
  
  // Custom-only quantity input allowing positive decimals (e.g. 2, 7, 10, 27.5); default 10
  const [quantityInput, setQuantityInput] = useState<string>('10');
  useEffect(() => {
    try {
      const raw = localStorage.getItem(pendingOrderStorageKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || draft.state !== 'pending' || !draft.form) return;
      setCustomerName(typeof draft.form.customerName === 'string' ? draft.form.customerName : '');
      setCustomerPhone(typeof draft.form.customerPhone === 'string' ? draft.form.customerPhone : '');
      setAddress(typeof draft.form.address === 'string' ? draft.form.address : '');
      setExtraAmountText(typeof draft.form.extraAmountText === 'string' ? draft.form.extraAmountText : '');
      setExtraAmountReason(typeof draft.form.extraAmountReason === 'string' ? draft.form.extraAmountReason : '');
      setThermocolIncluded(draft.form.thermocolIncluded !== false);
      setQuantityInput(typeof draft.form.quantityInput === 'string' ? draft.form.quantityInput : '10');
      if (typeof draft.form.dispatchTiming === 'string') setDispatchTiming(draft.form.dispatchTiming);
      setErrorMsg('A saved order is waiting for connection. Review the details and tap Place Order to retry.');
    } catch { /* Ignore invalid or unavailable local storage. */ }
  // Restore only once for this account.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!currentUser?.uid) { setCustomerType('retail'); return; }
    void getDoc(doc(db, 'users', currentUser.uid)).then((snap) => {
      const nextType = snap.data()?.customerType === 'wholesale' ? 'wholesale' : 'retail';
      setCustomerType(nextType);
      setThermocolIncluded(nextType === 'retail');
    }).catch(() => setCustomerType('retail'));
  }, [currentUser?.uid]);
  
  // Dispatch Slots (IST)
  const dispatchSlots = getDispatchSlots();
  // Select first non-disabled slot by default
  const defaultSlot = dispatchSlots.find(s => !s.disabled)?.label || dispatchSlots[0].label;
  const [dispatchTiming, setDispatchTiming] = useState<string>(defaultSlot);

  interface OrderSuccessDetails {
    orderId: string;
    trackingPin: string;
    customerName: string;
    customerPhone: string;
    address: string;
    quantityKg: number;
    totalAmount: number;
    dispatchTiming: string;
  }

  // Submission & UI States
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<OrderSuccessDetails | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  // Optional Payment Screenshot selection
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Duplicate Order Protection State
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicatePreviousOrder, setDuplicatePreviousOrder] = useState<Order | null>(null);

  // Helper for human-readable order status in Hindi & English
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'प्रतीक्षित (Pending)';
      case 'confirmed': return 'कन्फर्म (Confirmed)';
      case 'in_packing': return 'पैकिंग जारी (In Packing)';
      case 'dispatched': return 'डिस्पैच हो गया (Dispatched)';
      case 'delivered': return 'डिलीवर हो गया (Delivered)';
      case 'cancelled': return 'रद्द (Cancelled)';
      default: return status;
    }
  };

  // Find matching order placed within the last 3 hours with same product, same quantity (KG), same location, and same dispatch timing
  const findRecentMatchingOrder = async (phone: string): Promise<Order | null> => {
    const cleanPhone = getClean10DigitPhone(phone);
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const now = Date.now();

    const currentQty = currentQuantityKg;
    const currentLoc = address.trim().toLowerCase();
    const currentTiming = dispatchTiming.trim();
    const currentProduct = 'ड्राई आइस (Dry Ice)';

    // 1. Check local saved orders
    try {
      const stored = localStorage.getItem('ankur_dryice_placed_orders_v1');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          const match = list.find((ord: any) => {
            const ordPhone = getClean10DigitPhone(ord.customerPhone || '');
            const ordTime = ord.createdAtMs || (ord.createdAt ? new Date(ord.createdAt).getTime() : 0);
            const isMatch = (cleanPhone && ordPhone === cleanPhone) || 
                            (currentUser && ord.userId && ord.userId === currentUser.uid);
            const isRecent = (now - ordTime) <= THREE_HOURS_MS && (now - ordTime) >= 0;
            const notCancelled = ord.status !== 'cancelled';

            const ordQty = Number(ord.quantityKg || 0);
            const ordLoc = (ord.address || ord.city || ord.district || '').trim().toLowerCase();
            const ordTiming = (ord.dispatchTiming || '').trim();
            const ordProduct = (ord.productName || 'ड्राई आइस (Dry Ice)').trim();

            const isSameProduct = ordProduct === currentProduct;
            const isSameQty = ordQty === currentQty;
            const isSameLoc = ordLoc === currentLoc;
            const isSameTiming = ordTiming === currentTiming;

            return isMatch && isRecent && notCancelled && isSameProduct && isSameQty && isSameLoc && isSameTiming;
          });
          if (match) return match as Order;
        }
      }
    } catch (e) {
      console.warn('Error reading local orders:', e);
    }

    // 2. If authenticated user, also check Firestore orders
    if (currentUser) {
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('userId', '==', currentUser.uid));
        const snap = await getDocs(q);
        const matches: Order[] = [];
        snap.forEach((d) => {
          const ord = d.data() as Order;
          if (!ord.isTrash && ord.status !== 'cancelled') {
            const ordPhone = getClean10DigitPhone(ord.customerPhone || '');
            const ordTime = ord.createdAt?.toMillis 
              ? ord.createdAt.toMillis() 
              : (ord.createdAt?.seconds ? ord.createdAt.seconds * 1000 : 0);
            const isMatch = (cleanPhone && ordPhone === cleanPhone) || ord.userId === currentUser.uid;
            const isRecent = (now - ordTime) <= THREE_HOURS_MS && (now - ordTime) >= 0;

            const ordQty = Number(ord.quantityKg || 0);
            const ordLoc = (ord.address || ord.city || ord.district || '').trim().toLowerCase();
            const ordTiming = (ord.dispatchTiming || '').trim();
            const ordProduct = (ord.productName || 'ड्राई आइस (Dry Ice)').trim();

            const isSameProduct = ordProduct === currentProduct;
            const isSameQty = ordQty === currentQty;
            const isSameLoc = ordLoc === currentLoc;
            const isSameTiming = ordTiming === currentTiming;

            if (isMatch && isRecent && isSameProduct && isSameQty && isSameLoc && isSameTiming) {
              matches.push(ord);
            }
          }
        });
        if (matches.length > 0) {
          matches.sort((a, b) => b.orderId.localeCompare(a.orderId));
          return matches[0];
        }
      } catch (e) {
        console.warn('Error checking Firestore orders for duplicate:', e);
      }
    }

    return null;
  };

  // Customer Google Login State
  const [customerLoggingIn, setCustomerLoggingIn] = useState(false);

  // Sync customerName with currentUser if customerName is empty or not customized
  // Fetch saved profile from Firestore for authenticated user
  useEffect(() => {
    if (currentUser) {
      const fetchProfile = async () => {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.customerName) setCustomerName(data.customerName);
            if (data.customerPhone) setCustomerPhone(data.customerPhone);
            if (data.city) setAddress(data.city);
          } else if (currentUser.displayName && !customerName) {
            setCustomerName(currentUser.displayName);
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
          if (currentUser.displayName && !customerName) {
            setCustomerName(currentUser.displayName);
          }
        }
      };
      fetchProfile();
    }
  }, [currentUser]);

  const handleCustomerGoogleSignIn = async () => {
    try {
      setCustomerLoggingIn(true);
      setErrorMsg(null);
      const cred = await signInWithGoogle();
      if (cred?.user?.displayName && !customerName) {
        setCustomerName(cred.user.displayName);
      }
    } catch (err: any) {
      console.error('Customer Google Login error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Google से लॉगिन करने में त्रुटि आई। कृपया पुनः प्रयास करें।');
      }
    } finally {
      setCustomerLoggingIn(false);
    }
  };

  // Pre-fill if reorderData passed
  useEffect(() => {
    if (reorderData) {
      setCustomerName(reorderData.customerName || '');
      setCustomerPhone(reorderData.customerPhone || '');
      setAddress(reorderData.address || reorderData.district || '');
      setQuantityInput(String(reorderData.quantityKg || 10));
      setReorderNotice(`पिछले ऑर्डर ${reorderData.orderId} (${reorderData.quantityKg} kg) की जानकारी भरी गई है।`);
    }
  }, [reorderData]);

  // Live Pricing calculation based on user custom quantity input (supports decimals, 0 if empty/invalid)
  const parsedQuantity = parseFloat(quantityInput);
  const [extraAmountText, setExtraAmountText] = useState('');
  const [extraAmountReason, setExtraAmountReason] = useState('');
  const approvedAmount = (base: number) => {
    const request = Number(extraAmountText);
    return customerType === 'wholesale' && extraAmountText.trim() !== '' && Number.isFinite(request) && request > 0 && request <= 99000
      ? Math.round(request * 100) / 100 : base;
  };
  const extraPriceNote = (normal: string) => {
    const reason = extraAmountReason.trim().slice(0, 180);
    const english = document.documentElement.dataset.appLanguage === 'en';
    return [normal, extraAmountText.trim() && customerType === 'wholesale' ? (english ? 'Requested total: ₹' : 'ग्राहक की राशि: ₹') + extraAmountText : '',
      reason ? (english ? 'Reason: ' : 'कारण: ') + reason : ''].filter(Boolean).join(' | ');
  };
  const currentQuantityKg = (quantityInput.trim() === '' || isNaN(parsedQuantity) || parsedQuantity <= 0) ? 0 : parsedQuantity;
  const promo = useInlinePromo({ customerName: customerName.trim(), customerPhone: customerPhone.replace(/[^0-9]/g, '').slice(-10), address: address.trim(), quantityKg: currentQuantityKg, dispatchTiming }, currentUser?.uid || 'guest');
  const [promoNotice, setPromoNotice] = useState('');
  const activeDryIceRate = customerType === 'wholesale' ? rates.wholesaleRate : rates.dryIceRate;
  const currentUnitRate = (activeDryIceRate || 0) + (thermocolIncluded ? rates.thermocolRate : 0) + (rates.transportRate || 0);
  const dryIceSubtotal = Math.round(currentQuantityKg * (activeDryIceRate || 0) * 100) / 100;
  const thermocolSubtotal = thermocolIncluded ? Math.round(currentQuantityKg * rates.thermocolRate * 100) / 100 : 0;
  const totalAmount = Math.round(currentQuantityKg * currentUnitRate * 100) / 100;

  // Indian phone validator (10 digits starting with 6, 7, 8, or 9)
  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
    return /^[6-9]\d{9}$/.test(tenDigits);
  };

  const getClean10DigitPhone = (phone: string): string => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPaymentScreenshot(file);
      const previewUrl = URL.createObjectURL(file);
      setScreenshotPreview(previewUrl);
      setShareFeedback(null);
    }
  };

  const handleRemoveScreenshot = () => {
    setPaymentScreenshot(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
      setScreenshotPreview(null);
    }
    setShareFeedback(null);
  };

  // Helper to build WhatsApp message text with full customer order details & total amount
  const getWhatsAppMessageText = (orderId: string): string => {
    const name = (successData?.customerName || customerName).trim() || 'ग्राहक';
    const phone = successData?.customerPhone || getClean10DigitPhone(customerPhone) || customerPhone;
    const place = (successData?.address || address).trim() || 'उत्तर प्रदेश';
    const qty = successData?.quantityKg ?? (currentQuantityKg > 0 ? currentQuantityKg : (parseFloat(quantityInput) || 10));
    const amountVal = successData?.totalAmount ?? (totalAmount > 0 ? totalAmount : (Math.round(qty * currentUnitRate * 100) / 100));
    const timing = successData?.dispatchTiming || dispatchTiming;
    const pin = successData?.trackingPin;
    const paymentStatusText = paymentScreenshot 
      ? 'भुगतान संपन्न (स्क्रीनशॉट चैट में संलग्न)' 
      : 'भुगतान संपन्न (स्क्रीनशॉट चैट में भेज रहा हूँ)';

    const orderLines = [
      `*अंकुर ड्राई आइस (Ankur Dry Ice)*`,
      `*ऑर्डर एवं पेमेंट विवरण (Order & Payment Confirmation)*`,
      ``,
      `नमस्ते, मैंने ऑर्डर #${orderId} का भुगतान पूरा कर दिया है। कृपया ऑर्डर विवरण एवं भुगतान स्वीकार करें:`,
      ``,
      `📋 *ऑर्डर विवरण (Order Details):*`,
      `• ऑर्डर ID: #${orderId}`,
      pin ? `• गोपनीय ट्रैकिंग PIN: ${pin}` : null,
      `• ग्राहक का नाम: ${name}`,
      `• मोबाइल नंबर: ${phone}`,
      `• City / जगह: ${place} (पता/Address)`,
      `• उत्पाद: ड्राई आइस (Dry Ice)`,
      `• मात्रा: ${qty} KG`,
      `• Dispatch Time: ${timing}`,
      `• कुल राशि: ₹${amountVal}`,
      `• पेमेंट स्थिति: ${paymentStatusText}`,
      `• भुगतान माध्यम: Paytm UPI (8896332066@paytm)`,
      ``,
      paymentScreenshot 
        ? `📸 [नोट: पेमेंट स्क्रीनशॉट चैट में अटैच करके भेजा जा रहा है]` 
        : `📸 [नोट: कृपया इस चैट में पेमेंट का स्क्रीनशॉट अटैच करके भेजें]`
    ].filter(Boolean) as string[];

    return orderLines.join('\n');
  };

  // Helper to build WhatsApp deep link URL with +918896332066
  const getWhatsAppPaymentDeepLink = (orderId: string): string => {
    const message = getWhatsAppMessageText(orderId);
    return `https://wa.me/918896332066?text=${encodeURIComponent(message)}`;
  };

  // Desktop web WhatsApp fallback URL with +918896332066
  const getWhatsAppWebPaymentLink = (orderId: string): string => {
    const message = getWhatsAppMessageText(orderId);
    return `https://web.whatsapp.com/send?phone=918896332066&text=${encodeURIComponent(message)}`;
  };

  // Pre-filled WhatsApp inquiry link with entered order details & total amount
  const getFormWhatsAppInquiryLink = (): string => {
    const name = customerName.trim();
    const phone = getClean10DigitPhone(customerPhone) || customerPhone.trim();
    const place = address.trim();
    const qty = currentQuantityKg > 0 ? currentQuantityKg : (parseFloat(quantityInput) || 10);
    const amountVal = totalAmount > 0 ? totalAmount : (Math.round(qty * currentUnitRate * 100) / 100);

    const inquiryLines = [
      `नमस्ते अंकुर ड्राई आइस,`,
      `मुझे ड्राई आइस ऑर्डर के संबंध में पूछताछ / बुकिंग करनी है:`,
      ``,
      `📋 *ऑर्डर विवरण:*`,
      name ? `• ग्राहक का नाम: ${name}` : null,
      phone ? `• मोबाइल नंबर: ${phone}` : null,
      place ? `• City / पता: ${place}` : null,
      `• उत्पाद: ड्राई आइस (Dry Ice)`,
      `• मात्रा: ${qty} KG`,
      `• Dispatch Time: ${dispatchTiming}`,
      `• कुल राशि: ₹${amountVal}`,
    ].filter(Boolean) as string[];

    return `https://wa.me/918896332066?text=${encodeURIComponent(inquiryLines.join('\n'))}`;
  };

  // Direct WhatsApp payment message logic - opens WhatsApp chat directly with +918896332066
  const handleSharePaymentScreenshot = (orderId: string) => {
    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const directChatUrl = isMobile
      ? getWhatsAppPaymentDeepLink(orderId)
      : getWhatsAppWebPaymentLink(orderId);

    window.open(directChatUrl, '_blank', 'noopener,noreferrer');

    setShareFeedback(
      paymentScreenshot
        ? 'WhatsApp चैट (+91 8896332066) खुल रही है। कृपया चैट में अटैचमेंट (+) आइकन से अपना चुना हुआ पेमेंट स्क्रीनशॉट भेजें।'
        : 'WhatsApp चैट (+91 8896332066) खुल रही है। कृपया चैट में अपने पेमेंट का स्क्रीनशॉट अटैच करके भेजें।'
    );
  };

  useEffect(()=>{
    const fill=(e:Event)=>{const kg=(e as CustomEvent<number>).detail;
      if(Number.isInteger(kg)&&kg>=10&&kg<=5000)setQuantityInput(String(kg));};
    try{
      const raw=window.sessionStorage.getItem('ankur.pending.calculated.kg');
      const kg=Number(raw);
      if(raw&&Number.isInteger(kg)&&kg>=10&&kg<=5000)setQuantityInput(String(kg));
      window.sessionStorage.removeItem('ankur.pending.calculated.kg');
    }catch{}
    window.addEventListener('ankur-estimated-quantity',fill);
    return()=>window.removeEventListener('ankur-estimated-quantity',fill);
  },[]);
  const executeOrderSubmission = async () => {
    if (submitting) return; // Prevent accidental double submission
    setErrorMsg(null);

    try {
      setSubmitting(true);

      const parsedQty = parseFloat(quantityInput);
      const cleanPhone = getClean10DigitPhone(customerPhone);
      const cleanAddress = address.trim();

      // Reuse a saved order identity if the form still matches the pending draft.
      const fingerprint = JSON.stringify([customerName.trim(), cleanPhone, cleanAddress, parsedQty, dispatchTiming, customerType, thermocolIncluded, extraAmountText.trim(), extraAmountReason.trim(), selectedProduct?.id || 'dry-ice']);
      let pending: any = null;
      try { pending = JSON.parse(localStorage.getItem(pendingOrderStorageKey) || 'null'); } catch { pending = null; }
      if (!pending || pending.fingerprint !== fingerprint || typeof pending.orderId !== 'string' || typeof pending.trackingPin !== 'string') {
        const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        pending = { state: 'pending', fingerprint, orderId: `ADI-${dateSegment}-${randomSuffix}`, trackingPin: Math.floor(100000 + Math.random() * 900000).toString() };
      }
      pending.state = 'pending';
      pending.form = { customerName, customerPhone, address, quantityInput, dispatchTiming, extraAmountText, extraAmountReason, thermocolIncluded };
      try { localStorage.setIte…8106 tokens truncated…      </div>

                  <div className="bg-white border border-sky-200 rounded-lg p-2.5 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold">UPI ID / Paytm नंबर:</div>
                      <div className="font-mono font-bold text-slate-900 text-xs">8896332066@paytm</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('8896332066@paytm');
                        setCopiedUpi(true);
                        setTimeout(() => setCopiedUpi(false), 2000);
                      }}
                      className="px-2 py-1 text-[11px] font-semibold text-sky-600 hover:text-sky-800 bg-sky-50 rounded-md border border-sky-200 flex items-center gap-1 cursor-pointer transition-colors"
                      title="UPI ID कॉपी करें"
                    >
                      {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedUpi ? 'कॉपी हुआ' : 'कॉपी करें'}</span>
                    </button>
                  </div>
                  
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Paytm Business या किसी भी UPI ऐप से राशि <strong className="text-slate-900 font-mono">₹{successData.totalAmount}</strong> का भुगतान करें। भुगतान के बाद नीचे से स्क्रीनशॉट चुनकर ओनर (+91 8896332066) को WhatsApp पर भेजें।
                  </p>

                  {/* Optional Screenshot Picker */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      पेमेंट का स्क्रीनशॉट चुनें (वैकल्पिक):
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-sky-500 text-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-sky-600" />
                        <span>{paymentScreenshot ? 'दूसरा स्क्रीनशॉट चुनें' : 'पेमेंट का स्क्रीनशॉट चुनें'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          className="hidden"
                        />
                      </label>
                      {paymentScreenshot && (
                        <button
                          type="button"
                          onClick={handleRemoveScreenshot}
                          className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold p-1"
                        >
                          हटाएं
                        </button>
                      )}
                    </div>

                    {screenshotPreview && (
                      <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <img 
                            src={screenshotPreview} 
                            alt="Payment Preview" 
                            className="w-11 h-11 object-cover rounded-md border border-emerald-300 shadow-xs" 
                          />
                          <div className="min-w-0 flex-1 text-[11px]">
                            <span className="text-slate-800 font-medium truncate block">{paymentScreenshot?.name}</span>
                            <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" /> स्क्रीनशॉट चुना गया
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] text-emerald-900 bg-white/90 p-1.5 rounded border border-emerald-100 font-medium">
                          💡 <strong>निर्देश:</strong> नीचे &quot;WhatsApp पर पेमेंट फोटो भेजें&quot; दबाने पर <strong>+91 8896332066</strong> की चैट खुलेगी। वहां <strong>Attach (+) / गैलरी</strong> से यही स्क्रीनशॉट सेंड करें।
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Send Photo to WhatsApp Button */}
                  <a
                    href={getWhatsAppPaymentDeepLink(successData.orderId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSharePaymentScreenshot(successData.orderId);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm text-center"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>WhatsApp पर पेमेंट फोटो भेजें</span>
                  </a>

                  {shareFeedback && (
                    <div className="text-[11px] text-emerald-950 bg-emerald-50 p-2 rounded-lg border border-emerald-200 space-y-0.5">
                      <div className="flex items-center gap-1 font-bold text-emerald-800">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>WhatsApp चैट लिंक (+91 8896332066)</span>
                      </div>
                      <p className="text-emerald-900 text-[10px] leading-relaxed">{shareFeedback}</p>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400">
                    नोट: स्क्रीनशॉट सर्वर पर स्टोर नहीं किया जाता — केवल ओनर को WhatsApp (+91 8896332066) सत्यापन हेतु भेजा जाता है।
                  </p>

                  {/* Navigation link to My Orders */}
                  <div className="pt-2 text-center border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessData(null);
                        onGoToMyOrders?.();
                      }}
                      className="text-xs text-sky-600 hover:text-sky-800 font-semibold underline underline-offset-4 cursor-pointer inline-flex items-center gap-1 transition-colors"
                    >
                      <span>मेरे सभी ऑर्डर देखें</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Booking Form */}
          <div className="apb-form-panel">
            <div className="apb-form-header flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="p-1 rounded-md bg-sky-50 text-sky-600">
                  <Snowflake className="w-4 h-4" />
                </span>
                <h2 className="apb-form-title text-base sm:text-lg font-extrabold">
                  Dry Ice Booking Form
                </h2>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                ₹{currentUnitRate}/kg ऑल-इन
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="apb-fields-grid grid grid-cols-1 min-[480px]:grid-cols-2 gap-3">
                {/* 1. Customer Name */}
                <div>
                  <label className="apb-field-label text-sm font-semibold block mb-1.5">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative min-w-0">
                    <User className="apb-input-icon w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="उदा. राहुल शर्मा"
                      className="apb-input w-full min-w-0 pl-10 pr-3 py-3 text-base focus:outline-none"
                    />
                  </div>
                </div>

                {/* 2. मोबाइल नंबर */}
                <div>
                  <label className="apb-field-label text-sm font-semibold block mb-1.5">
                    Mobile (10 digits) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="apb-input-icon w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="उदा. 9876543210"
                      className="apb-input w-full pl-10 pr-3 py-3 text-base focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ROW 2: [ City ] [ Quantity (KG) ] */}
              <div className="apb-fields-grid grid grid-cols-2 gap-3">
                {/* 3. City */}
                <div>
                  <label className="apb-field-label text-sm font-semibold block mb-1.5">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="apb-input-icon w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      required
                      minLength={3}
                      list="up-city-suggestions"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Lucknow"
                      className="apb-input w-full pl-10 pr-3 py-3 text-base focus:outline-none"
                    />
                    <datalist id="up-city-suggestions">{UP_DISTRICTS.map((district) => <option key={district.id} value={district.name.replace(/^.*?\((.*?)\).*$/, '$1')} />)}</datalist>
                  </div>
                </div>

                {/* 4. Quantity (KG) */}
                <div>
                  <label className="apb-field-label text-sm font-semibold block mb-1.5">
                    Quantity (KG) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={quantityInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        const parts = val.split('.');
                        if (parts.length > 2) return;
                        setQuantityInput(val);
                      }}
                      placeholder="e.g. 10, 25"
                      className="apb-input w-full px-3 py-3 text-base font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span className="text-amber-700 font-medium">Minimum 10 KG order.</span>
                <span className="font-mono font-bold text-sky-700">{currentQuantityKg > 0 ? `${currentQuantityKg} KG` : ''}</span>
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                <input type="checkbox" checked={thermocolIncluded} onChange={(e) => setThermocolIncluded(e.target.checked)} />
                Thermocol full packing (owner rate)
              </label>

              {/* 5. डिस्पैच का समय (Exact IST Slots) */}
              <div className="pt-0.5">
                <label className="apb-section-label text-sm font-bold block mb-2">
                  डिस्पैच का समय (IST) <span className="text-rose-500">*</span>
                </label>

                <div className="apb-slot-grid apb-slot-compact-grid grid grid-cols-2 gap-2">
                  {dispatchSlots.map((slot) => {
                    const titleText =
                      slot.id === 'today_morning' ? 'आज सुबह' :
                      slot.id === 'today_evening' ? 'आज शाम' :
                      slot.id === 'tomorrow_morning' ? 'कल सुबह' : 'कल शाम';

                    return (
                      <label
                        key={slot.id}
                        aria-disabled={slot.disabled}
                        className={`apb-slot apb-slot-compact flex flex-row items-center gap-2 cursor-pointer transition-all ${
                          slot.disabled ? 'apb-slot-disabled cursor-not-allowed' :
                          dispatchTiming === slot.label ? 'apb-slot-selected' : 'apb-slot-idle'
                        }`}
                      >
                        <input
                          type="radio"
                          name="dispatchTiming"
                          value={slot.label}
                          disabled={slot.disabled}
                          checked={dispatchTiming === slot.label}
                          onChange={() => setDispatchTiming(slot.label)}
                          className="accent-sky-600 w-4 h-4 shrink-0"
                        />
                        <span className="apb-slot-title text-sm font-bold">{titleText}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {!selectedProduct && customerType === 'retail' && promo.enabled && <section className="space-y-2 border border-slate-300 rounded-xl p-3" aria-label="Optional promo code">
                <label htmlFor="ankur-promo-code" className="font-semibold">Promo code (optional)</label>
                <div className="flex gap-2"><input id="ankur-promo-code" className="min-w-0 flex-1 rounded-xl border border-slate-400 p-2" maxLength={64} value={promo.code} disabled={promo.busy || submitting} onChange={e => { promo.setCode(e.target.value); setPromoNotice(''); }} /><button type="button" className="rounded-xl bg-blue-700 px-3 py-2 text-white font-bold" disabled={!promo.code.trim() || promo.busy || submitting} onClick={async () => { try { await promo.apply(); setPromoNotice('Code checked. Review the discount below.'); } catch { setPromoNotice('Code is unavailable, expired or does not match this quantity.'); } }}>Apply code</button></div>
                {promoNotice && <p className="text-sm text-slate-800" role="status">{promoNotice}</p>}
              </section>}
              {/* 6. Price Breakdown (Price Breakup) */}
              <div className="apb-total-card space-y-2">
                <div className="apb-total-heading text-sm font-bold mb-2">
                  Price Breakdown
                </div>

                <div className="apb-total-row flex items-start justify-between gap-3 text-sm">
                  <span>ड्राई आइस ({currentQuantityKg} kg × ₹{rates.dryIceRate}):</span>
                  <span className="font-mono font-semibold text-slate-900">₹{dryIceSubtotal}</span>
                </div>

                <div className="apb-total-row flex items-start justify-between gap-3 text-sm">
                  <span>थर्मोकोल फुल पैकिंग ({currentQuantityKg} kg × ₹{rates.thermocolRate}):</span>
                  <span className="font-mono font-semibold text-slate-900">₹{thermocolSubtotal}</span>
                </div>

                {(rates.transportRate || 0) > 0 && (
                  <div className="apb-total-row flex items-start justify-between gap-3 text-sm">
                    <span>परिवहन ({currentQuantityKg} kg × ₹{rates.transportRate}):</span>
                    <strong className="font-mono">₹{Math.round(currentQuantityKg * (rates.transportRate || 0) * 100) / 100}</strong>
                  </div>
                )}
                {promo.quote && <div className="space-y-1 text-sm text-slate-900" role="status"><div className="flex justify-between"><span>Base amount</span><span>₹{(promo.quote.baseTotalPaise / 100).toFixed(2)}</span></div><div className="flex justify-between"><span>Promo discount</span><span>−₹{(promo.quote.discountPaise / 100).toFixed(2)}</span></div><div className="flex justify-between font-bold"><span>After promo</span><span>₹{(promo.quote.totalPaise / 100).toFixed(2)}</span></div></div>}
                <div className="apb-total-grand flex justify-between items-center gap-3 pt-3 mt-3">
                  <span className="font-bold text-slate-900">Total Amount:</span>
                  <div className="text-right">
                    <label className="apb-amount-editor" aria-label="Requested total amount">
                    <span>₹</span>
                    <input type="number" inputMode="decimal" min={customerType === 'wholesale' ? 1 : totalAmount} max={99000}
                      step="0.01" value={customerType === 'wholesale' ? extraAmountText : String(totalAmount)} placeholder={String(totalAmount)}
                      readOnly={customerType !== 'wholesale'}
                      onChange={(e) => setExtraAmountText(e.target.value)}
                      aria-label={customerType === 'wholesale' ? 'Edit wholesale customer total' : 'Retail total amount'}
                      className="apb-extra-amount-input" />
                  </label>
                    <span className="text-[10px] text-slate-500 block">
                      (₹{currentUnitRate}/kg, सभी लागू शुल्क सहित)
                    </span>
                  </div>
                </div>
              </div>

              {/* 7. Payment Instructions */}
              <div className="apb-special-request">
                  <label htmlFor="apb-extra-reason">Extra Product / Reason for Amount Change</label>
                  <textarea id="apb-extra-reason" rows={2} maxLength={180}
                    placeholder="e.g. Add Pyro, event supplies or other products"
                    value={extraAmountReason}
                    onChange={(e) => setExtraAmountReason(e.target.value)}
                    required={customerType === 'wholesale' && extraAmountText.trim() !== '' && Number(extraAmountText) !== totalAmount}
                    className="apb-extra-reason-input" />
                  <p>Base dry ice price cannot be reduced. Extra amounts need owner confirmation.</p>
                </div>
                <div className="apb-payment-note text-sm">
                <span className="font-bold text-slate-800 block mb-0.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                  पेमेंट निर्देश
                </span>
                <p className="leading-relaxed text-[11px]">
                  पेमेंट: Paytm Business / किसी भी UPI ऐप द्वारा भुगतान करें। ऑर्डर बुक होने के बाद आप पेमेंट का स्क्रीनशॉट WhatsApp पर ओनर को भेज सकते हैं। ओनर द्वारा मैन्युअल सत्यापन के बाद पेमेंट वेरीफाई होगा।
                </p>
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="apb-submit w-full flex items-center justify-center gap-2 text-base font-extrabold disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Snowflake className="w-4 h-4 animate-spin text-white" />
                    <span>ऑर्डर सेव हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <span>ऑर्डर बुक करें (₹{totalAmount})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Contact Strip with Business Contact +91 8896332066 */}
            <div className="apb-contact mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>सहायता के लिए संपर्क करें:</span>
              <div className="flex items-center gap-3">
                <a
                  href={BUSINESS_CALL_HREF}
                  className="text-sky-700 font-bold hover:underline flex items-center gap-1"
                  title={`कॉल करें (${BUSINESS_PHONE_DISPLAY})`}
                >
                  <Phone className="w-3 h-3" />
                  <span>कॉल ({BUSINESS_PHONE_DISPLAY})</span>
                </a>
                <a
                  href={getFormWhatsAppInquiryLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  title={`WhatsApp (${BUSINESS_PHONE_DISPLAY})`}
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>व्हाट्सएप</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const OrderForm: React.FC<OrderFormProps> = props => props.selectedProduct?.unitProduct
  ? <UnitProductForm key={props.selectedProduct.id} product={props.selectedProduct.unitProduct} currentUser={props.currentUser} onOrderSuccess={props.onOrderSuccess} onGoToTrack={props.onGoToTrack} />
  : <LegacyOrderForm {...props} />;
