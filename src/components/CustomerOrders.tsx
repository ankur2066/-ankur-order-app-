import React, { useState, useEffect } from 'react';
import { ownOrderDocuments } from '../services/productOrders';
import { quantityText } from '../billing/unitBilling';
import { UnitOrderBreakdown } from './UnitProductForm';
import { 
  ShoppingBag, 
  Clock, 
  MapPin, 
  ArrowRight, 
  RefreshCw, 
  PackageCheck, 
  CreditCard,
  Copy,
  Check,
  RotateCcw,
  Snowflake,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Lock,
  FileDown
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db, signInWithGoogle } from '../firebase';
import type { Order, OrderStatus } from '../types';
import type { User } from 'firebase/auth';
import { canViewPickupReceipt } from '../utils/selfPickupAccess';
import { downloadSelfPickupReceipt } from '../utils/selfPickupReceipt';
import { getLocalRates } from '../data/rates';

interface CustomerOrdersProps {
  currentUser: User | null;
  onGoToTrack: (orderId: string, pin: string) => void;
  onGoToOrder: () => void;
  onReorder: (pastOrder: Order) => void;
}

export const CustomerOrders: React.FC<CustomerOrdersProps> = ({
  currentUser,
  onGoToTrack,
  onGoToOrder,
  onReorder
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const handlePickupReceipt = (order: Order) => {
    if (!currentUser || !order.selfPickup ||
        !canViewPickupReceipt(order, order.selfPickup, { uid: currentUser.uid, isOwner: false })) {
      setReceiptError('Pickup receipt is not available for this order.');
      return;
    }
    try {
      downloadSelfPickupReceipt({
        order, pickup: order.selfPickup,
        boxes: order.pickupBoxes, receivedAmount: order.verifiedReceivedAmount,
      });
      setReceiptError(null);
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : 'Receipt could not be generated.');
    }
  };

  const fetchOrders = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      // Customer orders list query enforced by rules: resource.data.userId == request.auth.uid
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('userId', '==', currentUser.uid));
      const querySnap = await ownOrderDocuments(currentUser.uid);

      const items: Order[] = [];
      querySnap.forEach((docSnap) => {
        const item = docSnap.data() as Order;
        if (!item.isTrash) {
          items.push(item);
        }
      });

      // Sort by orderId descending
      items.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0) || b.orderId.localeCompare(a.orderId));
      setOrders(items);
    } catch (err: unknown) {
      console.error('Failed to fetch customer orders:', err);
      setErrorMsg('ऑर्डर लोड करने में त्रुटि आई। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentUser]);

  const handleGoogleSignIn = async () => {
    try {
      setLoggingIn(true);
      setErrorMsg(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Customer login error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('लॉगिन करने में त्रुटि आई। कृपया पुनः प्रयास करें।');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending (प्रतीक्षित)', className: 'bg-amber-50 text-amber-800 border-amber-300', icon: Clock };
      case 'confirmed':
        return { label: 'Confirmed (पुष्ट)', className: 'bg-green-50 text-green-800 border-green-300', icon: CheckCircle2 };
      case 'in_packing':
        return { label: 'In Packing (पैकिंग में)', className: 'bg-blue-50 text-blue-800 border-blue-300', icon: Snowflake };
      case 'dispatched':
        return { label: 'Dispatched (रवाना)', className: 'bg-indigo-50 text-indigo-800 border-indigo-300', icon: Truck };
      case 'delivered':
        return { label: 'Delivered (डिलीवर)', className: 'bg-blue-50 text-blue-800 border-blue-300', icon: PackageCheck };
      case 'cancelled':
        return { label: 'Cancelled (रद्द)', className: 'bg-rose-50 text-rose-800 border-rose-300', icon: AlertCircle };
      default:
        return { label: status, className: 'bg-slate-100 text-slate-700 border-slate-300', icon: Clock };
    }
  };

  // If customer is NOT signed in: Display login prompt + guest tracking lookup
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-8 px-4 text-center">
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-lg shadow-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 mx-auto flex items-center justify-center mb-3">
            <ShoppingBag className="w-6 h-6" />
          </div>

          <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-1">
            मेरे ऑर्डर (My Orders)
          </h2>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            अपने पिछले सभी ड्राई आइस ऑर्डर देखने और 1-क्लिक में लाइव स्थिति ट्रैक करने के लिए Google से लॉगिन करें।
          </p>

          {errorMsg && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-left">
              {errorMsg}
            </div>
          )}

          {/* Prominent Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loggingIn}
            className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-150 cursor-pointer mb-5"
          >
            {loggingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>लॉगिन हो रहा है...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google से लॉगिन करें</span>
              </>
            )}
          </button>

          {/* Distinct Guest Orders Tracking Section */}
          <div className="pt-4 border-t border-slate-100 text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
              <Search className="w-3.5 h-3.5 text-sky-600" />
              <span>पुराना गेस्ट ऑर्डर ट्रैक करना है?</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
              यदि आपने बिना लॉगिन किए (गेस्ट) ऑर्डर दिया था, तो आप ऑर्डर ID और गोपनीय पिन डालकर कभी भी स्थिति देख सकते हैं।
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => onGoToTrack('', '')}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Order ID + पिन से ट्रैक करें</span>
              </button>

              <button
                onClick={onGoToOrder}
                className="py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-sky-700 border border-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                नया ऑर्डर बुक करें
              </button>
            </div>

            <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
              <span>गोपनीयता सुरक्षा: केवल फ़ोन नंबर के आधार पर किसी भी ग्राहक का निजी डेटा प्रदर्शित नहीं किया जाता।</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4 px-3 sm:px-4">
      <header className="flex items-center justify-between gap-3 mb-3 c-card border b-line p-3 rounded-2xl">
        <h1 className="text-lg font-black t-main">मेरे ऑर्डर</h1>
        <button type="button" onClick={fetchOrders} disabled={loading}
          aria-label="ऑर्डर रीफ्रेश करें" title="रीफ्रेश"
          className="focus-ring p-2 rounded-xl border b-line t-sub cursor-pointer disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {errorMsg && (
        <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">आपके ऑर्डर लोड हो रहे हैं...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-10 px-4 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-slate-100">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            अभी तक कोई ऑर्डर नहीं मिला
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            आपने इस Google खाते से अभी तक कोई ड्राई आइस ऑर्डर बुक नहीं किया है।
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={onGoToOrder}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-2xs cursor-pointer"
            >
              नया ड्राई आइस ऑर्डर बुक करें (₹{getLocalRates().dryIceRate + getLocalRates().thermocolRate}/kg)
            </button>
            <button
              onClick={() => onGoToTrack('', '')}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
            >
              गेस्ट ऑर्डर ट्रैक करें (ID + पिन)
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {receiptError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{receiptError}</p>}
          {orders.map((ord) => {
            const badge = getStatusBadge(ord.status);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={ord.orderId}
                className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:border-sky-300 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      #{ord.orderId.split('-').pop() || ord.orderId}
                    </span>
                    <button
                      onClick={() => copyId(ord.orderId)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title={`पूरा ऑर्डर नंबर कॉपी करें: ${ord.orderId}`}
                      aria-label="पूरा ऑर्डर नंबर कॉपी करें"
                    >
                      {copiedId === ord.orderId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${badge.className}`}>
                      <BadgeIcon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                      पिन: {ord.trackingPin}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">मात्रा</span>
                    <span className="font-mono font-bold text-sky-700 text-sm">{quantityText(ord)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">कुल राशि</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">₹{ord.totalAmount}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">पेमेंट स्थिति</span>
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      ord.paymentStatus === 'payment_verified'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {ord.paymentStatus === 'payment_verified' ? 'वेरीफाइड' : 'वेरिफिकेशन प्रतीक्षित'}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-3 bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="truncate">{ord.address || ord.district}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 shrink-0">
                      <Clock className="w-3 h-3 text-sky-600 shrink-0" />
                      <span>{ord.dispatchTiming}</span>
                    </div>
                  </div>
                </div>

                {currentUser && ord.selfPickup &&
                  canViewPickupReceipt(ord, ord.selfPickup, { uid: currentUser.uid, isOwner: false }) && (
                    <div className="pb-2">
                      <button type="button" onClick={() => handlePickupReceipt(ord)}
                        className="inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-900">
                        <FileDown className="h-4 w-4" /> Download Self Pickup Receipt (PDF)
                      </button>
                    </div>
                  )}
                {/* Actions: Track Live and Re-order */}
                {ord.billingVersion===2 && <UnitOrderBreakdown order={ord}/>}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                  <span className="text-[10px] text-slate-400">
                    {ord.billingVersion===2 ? 'Product-wise bill' : '₹'+ord.dryIcePricePerKg+'×'+ord.quantityKg+' + ₹'+ord.thermocolPricePerKg+'×'+ord.quantityKg+' (packing)'}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* 1-click Re-order */}
                    <button
                      onClick={() => onReorder(ord)}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs flex items-center gap-1 border border-sky-200 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-sky-600" />
                      <span>दोबारा ऑर्डर</span>
                    </button>

                    {/* Track live */}
                    <button
                      onClick={() => onGoToTrack(ord.orderId, ord.trackingPin)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>लाइव ट्रैक</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
