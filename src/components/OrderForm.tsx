import React, { useState, useEffect, useMemo } from 'react';
import { UnitProductForm } from './UnitProductForm';
import { PaymentOptions } from './PaymentOptions';
import { DeliveryModePicker } from './DeliveryModePicker';
import { subscribeDeliverySettings } from '../services/deliverySettings';
import { DEFAULT_DELIVERY_SETTINGS, resolveDeliveryDefault, validateDeliveryChoice, type DeliveryMode, type DeliverySettings } from '../utils/delivery';
import { PRIMARY_UPI_ID } from '../config/businessConfig';
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
import { savePaymentProof } from '../services/paymentProof';
import { 
  getDispatchSlots, 
  BUSINESS_CALL_DISPLAY,
  BUSINESS_WHATSAPP_DISPLAY,
  BUSINESS_CALL_HREF,
  BUSINESS_WHATSAPP_BASE,
  UP_DISTRICTS
} from '../data/products';
import { addIstDays, formatDispatchDate, istDateKey } from '../utils/dispatchSchedule';
import { averageRateNote, classifyOrderSubmitError, isPermissionDenied, orderSubmitErrorMessage } from '../utils/orderFormCopy';
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
      const profile = snap.data();
      const nextType = profile?.customerType === 'wholesale' ? 'wholesale' : 'retail';
      setCustomerType(nextType);
      setThermocolIncluded(nextType === 'retail');
      const phone = profile?.customerPhone || currentUser.phoneNumber;
      if (phone) void import('../services/customers').then(({ upsertCustomerLogin }) => upsertCustomerLogin(currentUser.uid, profile?.customerName || currentUser.displayName || 'Customer', phone)).catch((error) => console.warn('Customer login record unavailable:', error));
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
  // v1.0.66 delivery mode: customer default -> district mapping -> ask (utils/delivery).
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode | undefined>(undefined);
  const [deliveryStopId, setDeliveryStopId] = useState<string | undefined>(undefined);
  const [deliveryStaleStop, setDeliveryStaleStop] = useState<string | undefined>(undefined);
  const [deliveryTouched, setDeliveryTouched] = useState(false);
  const [customerDeliveryDefaults, setCustomerDeliveryDefaults] = useState<{ defaultDeliveryMode?: string; defaultBusStopId?: string } | null>(null);
  useEffect(() => subscribeDeliverySettings(setDeliverySettings), []);
  const deliveryPhoneDigits = customerPhone.replace(/[^0-9]/g, '').slice(-10);
  useEffect(() => {
    // Customers may read only their own customers/{+91mobile} document (rules).
    if (!currentUser?.uid || !/^[6-9][0-9]{9}$/.test(deliveryPhoneDigits)) { setCustomerDeliveryDefaults(null); return; }
    let live = true;
    void getDoc(doc(db, 'customers', `+91${deliveryPhoneDigits}`)).then((snap) => {
      if (live) setCustomerDeliveryDefaults(snap.exists() ? (snap.data() as any) : null);
    }).catch(() => { if (live) setCustomerDeliveryDefaults(null); });
    return () => { live = false; };
  }, [currentUser?.uid, deliveryPhoneDigits]);
  useEffect(() => {
    if (deliveryTouched) return;
    const resolved = resolveDeliveryDefault(customerDeliveryDefaults, address, deliverySettings);
    setDeliveryMode(resolved?.mode);
    setDeliveryStopId(resolved?.busStopId);
    setDeliveryStaleStop(resolved?.source === 'ask' && resolved.warning ? resolved.staleStopId : undefined);
  }, [customerDeliveryDefaults, address, deliverySettings, deliveryTouched]);
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

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPaymentScreenshot(file);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    const previewUrl = URL.createObjectURL(file);
    setScreenshotPreview(previewUrl);
    setShareFeedback('स्क्रीनशॉट compress और save हो रहा है…');
    if (!successData?.orderId) {
      setShareFeedback('ऑर्डर ID मिलने के बाद ही स्क्रीनशॉट save किया जा सकता है।');
      return;
    }
    try {
      const saved = await savePaymentProof(successData.orderId, file, currentUser?.uid, successData.trackingPin);
      setShareFeedback(`स्क्रीनशॉट सुरक्षित save हुआ (${Math.round(saved.sizeBytes / 1024)} KB)। Payment owner verification तक pending रहेगा।`);
    } catch (error) {
      console.error('Payment proof upload failed:', error);
      setShareFeedback('स्क्रीनशॉट save नहीं हुआ। इसे WhatsApp पर मालिक को भेजें; payment verification pending है।');
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
      `• भुगतान माध्यम: UPI (${PRIMARY_UPI_ID})`,
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
      const fingerprint = JSON.stringify([customerName.trim(), cleanPhone, cleanAddress, parsedQty, dispatchTiming, customerType, thermocolIncluded, extraAmountText.trim(), extraAmountReason.trim(), selectedProduct?.id || 'dry-ice', deliveryMode || '', deliveryStopId || '']);
      let pending: any = null;
      try { pending = JSON.parse(localStorage.getItem(pendingOrderStorageKey) || 'null'); } catch { pending = null; }
      if (!pending || pending.fingerprint !== fingerprint || typeof pending.orderId !== 'string' || typeof pending.trackingPin !== 'string') {
        const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        pending = { state: 'pending', fingerprint, orderId: `ADI-${dateSegment}-${randomSuffix}`, trackingPin: Math.floor(100000 + Math.random() * 900000).toString() };
      }
      pending.state = 'pending';
      pending.form = { customerName, customerPhone, address, quantityInput, dispatchTiming, extraAmountText, extraAmountReason, thermocolIncluded };
      try { localStorage.setItem(pendingOrderStorageKey, JSON.stringify(pending)); } catch { /* In-memory retry remains available. */ }
      const generatedOrderId = pending.orderId;
      const generatedPin = pending.trackingPin;

      // A network drop can hide a successful Firestore acknowledgement. Reconcile
      // the persisted order before attempting another create with the same ID.
      if (currentUser?.uid) {
        // Rules refuse a customer read of an order id that does not exist yet
        // (resource == null), so permission-denied here simply means "not saved".
        let existingOrder: Awaited<ReturnType<typeof getDoc>> | null = null;
        try {
          existingOrder = await getDoc(doc(db, 'orders', generatedOrderId));
        } catch (precheckError) {
          if (!isPermissionDenied(precheckError)) throw precheckError;
        }
        if (existingOrder && existingOrder.exists() && (existingOrder.data() as Order).userId === currentUser.uid) {
          const saved = existingOrder.data() as Order;
          const pin = saved.trackingPin || generatedPin;
          setSuccessData({ orderId: generatedOrderId, trackingPin: pin, customerName: saved.customerName, customerPhone: saved.customerPhone, address: saved.address || saved.city || '', quantityKg: saved.quantityKg, totalAmount: saved.totalAmount, dispatchTiming: saved.dispatchTiming });
          try { localStorage.removeItem(pendingOrderStorageKey); } catch {}
          onOrderSuccess(generatedOrderId, pin);
          onClearReorder?.();
          return;
        }
      }

      // Compound token for zero-trust tracking authorization
      const generatedTrackingToken = `${generatedOrderId}_${generatedPin}`;

      const finalQuantityKg = parsedQty;
      const unitRate = currentUnitRate;
      const finalDryIceSubtotal = Math.round(finalQuantityKg * (activeDryIceRate || 0) * 100) / 100;
      const finalThermocolSubtotal = thermocolIncluded ? Math.round(finalQuantityKg * rates.thermocolRate * 100) / 100 : 0;
      const finalTotalAmount = Math.round(finalQuantityKg * unitRate * 100) / 100;
      const customerTotal = approvedAmount(finalTotalAmount);
      const slotId = dispatchSlots.find((item) => item.label === dispatchTiming)?.id || 'tomorrow_morning';
      const slot = slotId.endsWith('morning') ? 'morning' as const : 'evening' as const;
      const dispatchDate = slotId.startsWith('tomorrow') ? addIstDays(istDateKey(), 1) : istDateKey();
      const dispatchDisplay = formatDispatchDate(dispatchDate, slot, document.documentElement.dataset.appLanguage === 'en' ? 'en' : 'hi');

      const batch = writeBatch(db);

      // 1. Private Order Document (/orders/{orderId})
      const privateOrderRef = doc(db, 'orders', generatedOrderId);
      const privateOrderPayload: Order = {
        orderId: generatedOrderId,
        trackingToken: generatedTrackingToken,
        trackingPin: generatedPin,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        district: cleanAddress.slice(0, 100),
        address: cleanAddress,
        city: cleanAddress.slice(0, 100),
        quantityKg: finalQuantityKg,
        dispatchTiming: dispatchDisplay,
        dispatchDate,
        slot,
        dispatchSlot: slot,
        customerType,
        calculatedTotal: finalTotalAmount,
        customerTotal,
        amountChanged: customerTotal !== finalTotalAmount,
        amountChangeReason: customerTotal !== finalTotalAmount ? extraAmountReason.trim().slice(0, 180) : '',
        thermocolIncluded,
        testOrder: false,
        productName: bookedProductName,
        
        // Exact stored booked rates and totals
        dryIcePricePerKg: activeDryIceRate || 0,
        dryIceSubtotal: finalDryIceSubtotal,
        thermocolPricePerKg: thermocolIncluded ? rates.thermocolRate : 0,
        thermocolSubtotal: finalThermocolSubtotal,
        transportPrice: rates.transportRate || 0,
        totalAmount: customerTotal,

        ...(deliveryMode ? { deliveryMode, ...(deliveryMode === 'BUS' && deliveryStopId ? { busStopId: deliveryStopId } : {}) } : {}),
        status: 'pending',
        paymentStatus: 'pending_verification',
        paymentMethod: 'paytm_business_upi',
        paymentNotes: extraPriceNote(document.documentElement.dataset.appLanguage === 'en' ? "Paytm Business / UPI - owner verification pending" : "Paytm Business / UPI - मालिक के सत्यापन की प्रतीक्षा"),
        userId: currentUser?.uid || 'guest',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 2. Protected Tracking Document (/order_tracking/{trackingToken}) - ZERO PII
      const publicTrackingRef = doc(db, 'order_tracking', generatedTrackingToken);
      const publicTrackingPayload: OrderTracking = {
        orderId: generatedOrderId,
        trackingToken: generatedTrackingToken,
        status: 'pending',
        productName: bookedProductName,
        quantityKg: finalQuantityKg,
        totalAmount: customerTotal,
        district: cleanAddress.slice(0, 100),
        dispatchTiming: dispatchDisplay,
        dispatchDate,
        slot,
        dispatchSlot: slot,
        paymentStatus: 'pending_verification',
        lastStatusUpdate: 'ऑर्डर प्राप्त हुआ। पैकिंग शेड्यूल्ड।',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      batch.set(privateOrderRef, privateOrderPayload);
      batch.set(publicTrackingRef, publicTrackingPayload);
      batch.set(doc(db, 'staffOrderViews', generatedOrderId), {
        orderId: generatedOrderId, sourceCollection: 'orders',
        customerName: privateOrderPayload.customerName, city: privateOrderPayload.city,
        district: privateOrderPayload.district, productName: privateOrderPayload.productName,
        dispatchTiming: privateOrderPayload.dispatchTiming, dispatchDate, slot,
        status: 'pending', quantityKg: finalQuantityKg, isTrash: false,
        ...(privateOrderPayload.deliveryMode ? { deliveryMode: privateOrderPayload.deliveryMode } : {}),
        ...(privateOrderPayload.busStopId ? { busStopId: privateOrderPayload.busStopId } : {}),
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });

      // Commit atomically
      await batch.commit();
      if (currentUser?.uid) {
        try {
          const { upsertCustomerForOrder } = await import('../services/customers');
          await upsertCustomerForOrder(currentUser.uid, customerName, cleanPhone);
        } catch (customerError) { console.warn('Customer directory update did not complete:', customerError); }
      }

      // Save customer profile securely
      if (currentUser && currentUser.uid) {
        // The order is already committed; a profile-save failure must not show
        // an order error (the customer would retry an order that exists).
        try {
          const userProfileRef = doc(db, 'users', currentUser.uid);
          const existingProfile = await getDoc(userProfileRef);
          await setDoc(userProfileRef, {
            customerName: customerName.trim(),
            customerPhone: cleanPhone,
            city: cleanAddress.slice(0, 100),
            ...(!existingProfile.exists() ? { customerType: 'retail' } : {}),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (profileError) { console.warn('Customer profile save did not complete:', profileError); }
      }

      // Save to localStorage for offline resilience & duplicate protection
      try {
        const existingStored = localStorage.getItem('ankur_dryice_placed_orders_v1');
        const list: any[] = existingStored ? JSON.parse(existingStored) : [];
        const recordToStore = {
          ...privateOrderPayload,
          createdAtMs: Date.now(),
        };
        const updatedList = [recordToStore, ...list.filter((o: any) => o.orderId !== generatedOrderId)].slice(0, 20);
        localStorage.setItem('ankur_dryice_placed_orders_v1', JSON.stringify(updatedList));
      } catch (e) {
        console.warn('Could not save order locally:', e);
      }

      setSuccessData({
        orderId: generatedOrderId,
        trackingPin: generatedPin,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        address: cleanAddress,
        quantityKg: finalQuantityKg,
        totalAmount: approvedAmount(finalTotalAmount),
        dispatchTiming: dispatchTiming,
      });

      try { localStorage.removeItem(pendingOrderStorageKey); } catch {}
      onOrderSuccess(generatedOrderId, generatedPin);
      if (onClearReorder) onClearReorder();
    } catch (err: unknown) {
      console.error('Failed to submit order:', err);
      // permission-denied = published Firestore rules refused the batch; it is
      // not a network problem, so do not tell the customer to check internet.
      const submitErrorKind = classifyOrderSubmitError(err);
      const submitLanguage = typeof document !== 'undefined' && document.documentElement?.dataset?.appLanguage === 'en' ? 'en' : 'hi';
      try {
        handleFirestoreError(err, OperationType.WRITE, 'orders');
      } catch {
        setErrorMsg(orderSubmitErrorMessage(submitErrorKind, submitLanguage));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitBooking = async () => {
    if (!promo.code.trim()) { await executeOrderSubmission(); return; }
    if (!promo.enabled) { setErrorMsg('Promotions are currently disabled.'); return; }
    if (!promo.quote) { setErrorMsg('Apply the promo code and review the updated amount first.'); return; }
    if (customerType !== 'retail' || selectedProduct || extraAmountText.trim() || extraAmountReason.trim()) {
      setErrorMsg('Promo codes apply to standard retail Dry Ice orders only.'); return;
    }
    try {
      setSubmitting(true); setErrorMsg(null);
      const result = await promo.book();
      const details = { orderId: result.orderId, trackingPin: result.trackingPin, customerName: customerName.trim(), customerPhone: getClean10DigitPhone(customerPhone), address: address.trim(), quantityKg: currentQuantityKg, totalAmount: result.totalAmount, dispatchTiming };
      try {
        const key = 'ankur_dryice_placed_orders_v1';
        const previous = JSON.parse(localStorage.getItem(key) || '[]');
        const rows = Array.isArray(previous) ? previous : [];
        localStorage.setItem(key, JSON.stringify([{ ...details, trackingToken: `${result.orderId}_${result.trackingPin}`, userId: currentUser?.uid || 'guest', productName: bookedProductName, status: 'pending', paymentStatus: 'pending_verification', createdAtMs: Date.now() }, ...rows.filter((row: any) => row.orderId !== result.orderId)].slice(0, 20)));
      } catch { /* The server order is committed; the cache is only a convenience. */ }
      setSuccessData(details); onOrderSuccess(result.orderId, result.trackingPin); onClearReorder?.();
    } catch {
      setErrorMsg('Promo booking could not complete. Check your connection and the active code, then retry.');
    } finally { setSubmitting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    // Validate Name
    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMsg('कृपया अपना सही नाम दर्ज करें (कम से कम 2 अक्षर)।');
      return;
    }

    // Validate Indian Mobile Number
    if (!validatePhone(customerPhone)) {
      setErrorMsg('कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें (शुरुआत 6, 7, 8 या 9 से)।');
      return;
    }

    // Validate City: शहर
    if (!address.trim() || !/[\p{L}].*[\p{L}].*[\p{L}]/u.test(address.trim())) {
      setErrorMsg('कृपया शहर के कम से कम 3 अक्षर दर्ज करें।');
      return;
    }

    if (customerType === 'wholesale' && !(typeof rates.wholesaleRate === 'number' && rates.wholesaleRate > 0)) {
      setErrorMsg('Wholesale rate is not set yet. Please contact the owner.'); return;
    }
    const priceChanged = customerType === 'wholesale' && extraAmountText.trim() !== '' && Number(extraAmountText) !== totalAmount;
    if (priceChanged && !extraAmountReason.trim()) { setErrorMsg('Reason for Amount Change is required.'); return; }

    // Validate Quantity: minimum 10 KG
    const parsedQty = parseFloat(quantityInput);
    if (!quantityInput.trim() || isNaN(parsedQty) || parsedQty < 10) {
      setErrorMsg('Minimum 10 KG order. कृपया कम से कम 10 KG मात्रा दर्ज करें।');
      return;
    }
    if (parsedQty > 5000) {
      setErrorMsg('अधिकतम ऑर्डर मात्रा 5,000 kg तक है। बड़ी मात्रा के लिए कृपया सीधे कॉल करें।');
      return;
    }

    // Delivery mode: BUS needs an ACTIVE stop; an inactive saved stop is never auto-replaced.
    const deliveryError = validateDeliveryChoice(deliveryMode, deliveryStopId, deliverySettings);
    if (deliveryError) { setErrorMsg(deliveryError); return; }

    // Validate selected dispatch timing slot
    const selectedSlotObj = dispatchSlots.find(s => s.label === dispatchTiming);
    if (selectedSlotObj && selectedSlotObj.disabled) {
      setErrorMsg('यह Dispatch Time अब समाप्त हो चुका है। कृपया दूसरा उपलब्ध समय चुनें।');
      return;
    }

    // Duplicate Order Protection: Check for existing matching order within 24 hours
    try {
      const existingMatch = await findRecentMatchingOrder(customerPhone);
      if (existingMatch) {
        setDuplicatePreviousOrder(existingMatch);
        setShowDuplicateModal(true);
        return;
      }
    } catch (e) {
      console.warn('Error during duplicate check:', e);
    }

    // If no duplicate found, proceed to place order
    await submitBooking();
  };

  const copyText = (text: string, type: 'id' | 'pin') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  return (
    <div className="ankur-premium-booking max-w-xl mx-auto py-4 px-3 sm:px-5">
      {/* Duplicate Order Warning Popup Modal */}
      {showDuplicateModal && duplicatePreviousOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 max-w-md w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3.5 sm:p-4 text-white flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm sm:text-base leading-tight">डुप्लीकेट ऑर्डर चेतावनी (Duplicate Order Warning)</h3>
                <p className="text-amber-100 text-xs mt-0.5">
                  पिछले 3 घंटों में आपका एक मिलता-जुलता ऑर्डर पहले से दर्ज है
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="बंद करें"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 space-y-3.5 text-slate-800">
              <p className="text-xs text-slate-600 leading-relaxed">
                गलती से डबल बुकिंग होने से बचाने के लिए यह जांच की गई है। आपके मोबाइल नंबर (<strong className="text-slate-900 font-mono">{duplicatePreviousOrder.customerPhone}</strong>) पर दर्ज पिछले ऑर्डर का विवरण:
              </p>

              {/* Actual Previous Order Details Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Previous Order ID:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    #{duplicatePreviousOrder.orderId}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Customer Name (ग्राहक का नाम):</span>
                  <span className="font-semibold text-slate-900">{duplicatePreviousOrder.customerName}</span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 font-medium shrink-0">Customer Place/City/Address (जगह):</span>
                  <span className="font-semibold text-slate-900 text-right">{duplicatePreviousOrder.address || duplicatePreviousOrder.city || duplicatePreviousOrder.district || 'उत्तर प्रदेश'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Product & Quantity:</span>
                  <span className="font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {duplicatePreviousOrder.productName || 'ड्राई आइस (Dry Ice)'} • {duplicatePreviousOrder.quantityKg} KG
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Total Amount:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    ₹{duplicatePreviousOrder.totalAmount}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-medium">Order Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    duplicatePreviousOrder.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                    duplicatePreviousOrder.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                    duplicatePreviousOrder.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {getStatusLabel(duplicatePreviousOrder.status)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* 1. Continue previous order */}
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateModal(false);
                    if (onGoToTrack) {
                      onGoToTrack(duplicatePreviousOrder.orderId, duplicatePreviousOrder.trackingPin || '');
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>पिछला ऑर्डर जारी रखें / ट्रैक करें (Continue Previous Order)</span>
                </button>

                {/* 2. Explicitly confirm genuine second order */}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    setShowDuplicateModal(false);
                    await submitBooking();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                      <span>ऑर्डर बुक हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>हाँ, नया (दूसरा) ऑर्डर बुक करें (Confirm Genuine Second Order)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Ice Blue premium price hero; all prices remain owner-controlled. */}
      <section className="apb-rate-hero" aria-label="आज की ड्राई आइस कीमत">
        <div className="apb-rate-head">
          <div className="apb-kicker"><Snowflake className="w-4 h-4" /> ANKUR DRYICE</div>
          <span className="apb-live-chip"><span className="apb-live-dot" /> आज का रेट</span>
        </div>
        <div className="apb-price-topline">ड्राई आइस व सुरक्षित पैकिंग</div>
        <div className="apb-hero-total">₹{currentUnitRate}<small>/kg</small></div>
        <div className="apb-rate-breakdown">
          <span>ड्राई आइस <strong>₹{rates.dryIceRate}/kg</strong></span>
          <span>थर्मोकोल पैकिंग <strong>₹{rates.thermocolRate}/kg</strong></span>
          {(rates.transportRate || 0) > 0 && <span>अतिरिक्त परिवहन <strong>₹{rates.transportRate}/kg</strong></span>}
        </div>
        <p className="apb-rate-footnote">ऊपर दिखाए गए सभी शुल्क कुल रेट में शामिल हैं।</p>
      </section>

      {/* Customer Google Login Gate / Authenticated Booking Flow */}
      {!currentUser ? (
        <div className="apb-login-gate text-center space-y-4 my-6">
          <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <User className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-950">
            ड्राई आइस बुकिंग के लिए लॉगिन करें
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
            ऑर्डर बुक करने और ट्रैकिंग देखने के लिए कृपया अपने Google (Gmail) अकाउंट से सुरक्षित रूप से लॉगिन करें।
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleCustomerGoogleSignIn}
              disabled={customerLoggingIn}
              className="w-full max-w-xs mx-auto py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {customerLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>लॉगिन हो रहा है...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 bg-white rounded-full p-0.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#4FB3F8" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#FBBC05" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google से लॉगिन करें</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Authenticated Customer Profile Greeting & Logout */}
          <div className="apb-account-card flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-sky-300">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || 'Profile'} className="w-full h-full object-cover" />
                ) : (
                  (currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="apb-account-name text-sm font-bold min-w-0 flex flex-wrap items-center gap-1.5">
                  <span>नमस्ते, {currentUser.displayName || 'ग्राहक'}</span>
                  <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    लॉगिन
                  </span>
                </div>
                <p className="apb-account-email text-xs break-all">
                  {currentUser.email} &bull; आपका खाता सुरक्षित है
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => signOutUser()}
              className="apb-logout shrink-0 cursor-pointer"
              title="लॉगआउट करें"
            >
              लॉगआउट
            </button>
          </div>

          {/* Product picked on the storefront */}
          {selectedProduct && (
            <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-extrabold truncate">चुना गया प्रोडक्ट: {selectedProduct.hindiName}</div>
                <div className="text-[11px] text-sky-700">₹{rates.dryIceRate + rates.thermocolRate}/kg (थर्मोकोल पैकिंग सहित)</div>
              </div>
              {onClearProduct && (
                <button type="button" onClick={onClearProduct} className="text-sky-600 hover:text-sky-800 text-[11px] font-bold shrink-0 underline">
                  बदलें
                </button>
              )}
            </div>
          )}

          {/* Reorder notification banner if active */}
          {reorderNotice && (
            <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <RotateCcw className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="truncate">{reorderNotice}</span>
              </div>
              <button
                onClick={() => {
                  setReorderNotice(null);
                  if (onClearReorder) onClearReorder();
                }}
                className="text-sky-500 hover:text-sky-700 p-0.5 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Success Modal / Screen with Optional Payment Screenshot */}
          {successData && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="text-center mb-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    ऑर्डर सफलतापूर्वक बुक हुआ!
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    आपका ड्राई आइस ऑर्डर सुरक्षित रूप से दर्ज कर लिया गया है।
                  </p>
                </div>

                {/* Secret Credentials Card */}
                <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3 mb-3 space-y-2">
                  <div>
                    <div className="text-[10px] font-semibold text-sky-800 uppercase tracking-wider mb-0.5">
                      ऑर्डर नंबर (Order ID)
                    </div>
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-sky-200 font-mono font-bold text-xs text-slate-900">
                      <span>{successData.orderId}</span>
                      <button
                        onClick={() => copyText(successData.orderId, 'id')}
                        className="text-sky-600 hover:text-sky-800 p-1"
                        title="कॉपी करें"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-sky-800 uppercase tracking-wider mb-0.5 flex items-center justify-between">
                      <span>गोपनीय ट्रैकिंग पिन (Tracking PIN)</span>
                      <span className="text-[10px] font-normal text-rose-600">सुरक्षित रखें</span>
                    </div>
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-sky-200 font-mono font-bold text-xs text-slate-900">
                      <span className="tracking-widest text-emerald-700">{successData.trackingPin}</span>
                      <button
                        onClick={() => copyText(successData.trackingPin, 'pin')}
                        className="text-sky-600 hover:text-sky-800 p-1"
                        title="कॉपी करें"
                      >
                        {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-sky-200 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>मात्रा:</span>
                      <span className="font-semibold text-slate-900">{successData.quantityKg} KG</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>कुल राशि:</span>
                      <span className="font-bold text-emerald-700 font-mono">₹{successData.totalAmount}</span>
                    </div>
                    <div className="text-[11px] text-amber-700 pt-1 font-semibold flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>पेमेंट स्थिति: वेरिफिकेशन प्रतीक्षित (ओनर द्वारा बैंक/UPI वेरीफाई होने पर अपडेट होगा)</span>
                    </div>
                  </div>
                </div>

                {/* UPI configuration is shared with tracking. Verification is owner-only. */}
                <div className="mb-0 text-xs space-y-2.5">
                  <PaymentOptions amount={successData.totalAmount} orderId={successData.orderId} isHindi={document.documentElement.dataset.appLanguage !== 'en'} />
                  <p className="text-[11px] leading-relaxed">
                    UPI से ₹{successData.totalAmount} भेजें। भुगतान अपने ऐप में verify करें; ऐप में स्थिति मालिक द्वारा पुष्टि तक pending रहेगी।
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
                          💡 स्क्रीनशॉट 150 KB के करीब compress होकर इस order के सुरक्षित payment proof में save होगा। केवल मालिक इसे देख सकता है; भुगतान सत्यापन तक pending रहेगा।
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
                {typeof document !== 'undefined' && document.documentElement?.dataset?.appLanguage === 'en' ? `Thermocol full packing (+₹${rates.thermocolRate}/kg)` : `थर्माकोल पूरी पैकिंग (+₹${rates.thermocolRate}/kg)`}
              </label>

              {/* 4b. Delivery mode (Bus stop / Dukan pickup / Porter / Local) */}
              <div className="apb-delivery-mode">
                <DeliveryModePicker mode={deliveryMode} busStopId={deliveryStopId} settings={deliverySettings} staleStopId={deliveryStaleStop}
                  language={typeof document !== 'undefined' && document.documentElement?.dataset?.appLanguage === 'en' ? 'en' : 'hi'}
                  onChange={(next) => { setDeliveryTouched(true); setDeliveryStaleStop(undefined); setDeliveryMode(next.mode); setDeliveryStopId(next.busStopId); }} />
              </div>

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
                    {!(customerType === 'wholesale' && extraAmountText.trim()) && <span className="text-[10px] text-slate-500 block">
                      {averageRateNote(currentUnitRate, { thermocolIncluded, transportRate: rates.transportRate || 0 }, typeof document !== 'undefined' && document.documentElement?.dataset?.appLanguage === 'en' ? 'en' : 'hi')}
                    </span>}
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

            {/* Contact strip: Call +91 95808 82066, WhatsApp +91 88963 32066 */}
            <div className="apb-contact mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>सहायता के लिए संपर्क करें:</span>
              <div className="flex items-center gap-3">
                <a
                  href={BUSINESS_CALL_HREF}
                  className="text-sky-700 font-bold hover:underline flex items-center gap-1"
                  title={`कॉल करें (${BUSINESS_CALL_DISPLAY})`}
                >
                  <Phone className="w-3 h-3" />
                  <span>कॉल ({BUSINESS_CALL_DISPLAY})</span>
                </a>
                <a
                  href={getFormWhatsAppInquiryLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  title={`WhatsApp (${BUSINESS_WHATSAPP_DISPLAY})`}
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
