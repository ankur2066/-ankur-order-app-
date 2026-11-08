import React, { useState, useEffect } from 'react';
import { trackingRef as resolvedTrackingRef } from '../services/productOrders';
import { quantityText } from '../billing/unitBilling';
import { 
  Search, 
  Truck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  RefreshCw, 
  Phone,
  MessageCircle,
  CreditCard,
  PackageCheck,
  Snowflake,
  RotateCcw
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { OrderTracking, OrderStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { dispatchParts, formatDispatchDate } from '../utils/dispatchSchedule';

interface OrderTrackingViewProps {
  initialOrderId?: string;
  initialPin?: string;
  onQuickReorder?: (tracking: OrderTracking) => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({ 
  initialOrderId,
  initialPin,
  onQuickReorder 
}) => {
  const { language } = useLanguage();
  const isHindi = language === 'hi';
  const t = (hi: string, en: string) => isHindi ? hi : en;
  const [searchId, setSearchId] = useState(initialOrderId || '');
  const [searchPin, setSearchPin] = useState(initialPin || '');
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<OrderTracking | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const errorMsg = errorKey ? ({
    missingId: t('कृपया अपना ऑर्डर नंबर दर्ज करें (उदा. ADI-20261017-XXXX)।','Enter your order ID (for example, ADI-20261017-XXXX).'),
    missingPin: t('कृपया अपना 6 अंकों का सीक्रेट ट्रैकिंग पिन दर्ज करें।','Enter your 6-digit secret PIN.'),
    notFound: t('ऑर्डर नहीं मिला: कृपया अपना ऑर्डर नंबर और सीक्रेट पिन जांचें।','Order not found. Check your order ID and secret PIN.'),
    failed: t('ट्रैकिंग जानकारी प्राप्त करने में त्रुटि आई। कृपया दोबारा प्रयास करें।','Tracking could not be loaded. Please try again.'),
  } as Record<string,string>)[errorKey] : null;

  const fetchTracking = async (orderIdToSearch: string, pinToSearch: string) => {
    const cleanId = orderIdToSearch.trim().toUpperCase();
    const cleanPin = pinToSearch.trim();

    if (!cleanId) {
      setErrorMsg(t('कृपया अपना ऑर्डर नंबर दर्ज करें (उदा. ADI-20261017-XXXX)।','Enter your order ID (for example, ADI-20261017-XXXX).'));
      return;
    }

    if (!cleanPin || cleanPin.length < 4) {
      setErrorMsg(t('कृपया अपना 6 अंकों का सीक्रेट ट्रैकिंग पिन दर्ज करें।','Enter your 6-digit secret PIN.'));
      return;
    }

    try {
      setLoading(true);
      setErrorKey(null);
      setTrackingData(null);

      // Server-side compound token authorization
      const compoundToken = `${cleanId}_${cleanPin}`;
      const trackingDocRef = resolvedTrackingRef(compoundToken);
      const trackingDocSnap = await getDoc(trackingDocRef);

      if (!trackingDocSnap.exists()) {
        setErrorMsg(t('ऑर्डर नहीं मिला: कृपया अपना ऑर्डर नंबर और सीक्रेट पिन जांचें।','Order not found. Check your order ID and secret PIN.'));
        return;
      }

      const data = trackingDocSnap.data() as OrderTracking;
      setTrackingData(data);
    } catch (err: unknown) {
      console.error('Error fetching order tracking:', err);
      setErrorMsg(t('ट्रैकिंग जानकारी प्राप्त करने में त्रुटि आई। कृपया दोबारा प्रयास करें।','Tracking could not be loaded. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId && initialPin) {
      setSearchId(initialOrderId);
      setSearchPin(initialPin);
      fetchTracking(initialOrderId, initialPin);
    }
  }, [initialOrderId, initialPin]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(searchId, searchPin);
  };

  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { label: isHindi ? 'Order received' : 'Order received', color: 'bg-amber-50 text-amber-800 border-amber-300', icon: Clock };
      case 'confirmed':
        return { label: isHindi ? 'ऑर्डर कन्फर्म हुआ' : 'Order confirmed', color: 'bg-sky-50 text-sky-800 border-sky-300', icon: CheckCircle2 };
      case 'in_packing':
        return { label: isHindi ? 'थर्मोकोल पैकिंग में' : 'Packing', color: 'bg-blue-50 text-blue-800 border-blue-300', icon: Snowflake };
      case 'dispatched':
        return { label: isHindi ? 'डिस्पैच / रास्ते में' : 'Dispatched', color: 'bg-indigo-50 text-indigo-800 border-indigo-300', icon: Truck };
      case 'delivered':
        return { label: isHindi ? 'डिलीवर हो गया' : 'Delivered', color: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: PackageCheck };
      case 'cancelled':
        return { label: isHindi ? 'ऑर्डर रद्द' : 'Cancelled', color: 'bg-rose-50 text-rose-800 border-rose-300', icon: AlertCircle };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-300', icon: Clock };
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4 px-3 sm:px-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">
          {t('ऑर्डर ट्रैक करें','Track Order')}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {t('ऑर्डर नंबर और सीक्रेट पिन दर्ज करके अपनी ड्राई आइस की स्थिति देखें।','Enter your order ID and secret PIN to check your order status.')}
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-4">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {t('ऑर्डर नंबर','Order ID')}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder={t('उदा. ADI-20261017-W82K','e.g. ADI-20261017-W82K')}
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {t('6-अंकों का सीक्रेट पिन','6-digit Secret PIN')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                maxLength={8}
                placeholder="{t('उदा. 482910','e.g. 482910')}"
                value={searchPin}
                onChange={(e) => setSearchPin(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>{t('ट्रैक करें','Track')}</span>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>

      {/* Result Card */}
      {trackingData && (trackingData as any).etaMs && <p role="status" className="p-3">Estimated arrival: {new Date((trackingData as any).etaMs).toLocaleString()} · Manual estimate; last updated {String((trackingData as any).etaUpdatedAt?.toDate?.().toLocaleString()||'recently')}</p>}
      {trackingData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('ऑर्डर नंबर','Order ID')}</span>
              <span className="font-mono font-bold text-base text-slate-900">{trackingData.orderId}</span>
            </div>

            {(() => {
              const statusInfo = getStatusInfo(trackingData.status);
              const StatusIcon = statusInfo.icon;
              return (
                <div className={`px-2.5 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 ${statusInfo.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span>{statusInfo.label}</span>
                </div>
              );
            })()}
          </div>

          {/* Quick-Reorder Visual Prompt if Previously Delivered */}
          {trackingData.status === 'delivered' && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {t('यह ऑर्डर सफलतापूर्वक डिलीवर हो चुका है!','This order was delivered successfully!')}
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      {t('क्या आपको दोबारा','Would you like to order')} <strong className="text-slate-800">{quantityText(trackingData)}</strong> {trackingData.billingVersion===2?trackingData.productName:(isHindi?'ड्राई आइस':'dry ice')}{t(' की आवश्यकता है?',' again?')}
                    </p>
                  </div>
                </div>

                {onQuickReorder && (
                  <button
                    onClick={() => onQuickReorder(trackingData)}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('पुनः ऑर्डर करें','Quick reorder')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5">{t('मात्रा','Quantity')}</span>
              <span className="font-mono font-bold text-sky-700 text-sm">{quantityText(trackingData)}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5">{t('स्थान / पता','Location')}</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-600" />
                <span className="truncate">{trackingData.district}</span>
              </span>
            </div>

            <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-700 block mb-0.5 font-semibold">Dispatch slot</span>
              <span className="font-semibold text-slate-800">{formatDispatchDate(dispatchParts(trackingData).date, dispatchParts(trackingData).slot, isHindi ? 'hi' : 'en')}</span>
            </div>
          </div>

          {/* Status Update Note */}
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs">
            <span className="text-[10px] uppercase font-bold text-sky-700 block mb-0.5">
              {t('ताज़ा अपडेट','Latest update')}
            </span>
            <p className="text-slate-800 font-medium">
              {getStatusInfo(trackingData.status).label}
            </p>
          </div>
          
          <div className="p-3 border rounded-xl bg-slate-50 text-center space-y-2">
            <span className="text-xs font-bold text-slate-700 block">{isHindi ? 'Paytm से भुगतान करें' : 'Scan to Pay (Paytm)'}</span>
            <img src="/assets/paytm-upi-qr.svg" alt="Paytm UPI QR for 8896332066@paytm" className="mx-auto h-36 w-36 rounded border border-slate-200 bg-white" />
            <p className="text-xs text-slate-700 font-mono">UPI ID: 8896332066@paytm</p>
            <button type="button" onClick={() => { void navigator.clipboard?.writeText('8896332066@paytm'); }} className="px-3 py-1 rounded-lg bg-white text-slate-800 border border-slate-300 text-xs font-semibold">{isHindi ? 'UPI ID कॉपी करें' : 'Copy UPI ID'}</button>
          </div>

          {/* Payment Status */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-600">
              <CreditCard className="w-3.5 h-3.5 text-sky-600" />
              <span>{t('पेमेंट स्थिति:','Payment status:')}</span>
            </div>
            <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
              trackingData.paymentStatus === 'payment_verified'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-amber-50 text-amber-700 border border-amber-300'
            }`}>
              {trackingData.paymentStatus === 'payment_verified' ? t('वेरीफाइड (सफल)','Payment Verified') : t('वेरिफिकेशन प्रतीक्षित','Awaiting Verification')}
            </span>
          </div>

          {/* Contact Owner */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">{t('ओनर से बात करें:','Contact owner:')}</span>
            <div className="flex gap-2">
              <a
                href="tel:+919580882066"
                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 font-semibold border border-sky-200 flex items-center gap-1"
                title={isHindi ? 'कॉल करें (95808 82066)' : 'Call (95808 82066)'}
              >
                <Phone className="w-3 h-3" />
                <span>{isHindi ? 'कॉल' : 'Call'}</span>
              </a>
              <a
                href={`https://wa.me/918896332066?text=${encodeURIComponent(`नमस्ते अंकुर ड्राई आइस, मुझे ऑर्डर नंबर ${trackingData.orderId} के बारे में जानकारी चाहिए।`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1"
                title={t('व्हाट्सएप (+91 8896332066)','WhatsApp (+91 8896332066)')}
              >
                <MessageCircle className="w-3 h-3" />
                <span>{t('व्हाट्सएप','WhatsApp')}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
