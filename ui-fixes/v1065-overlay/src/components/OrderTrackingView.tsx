import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { trackingRef as resolvedTrackingRef } from '../services/productOrders';
import { quantityText, quantityTextEnglish } from '../billing/unitBilling';
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
import { dispatchParts, formatDispatchDate } from '../utils/dispatchSchedule';
import { PaymentOptions } from './PaymentOptions';
import { trackingDispatchView } from '../utils/busDispatch';
import { subscribeDeliverySettings } from '../services/deliverySettings';
import { DEFAULT_DELIVERY_SETTINGS, findStop, type DeliverySettings } from '../utils/delivery';
import { OrderStatusTracker } from './customer/OrderStatusTracker';
import { subscribeAppResume } from '../utils/appResume';

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
  const {language}=useLanguage();
  const hi=language==='hi';
  const tr=(en:string,hindi:string)=>hi?hindi:en;
  const errors={id:tr('Enter your order ID (for example ADI-20261017-XXXX).','कृपया अपना ऑर्डर नंबर दर्ज करें (उदा. ADI-20261017-XXXX)।'),pin:tr('Enter your 6-digit secret tracking PIN.','कृपया अपना 6 अंकों का सीक्रेट ट्रैकिंग पिन दर्ज करें।'),missing:tr('Order not found. Check your order ID and secret PIN.','ऑर्डर नहीं मिला: कृपया अपना ऑर्डर नंबर और सीक्रेट पिन जांचें।'),failed:tr('Tracking could not be loaded. Please try again.','ट्रैकिंग जानकारी प्राप्त नहीं हुई। कृपया दोबारा प्रयास करें।')};
  const [searchId, setSearchId] = useState(initialOrderId || '');
  const [searchPin, setSearchPin] = useState(initialPin || '');
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<OrderTracking | null>(null);
  const [errorMsg, setErrorMsg] = useState<'id'|'pin'|'missing'|'failed'|null>(null);
  // v1.0.72: bus stop names come from the public settings/delivery doc (no prices).
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  const [busCopied, setBusCopied] = useState(false);
  useEffect(() => subscribeDeliverySettings(setDeliverySettings), []);

  // v1.0.76: `silent` re-reads on app open/resume, keeping the current card on screen.
  const fetchTracking = async (orderIdToSearch: string, pinToSearch: string, silent = false) => {
    const cleanId = orderIdToSearch.trim().toUpperCase();
    const cleanPin = pinToSearch.trim();

    if (!cleanId) {
      setErrorMsg('id');
      return;
    }

    if (!cleanPin || cleanPin.length < 4) {
      setErrorMsg('pin');
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
        setErrorMsg(null);
        setTrackingData(null);
      }

      // Server-side compound token authorization
      const compoundToken = `${cleanId}_${cleanPin}`;
      const trackingDocRef = resolvedTrackingRef(compoundToken);
      const trackingDocSnap = await getDoc(trackingDocRef);

      if (!trackingDocSnap.exists()) {
        if (silent) return;
        setErrorMsg('missing');
        return;
      }

      const data = trackingDocSnap.data() as OrderTracking;
      setTrackingData(data);
    } catch (err: unknown) {
      console.error('Error fetching order tracking:', err);
      if (!silent) setErrorMsg('failed');
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

  // v1.0.76 (Ankur, 14 Nov 2026): status was read once and went stale when the app
  // was reopened from the background. Re-read the shown order on app open/resume.
  const shownToken = trackingData ? trackingData.trackingToken || '' : '';
  useEffect(() => {
    if (!shownToken) return;
    const sep = shownToken.lastIndexOf('_');
    if (sep <= 0) return;
    const id = shownToken.slice(0, sep), pin = shownToken.slice(sep + 1);
    const off = subscribeAppResume(() => { void fetchTracking(id, pin, true); });
    return () => { if (typeof off === 'function') off(); };
  }, [shownToken]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(searchId, searchPin);
  };

  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { label: tr('Order Received','ऑर्डर प्राप्त हुआ'), color: 'bg-amber-50 text-amber-800 border-amber-300', icon: Clock };
      case 'confirmed':
        return { label: tr('Order Confirmed','ऑर्डर कन्फर्म हुआ'), color: 'bg-sky-50 text-sky-800 border-sky-300', icon: CheckCircle2 };
      case 'in_packing':
        return { label: tr('Packing Your Order','थर्मोकोल पैकिंग में'), color: 'bg-blue-50 text-blue-800 border-blue-300', icon: Snowflake };
      case 'dispatched':
        return { label: tr('Dispatched / In Transit','डिस्पैच / रास्ते में'), color: 'bg-indigo-50 text-indigo-800 border-indigo-300', icon: Truck };
      case 'delivered':
        return { label: tr('Delivered','डिलीवर हो गया'), color: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: PackageCheck };
      case 'cancelled':
        return { label: tr('Order Cancelled','ऑर्डर रद्द'), color: 'bg-rose-50 text-rose-800 border-rose-300', icon: AlertCircle };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-300', icon: Clock };
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4 px-3 sm:px-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">
          {tr('Track Order','ऑर्डर ट्रैक करें (Track Order)')}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {tr('Enter your order ID and secret PIN to check your order status.','ऑर्डर नंबर और सीक्रेट पिन दर्ज करके अपनी ड्राई आइस की स्थिति देखें।')}
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-4">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {tr('Order ID','ऑर्डर नंबर (Order ID)')}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder={tr("Example: ADI-20261017-W82K","उदा. ADI-20261017-W82K")}
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {tr('6-digit Secret PIN','6-अंकों का सीक्रेट पिन (Secret PIN)')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                maxLength={8}
                placeholder={tr("Example: 482910","उदा. 482910")}
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
              <span>{tr('Track','ट्रैक करें')}</span>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span role="alert">{errors[errorMsg]}</span>
          </div>
        )}
      </form>

      {/* Result Card */}
      {trackingData && (trackingData as any).etaMs && <p role="status" className="p-3">{tr("Estimated arrival:","अनुमानित आगमन:")} {new Date((trackingData as any).etaMs).toLocaleString(hi?"hi-IN":"en-IN")} · {tr("Manual estimate; last updated","मैन्युअल अनुमान; अंतिम अपडेट")} {String((trackingData as any).etaUpdatedAt?.toDate?.().toLocaleString(hi?"hi-IN":"en-IN")||tr("recently","हाल में"))}</p>}
      {trackingData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">{tr('Order ID','ऑर्डर नंबर')}</span>
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

          {/* v1.0.76: big step tracker (received -> confirmed -> packed -> dispatched -> delivered) */}
          <OrderStatusTracker order={trackingData} hi={hi} />

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
                      {tr('Your order has been delivered!','यह ऑर्डर सफलतापूर्वक डिलीवर हो चुका है!')}
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      {tr('Need another order of','क्या आपको दोबारा')} <strong className="text-slate-800">{hi?quantityText(trackingData):quantityTextEnglish(trackingData)}</strong> {trackingData.billingVersion===2?trackingData.productName:tr('Dry Ice','ड्राई आइस')} {tr('?','की आवश्यकता है?')}
                    </p>
                  </div>
                </div>

                {onQuickReorder && (
                  <button
                    onClick={() => onQuickReorder(trackingData)}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{tr('Quick Reorder','पुनः ऑर्डर करें (Quick Reorder)')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5">{tr('Quantity','मात्रा (Quantity)')}</span>
              <span className="font-mono font-bold text-sky-700 text-sm">{hi?quantityText(trackingData):quantityTextEnglish(trackingData)}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5">{tr('Location','स्थान / पता')}</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-600" />
                <span className="truncate">{trackingData.district}</span>
              </span>
            </div>

            <div className="col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-700 block mb-0.5 font-semibold">{tr('Dispatch slot','डिस्पैच स्लॉट')}</span>
              <span className="font-semibold text-slate-800">{formatDispatchDate(dispatchParts(trackingData).date, dispatchParts(trackingData).slot, hi ? 'hi' : 'en')}</span>
            </div>
          </div>

          {/* v1.0.72: dispatch mode, bus stop and bus number once dispatched */}
          {(() => {
            const dispatch = trackingDispatchView(trackingData, findStop(deliverySettings, trackingData.busStopId)?.name || trackingData.busStopId);
            if (!dispatch) return null;
            const copyBus = () => {
              if (!dispatch.busNumber) return;
              void navigator.clipboard?.writeText(dispatch.busNumber).then(() => { setBusCopied(true); window.setTimeout(() => setBusCopied(false), 2000); }).catch(() => {});
            };
            return (
              <div className="ankur-tracking-dispatch p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs space-y-1.5" data-no-translate>
                <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
                  <Truck className="w-3.5 h-3.5 text-indigo-700" />
                  <span>{hi ? dispatch.modeHi : dispatch.modeEn}{dispatch.stopName ? ` · ${hi ? 'बस स्टॉप' : 'Bus stop'}: ${dispatch.stopName}` : ''}</span>
                </div>
                {dispatch.busNumber && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-900">
                      <span className="font-semibold">{hi ? 'बस नंबर:' : 'Bus number:'}</span>{' '}
                      <span className="ankur-bus-number font-mono font-black text-base tracking-wider select-all px-1.5 py-0.5 rounded bg-white border border-indigo-200">{dispatch.busNumber}</span>
                    </p>
                    <button type="button" onClick={copyBus} className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200 cursor-pointer" aria-label={hi ? 'बस नंबर कॉपी करें' : 'Copy bus number'}>
                      {busCopied ? (hi ? 'कॉपी हुआ' : 'Copied') : (hi ? 'कॉपी' : 'Copy')}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Status Update Note */}
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs">
            <span className="text-[10px] uppercase font-bold text-sky-700 block mb-0.5">
              {tr('Latest update','ताज़ा अपडेट')}
            </span>
            <p className="text-slate-800 font-medium">
              {getStatusInfo(trackingData.status).label}
            </p>
          </div>
          
          <PaymentOptions amount={trackingData.totalAmount || 0} orderId={trackingData.orderId} isHindi={hi} />

          {/* Payment Status */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-600">
              <CreditCard className="w-3.5 h-3.5 text-sky-600" />
              <span>{tr('Payment Status:','पेमेंट स्थिति:')}</span>
            </div>
            <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
              trackingData.paymentStatus === 'payment_verified'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-amber-50 text-amber-700 border border-amber-300'
            }`}>
              {trackingData.paymentStatus === 'payment_verified' ? tr('Payment Verified','भुगतान सत्यापित') : tr('Awaiting Verification','सत्यापन प्रतीक्षित')}
            </span>
          </div>

          {/* Contact Owner */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">{tr('Contact owner:','ओनर से बात करें:')}</span>
            <div className="flex gap-2">
              <a
                href="tel:+919580882066"
                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 font-semibold border border-sky-200 flex items-center gap-1"
                title={tr("Call (+91 95808 82066)","कॉल करें (+91 95808 82066)")}
              >
                <Phone className="w-3 h-3" />
                <span>{tr('Call','कॉल')}</span>
              </a>
              <a
                href={`https://wa.me/918896332066?text=${encodeURIComponent(`नमस्ते अंकुर ड्राई आइस, मुझे ऑर्डर नंबर ${trackingData.orderId} के बारे में जानकारी चाहिए।`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1"
                title={tr("WhatsApp (+91 8896332066)","व्हाट्सएप (+91 8896332066)")}
              >
                <MessageCircle className="w-3 h-3" />
                <span>{tr('WhatsApp','व्हाट्सएप')}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
