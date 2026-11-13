import { quantityText } from '../billing/unitBilling';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, signOutUser, handleFirestoreError, OperationType, auth } from '../firebase';
import { Order, OrderStatus, UserRole, StaffPermissions } from '../types';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Search, 
  Phone, 
  MapPin, 
  LogOut, 
  Check, 
  AlertCircle,
  MessageCircle,
  Shield,
  Filter,
  Layers,
  ChevronRight,
  Boxes
} from 'lucide-react';
import { type User as FirebaseUser } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { isAndroidAppCheckReady } from '../appCheck';
import { PackingBoard, type PackingBoardOrder } from './PackingBoard';
import { subscribeDeliverySettings } from '../services/deliverySettings';
import { DEFAULT_DELIVERY_SETTINGS, type DeliverySettings } from '../utils/delivery';
import type { StaffAction } from '../utils/staffProjection';
import { sortNewOrders } from '../utils/orderWorkflow';

interface StaffDashboardProps {
  notificationTarget?: {orderId:string} | null;
  currentUser?: FirebaseUser | null;
  userRole?: UserRole | null;
  /** Owner-granted permissions. Real enforcement is in firestore.rules; this only adapts the UI. */
  permissions?: StaffPermissions;
  onLogoutSuccess?: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ 
  currentUser: propUser, 
  userRole: propRole,
  permissions,
  onLogoutSuccess,
  notificationTarget
}) => {
  const user = propUser || auth.currentUser;
  const role: UserRole = propRole || 'staff';
  const canView = permissions?.viewOrders === true;
  const canUpdate = permissions?.updateStatus === true;

  const [orders, setOrders] = useState<Order[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  useEffect(() => subscribeDeliverySettings(setDeliverySettings), []);
  const [showList, setShowList] = useState(false);
  // One order at a time; do not keep all contacts visible in the dashboard.
  const [contact, setContact] = useState<{ key: string; phone: string } | null>(null);
  const contactVersion = useRef(0);
  useEffect(() => {
    const closeOnBackground = () => {
      if (document.visibilityState === 'hidden') {
        contactVersion.current += 1;
        setContact(null);
      }
    };
    document.addEventListener('visibilitychange', closeOnBackground);
    return () => document.removeEventListener('visibilitychange', closeOnBackground);
  }, []);
  // The actual projection source, NOT billingVersion, chooses the collection.
  // Legacy product_orders may have billingVersion=1.
  const staffSource = (ord: Order): 'orders' | 'product_orders' | null => {
    const raw = (ord as Order & { sourceCollection?: unknown }).sourceCollection;
    return raw === 'orders' || raw === 'product_orders' ? raw : null;
  };
  const openOneContact = async (ord: Order) => {
    const sourceCollection = staffSource(ord);
    if (!sourceCollection) {
      setErrorMsg('ऑर्डर का स्रोत सत्यापित नहीं हो सका।');return;
    }
    const key = sourceCollection + '_' + ord.orderId;
    const epoch = ++contactVersion.current;
    if (contact?.key === key) {
      setContact(null);
      return;
    }
    setContact(null);
    setErrorMsg(null);
    if (!user || !canView || !isAndroidAppCheckReady()) {
      setErrorMsg('ग्राहक से संपर्क के लिए सत्यापित Android ऐप और अनुमति जरूरी है।');
      return;
    }
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'asia-southeast1'), 'ankurGetOneOrderContact');
      const result = await fn({ sourceCollection, orderId: ord.orderId });
      const data = result.data as {phone?: unknown; orderId?: unknown; sourceCollection?: unknown};
      if (epoch !== contactVersion.current) return;
      if (data.orderId !== ord.orderId || data.sourceCollection !== sourceCollection ||
          typeof data.phone !== 'string' || !/^\+91[6-9][0-9]{9}$/.test(data.phone)) {
        throw Error('Invalid contact response');
      }
      setContact({ key, phone: data.phone });
    } catch {
      if (epoch === contactVersion.current) setErrorMsg('इस ऑर्डर का नंबर देखने की अनुमति नहीं है।');
    }
  };
  useEffect(() => {
    if (!contact) return;
    const timeout = window.setTimeout(() => {
      contactVersion.current += 1;
      setContact(null);
    }, 15000);
    return () => window.clearTimeout(timeout);
  }, [contact]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [slotFilter, setSlotFilter] = useState<'all' | 'today_morning' | 'today_evening' | 'tomorrow_morning' | 'tomorrow_evening'>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  useEffect(() => {
    if (!notificationTarget) return;
    setSearchQuery(notificationTarget.orderId); setStatusFilter('all'); setSlotFilter('all'); setDistrictFilter('all');
  }, [notificationTarget]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Callable Function enforces role, actor identity and the undo window server-side.
  const handleSelfPickup = async (orderId: string, action: 'confirm' | 'undo') => {
    if (!user || !canUpdate || updatingId) return;
    // Web is not yet App Check-registered; native attestation is required
    // for this server-authoritative callable. This does not block other tasks.
    if (!isAndroidAppCheckReady()) {
      setErrorMsg('Self Pickup के लिए App Check सत्यापित Android ऐप चाहिए। बाकी काम जारी रख सकते हैं।');
      return;
    }
    const reason = action === 'undo' ? window.prompt('Undo reason (required):') : undefined;
    if (action === 'undo' && !reason?.trim()) return;
    if (action === 'confirm' && !window.confirm('Confirm physical handover to the customer?')) return;
    setUpdatingId(orderId);
    setErrorMsg(null);
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'asia-south1'), 'changeSelfPickup');
      await fn({ orderId, action, ...(reason ? { reason: reason.trim() } : {}) });
      setSuccessMsg(action === 'confirm' ? 'Pickup confirmed.' : 'Pickup confirmation undone.');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Pickup update failed.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Real-time listener for orders
  useEffect(() => {
    if (!canView) {
      setOrders([]);
      setLoading(false);
      setErrorMsg('आपको ऑर्डर देखने की अनुमति नहीं है। कृपया मालिक से संपर्क करें।');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    // Staff read only the redacted projection; raw orders contain private billing/payment data.
    const unsubscribe = onSnapshot(collection(db, 'staffOrderViews'), (snapshot) => {
      const list: Order[] = snapshot.docs.map((docSnap: any) => {
        const value = docSnap.data();
        return {
          orderId: value.orderId || docSnap.id, sourceCollection: value.sourceCollection || 'orders',
          customerName: value.customerName || '', city: value.city || value.district || '',
          district: value.city || value.district || '', address: '',
          productName: value.productName || 'Dry Ice', dispatchTiming: value.dispatchTiming || '',
          status: value.status, quantityKg: typeof value.quantityKg === 'number' ? value.quantityKg : 0,
          billingVersion: value.billingVersion === 2 ? 2 : undefined,
          billing: value.billingVersion === 2 ? {unit:value.billing?.unit || 'piece', quantityUnits:value.billing?.quantityUnits || 0} : undefined,
          createdAt: value.createdAt, updatedAt: value.updatedAt, selfPickup: value.selfPickup || undefined,
          dispatchDate: value.dispatchDate, slot: value.slot, isTrash: value.isTrash === true,
          deliveryMode: value.deliveryMode, busStopId: value.busStopId, packCount: value.packCount,
          deliveryNote: value.deliveryNote, packingStatus: value.packingStatus,
          waPhone: typeof value.waPhone === 'string' ? value.waPhone : undefined,
          busNumber: typeof value.busNumber === 'string' ? value.busNumber : undefined,
        } as unknown as Order;
      }).filter((order: Order) => !order.isTrash);
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
        return timeB - timeA;
      });
      setOrders(list);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try { handleFirestoreError(error, OperationType.LIST, 'orders'); }
      catch (e: any) { setErrorMsg('ऑर्डर लोड करने में समस्या: ' + (e?.message || 'Permission denied')); }
    });
    return () => unsubscribe();

  }, [canView]);

  // Filter slots helper
  const matchesSlot = (ord: Order, slotKey: string) => {
    const timing = (ord.dispatchTiming || '').trim().toLowerCase();
    switch (slotKey) {
      case 'today_morning':
        return timing.includes('आज सुबह') || timing.includes('today morning');
      case 'today_evening':
        return timing.includes('आज शाम') || timing.includes('today evening');
      case 'tomorrow_morning':
        return timing.includes('कल सुबह') || timing.includes('tomorrow morning');
      case 'tomorrow_evening':
        return timing.includes('कल शाम') || timing.includes('tomorrow evening');
      default:
        return true;
    }
  };

  // Available districts for filter
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const d = (o.district || o.city || '').trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    const list = orders.filter((ord) => {
      // Status filter
      if (statusFilter !== 'all' && ord.status !== statusFilter) {
        return false;
      }
      // Slot filter
      if (slotFilter !== 'all' && !matchesSlot(ord, slotFilter)) {
        return false;
      }
      // District filter
      if (districtFilter !== 'all') {
        const d = (ord.district || ord.city || '').trim().toLowerCase();
        if (d !== districtFilter.toLowerCase()) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const idMatch = (ord.orderId || '').toLowerCase().includes(q);
        const nameMatch = (ord.customerName || '').toLowerCase().includes(q);
        const cityMatch = (ord.district || ord.city || ord.address || '').toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !cityMatch) {
          return false;
        }
      }
      return true;
    });
    // v1.0.74 (Ankur, 13 Nov 2026): staff "New orders" list matches the owner's (earliest dispatch first).
    return statusFilter === 'pending' ? sortNewOrders(list) : list;
  }, [orders, statusFilter, slotFilter, districtFilter, searchQuery]);

  // Operational metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'pending').length;
    const packing = orders.filter((o) => o.status === 'in_packing').length;
    const dispatched = orders.filter((o) => o.status === 'dispatched').length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const totalKg = orders.reduce((sum, o) => sum + (Number(o.quantityKg) || 0), 0);
    return { total, pending, packing, dispatched, delivered, totalKg };
  }, [orders]);

  // Spark-only status update (no Cloud Function / Blaze). One atomic batch:
  //  - orders/{id}: rules allow staff to change ONLY status + updatedAt, and only
  //    to in_packing / dispatched / delivered.
  //  - staffOrderViews/{id}: status + packing flag + statusSyncPending, which the
  //    owner app uses to copy the status to the public tracking document.
  const handleUpdateStatus = async (ord: Order, newStatus: OrderStatus) => {
    if (!canUpdate) {
      setErrorMsg('आपको ऑर्डर का स्टेटस बदलने की अनुमति नहीं है।');
      return;
    }
    if (newStatus !== 'in_packing' && newStatus !== 'dispatched' && newStatus !== 'delivered') {
      setErrorMsg('स्टाफ केवल Packing done, Dispatched या Handed over कर सकता है।');
      return;
    }
    try {
      setUpdatingId(ord.orderId);
      setErrorMsg(null);
      if (!user?.uid) throw Error('लॉगिन जरूरी है।');
      const batch = writeBatch(db);
      batch.update(doc(db, 'orders', ord.orderId), { status: newStatus, updatedAt: serverTimestamp() });
      batch.update(doc(db, 'staffOrderViews', ord.orderId), {
        status: newStatus,
        ...(newStatus === 'in_packing' ? { packingStatus: 'packed' } : {}),
        statusSyncPending: true,
        statusUpdatedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();

      setSuccessMsg(`ऑर्डर #${ord.orderId.split('-').pop()} का स्टेटस '${getStatusHindi(newStatus)}' अपडेट हो गया!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Staff status update error:', err);
      setErrorMsg('स्टेटस अपडेट करने में समस्या: ' + (err.message || 'त्रुटि'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePackingAction = (ord: PackingBoardOrder, action: StaffAction) => {
    const full = orders.find((item) => item.orderId === ord.orderId);
    if (!full) return;
    void handleUpdateStatus(full, action === 'packing_done' ? 'in_packing' : action === 'dispatched' ? 'dispatched' : 'delivered');
  };

  const getStatusHindi = (s: OrderStatus) => {
    switch (s) {
      case 'pending': return 'पेंडिंग (Pending)';
      case 'confirmed': return 'कन्फर्म (Confirmed)';
      case 'in_packing': return 'पैकिंग में (In Packing)';
      case 'dispatched': return 'डिस्पैच / रवाना (Dispatched)';
      case 'delivered': return 'डिलीवर हो गया (Delivered)';
      case 'cancelled': return 'रद्द (Cancelled)';
      default: return s;
    }
  };

  const getStatusBadgeClass = (s: OrderStatus) => {
    switch (s) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'in_packing': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'dispatched': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 px-3 sm:px-6 bg-slate-50 min-h-screen text-slate-900">
      
      {/* 1. TOP RESTRICTED STAFF / DELIVERY HEADER */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              role === 'delivery' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs'
            }`}>
              {role === 'delivery' ? <Truck className="w-6 h-6" /> : <Boxes className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {role === 'delivery' ? 'डिलीवरी पार्टनर डैशबोर्ड' : 'स्टाफ ऑपरेशनल डैशबोर्ड'}
                </h1>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  role === 'delivery' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {role === 'delivery' ? 'Delivery Partner' : 'Staff Member'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                सीमित एक्सेस: केवल डिस्पैच और ऑर्डर स्टेटस अपडेट करने की अनुमति है।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {user?.email && (
              <span className="text-xs font-mono text-slate-500 hidden md:inline bg-slate-100 px-2.5 py-1 rounded-lg">
                {user.email}
              </span>
            )}
            <button
              onClick={async () => {
                await signOutUser();
                onLogoutSuccess?.();
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="लॉगआउट करें"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>लॉगआउट</span>
            </button>
          </div>
        </div>

        {/* Operational Statistics Pill Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
            <span className="text-slate-500 block text-[11px]">कुल सक्रिय ऑर्डर्स</span>
            <span className="text-base font-black text-slate-800">{metrics.total} ऑर्डर्स</span>
          </div>
          <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-200">
            <span className="text-amber-700 block text-[11px]">पैकिंग/पेंडिंग</span>
            <span className="text-base font-black text-amber-900">{metrics.pending + metrics.packing}</span>
          </div>
          <div className="bg-purple-50 rounded-xl p-2.5 border border-purple-200">
            <span className="text-purple-700 block text-[11px]">रास्ते में (Dispatched)</span>
            <span className="text-base font-black text-purple-900">{metrics.dispatched}</span>
          </div>
          <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-200">
            <span className="text-emerald-700 block text-[11px]">कुल मात्रा (KG)</span>
            <span className="text-base font-black text-emerald-900">{metrics.totalKg} KG</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. STAFF HOME = PACKING SCREEN: one big pill per active bus stop + Local. */}
      <div className="mb-4">
        <PackingBoard orders={orders as unknown as PackingBoardOrder[]} settings={deliverySettings} mode="staff"
          canUpdate={canUpdate} updatingId={updatingId} onAction={handlePackingAction} title="Packing" />
      </div>
      <button type="button" className="soft-button secondary-button mb-3" aria-expanded={showList} onClick={() => setShowList(!showList)}>
        {showList ? 'Order list band karein' : 'Sabhi orders · search / contact'}
      </button>

      {showList && <>
      {/* 3. FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs mb-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ऑर्डर ID, ग्राहक का नाम, मोबाइल नंबर या शहर खोजें..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
          />
        </div>

        {/* Slot Filters */}
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>डिस्पैच स्लॉट के अनुसार:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'all', label: 'सभी स्लॉट' },
              { key: 'today_morning', label: '🌅 आज सुबह' },
              { key: 'today_evening', label: '🌇 आज शाम' },
              { key: 'tomorrow_morning', label: '🌄 कल सुबह' },
              { key: 'tomorrow_evening', label: '🌆 कल शाम' },
            ].map((slot) => (
              <button
                key={slot.key}
                onClick={() => setSlotFilter(slot.key as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  slotFilter === slot.key
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* v1.0.74 (Ankur, 13 Nov 2026): owner-style "New orders" (not yet confirmed), red count. */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            data-staff-new-orders
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm font-black border cursor-pointer ${statusFilter === 'pending' ? 'bg-slate-900 text-white border-slate-900' : 'bg-red-50 text-red-800 border-red-200'}`}
          >
            <span>New orders</span>
            <b className={`inline-flex min-w-[22px] justify-center rounded-full px-1.5 text-xs tabular-nums ${metrics.pending ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{metrics.pending}</b>
          </button>
        </div>

        {/* Status Filters */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'all', label: `सभी (${orders.length})` },
              { key: 'pending', label: 'पेंडिंग' },
              { key: 'confirmed', label: 'कन्फर्म' },
              { key: 'in_packing', label: 'पैकिंग जारी' },
              { key: 'dispatched', label: 'डिस्पैच / रवाना' },
              { key: 'delivered', label: 'डिलीवर' },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setStatusFilter(st.key as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st.key
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {availableDistricts.length > 0 && (
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer"
            >
              <option value="all">सभी ज़िले / शहर</option>
              {availableDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4. ORDERS LIST */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">ऑर्डर लोड हो रहे हैं...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-200">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">कोई ऑर्डर नहीं मिला</p>
            <p className="text-xs text-slate-400 mt-1">
              चयनित फ़िल्टर के अनुसार कोई सक्रिय ऑर्डर उपलब्ध नहीं है।
            </p>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const shortId = ord.orderId.split('-').pop() || ord.orderId;
            const contactKey = (staffSource(ord) || 'unknown') + '_' + ord.orderId;
            const isThisUpdating = updatingId === ord.orderId;

            return (
              <div
                key={ord.orderId}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Header row: ID, Dispatch timing badge, and current status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      #{shortId}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      {ord.orderId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-lg font-bold">
                      {ord.dispatchTiming}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(ord.status)}`}>
                      {getStatusHindi(ord.status)}
                    </span>
                  </div>
                </div>

                {/* Content row: Customer Details, Product & Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3">
                  <div>
                    <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span>{ord.customerName}</span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                             <span>{ord.city || 'शहर दर्ज नहीं'}</span>
                    </div>
                    <div className="ankur-staff-contact mt-2">
                      <button type="button"
                        onClick={() => { void openOneContact(ord); }}
                        aria-expanded={contact?.key === contactKey}
                        aria-label="इस एक ऑर्डर के ग्राहक से संपर्क करें"
                        className="ankur-staff-call-trigger inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold">
                        <Phone className="w-4 h-4" aria-hidden="true"/>
                        {contact?.key === contactKey ? 'नंबर छिपाएँ' : 'कॉल करें'}
                      </button>
                      {contact?.key === contactKey && (
                        <div role="group" aria-label="केवल चयनित ऑर्डर का संपर्क"
                          className="ankur-staff-contact-revealed mt-2 rounded-xl border p-3 space-y-2">
                          <p className="font-semibold text-xs">अधिकृत नंबर — 15 सेकंड में अपने-आप छिपेगा।</p>
                          <p className="font-mono text-base font-black">{contact.phone}</p>
                          <div className="flex flex-wrap gap-2">
                            <a href={'tel:' + contact.phone}
                              className="ankur-staff-dial inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold">
                              <Phone className="w-3.5 h-3.5" /> डायल करें
                            </a>
                            <a href={'https://wa.me/' + contact.phone.replace(/[^0-9]/g, '') +
                              '?text=' + encodeURIComponent('नमस्ते ' + ord.customerName + ' जी, Ankur Dryice से आपके ऑर्डर #' + shortId + ' (' + quantityText(ord) + ') के संबंध में सूचना।')}
                              target="_blank" rel="noopener noreferrer"
                              className="ankur-staff-whatsapp inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold">
                              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity & Dispatch Note */}
                  <div className="sm:border-l sm:border-slate-100 sm:pl-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-bold block">आइटम व मात्रा:</span>
                      <div className="text-base font-black text-sky-700 mt-0.5">
                        {ord.billingVersion===2?ord.productName:'🧊 ड्राई आइस'} · {quantityText(ord)}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        + थर्मोकोल बॉक्स सुरक्षित पैकिंग
                      </span>
                    </div>

                  </div>
                </div>

                {ord.selfPickup && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3" aria-label="Self Pickup status">
                    <p className="text-xs font-bold text-amber-950">Self Pickup</p>
                    <p className="mt-1 text-xs text-amber-900">
                      {ord.selfPickup.status === 'pickup_completed'
                        ? 'Pickup confirmed • receipt ' + (ord.selfPickup.receiptStatus ?? 'unavailable')
                        : 'Pickup pending • customer handover not confirmed'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button"
                        disabled={!user || !canUpdate || !!updatingId || ord.selfPickup.status !== 'pickup_pending'}
                        onClick={() => handleSelfPickup(ord.orderId, 'confirm')}
                        className="rounded-lg bg-amber-200 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-50">
                        Confirm Pickup
                      </button>
                      <button type="button"
                        disabled={!user || !canUpdate || !!updatingId || ord.selfPickup.status !== 'pickup_completed'}
                        onClick={() => handleSelfPickup(ord.orderId, 'undo')}
                        className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-50">
                        Undo Pickup
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-amber-800">
                      Actions require the deployed Firebase callable backend; authorization and undo timing are checked server-side.
                    </p>
                  </div>
                )}
                {/* Status Update Action Pipeline (Staff & Delivery Boy only has status action buttons) */}
                <div className="pt-3 border-t border-slate-100 bg-slate-50/50 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-3 rounded-b-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-sky-600" />
                      <span>स्टेटस अपडेट करें:</span>
                    </span>
                    {isThisUpdating && (
                      <span className="text-xs text-sky-600 flex items-center gap-1 font-bold">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        अपडेट हो रहा है...
                      </span>
                    )}
                  </div>

                  {!canUpdate && (
                    <p className="text-[11px] text-amber-700 mb-2">स्टेटस बदलने की अनुमति मालिक ने नहीं दी है।</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button type="button" disabled={isThisUpdating || !canUpdate || ord.status === 'dispatched' || ord.status === 'delivered'}
                      onClick={() => handleUpdateStatus(ord, 'in_packing')}
                      className="soft-button status-action status-packing py-2 px-2 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
                      <Package className="w-3.5 h-3.5" /><span>Packing done</span>
                    </button>
                    <button type="button" disabled={isThisUpdating || !canUpdate || ord.status === 'dispatched' || ord.status === 'delivered'}
                      onClick={() => handleUpdateStatus(ord, 'dispatched')}
                      className="soft-button status-action status-dispatch py-2 px-2 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
                      <Truck className="w-3.5 h-3.5" /><span>Dispatched</span>
                    </button>
                    <button type="button" disabled={isThisUpdating || !canUpdate || ord.status === 'delivered'}
                      onClick={() => handleUpdateStatus(ord, 'delivered')}
                      className="soft-button status-action status-delivered py-2 px-2 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
                      <CheckCircle2 className="w-3.5 h-3.5" /><span>Handed over / Delivered</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      </>}

    </div>
  );
};

export default StaffDashboard;
