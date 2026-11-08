import { StaffOrderAccessManager } from './StaffOrderAccessManager';
import { tryInventoryDispatch } from '../services/inventoryDispatch';
import { DailyWinnerOwnerControls } from './customer/DailyWinner';
import { subscribeOrderDocuments, orderRef as resolvedOrderRef, trackingRef as resolvedTrackingRef } from '../services/productOrders';
import { quantityText } from '../billing/unitBilling';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Search, 
  Phone, 
  MapPin, 
  Check, 
  X, 
  CreditCard, 
  MessageCircle, 
  Plus, 
  BarChart2, 
  TrendingUp, 
  LogOut, 
  ArrowLeft, 
  MoreVertical, 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Calendar, 
  Settings, 
  User, 
  Users, 
  PackageCheck,
  Building2,
  Sun,
  Sunset,
  Moon,
  Store
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { 
  collection, 
  getDocs, 
  onSnapshot,
  doc, 
  updateDoc, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, isUserAdmin, ADMIN_EMAIL, signOutUser, handleFirestoreError, OperationType } from '../firebase';
import { getDispatchSlots } from '../data/products';
import { subscribeToRates, saveCurrentRates, DEFAULT_RATES } from '../data/rates';
import { SignInScreen } from './SignInScreen';
import { OwnerStorefrontManager } from './OwnerStorefrontManager';
import { ExpensesView } from './ExpensesView';
import { calculateOwnerOverview, downloadOrdersCsv } from '../utils/ownerReports';
import { UserManagement } from './UserManagement';
import { AIChat } from './AIChat';
import { addIstDays, istDateKey, dispatchBucket, dispatchParts, formatDispatchDate, type DispatchBucket } from '../utils/dispatchSchedule';

import { generateMonthlyPDF } from '../utils/monthlyReport';
import type { Order, OrderStatus, PaymentStatus, RateSettings } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';

interface AdminDashboardProps {
  notificationTarget?: {orderId:string} | null;
  currentUser: FirebaseUser | null;
  onGoToTrack: (orderId: string, pin: string) => void;
  onGoToOrder?: () => void;
}

// Format date into Asia/Kolkata (IST = UTC + 5:30)
function getISTDateParts(dateInput: any): { dateStr: string; timestampMs: number } | null {
  if (!dateInput) return null;
  let date: Date | null = null;
  if (typeof dateInput.toDate === 'function') date = dateInput.toDate();
  else if (dateInput.seconds) date = new Date(dateInput.seconds * 1000);
  else if (dateInput instanceof Date) date = dateInput;
  else if (typeof dateInput === 'string' || typeof dateInput === 'number') date = new Date(dateInput);

  if (!date || isNaN(date.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return { dateStr: formatter.format(date), timestampMs: date.getTime() };
  } catch {
    return { dateStr: date.toISOString().slice(0, 10), timestampMs: date.getTime() };
  }
}

function getTodayISTDateStr(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function getOrderISTDate(ord: Order): { dateStr: string; timestampMs: number } | null {
  const fromCreated = getISTDateParts(ord.createdAt);
  if (fromCreated) return fromCreated;

  // Fallback: extract YYYY-MM-DD from standardized order ID (ADI-YYYYMMDD-XXXX)
  if (ord.orderId) {
    const match = ord.orderId.match(/ADI-(\d{4})(\d{2})(\d{2})-/);
    if (match) {
      const dateStr = `${match[1]}-${match[2]}-${match[3]}`;
      const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return { dateStr, timestampMs: d.getTime() };
    }
  }
  return null;
}

function getShortOrderId(id: string): string {
  if (!id) return '';
  const parts = id.split('-');
  return parts.length > 1 ? parts[parts.length - 1] : (id.length > 6 ? id.slice(-4) : id);
}

export type DispatchSlotKey = DispatchBucket;

export function matchesDispatchSlot(ord: Order, slotKey: DispatchSlotKey): boolean {
  return dispatchBucket(ord) === slotKey;
}

function orderDispatchLabel(ord: Order): string {
  const parts = dispatchParts(ord);
  return formatDispatchDate(parts.date, parts.slot, document.documentElement.dataset.appLanguage === 'en' ? 'en' : 'hi');
}

const OwnerOrderContactActions: React.FC<{ order: Order }> = ({ order }) => {
  const message = `नमस्ते ${order.customerName}, अंकुर ड्राई आइस से आपके ऑर्डर #${order.orderId} (${quantityText(order)}) के संबंध में।`;
  return <div className="ankur-order-card-actions flex items-center gap-1.5 pt-0.5">
    <a href={`tel:${order.customerPhone}`} className="flex-1 min-h-[34px] px-1.5 sm:px-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-colors" title="कॉल करें">
      <Phone className="w-3 h-3 text-sky-600" /><span>Call {order.customerPhone.slice(-10)}</span>
    </a>
    <a href={`https://wa.me/91${order.customerPhone.slice(-10)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-h-[34px] px-1.5 sm:px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-800 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-colors" title="WhatsApp पर चैट करें">
      <MessageCircle className="w-3 h-3 text-emerald-600" /><span>WhatsApp</span>
    </a>
  </div>;
};


interface SavedCustomer {
  name: string;
  phone: string;
  city: string;
  orderCount: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  currentUser, 
  onGoToTrack,
  onGoToOrder,
  notificationTarget
}) => {
  const isAdmin = isUserAdmin(currentUser);

  // Main navigation tabs: 'new-entry' | 'orders' | 'insights' | 'expenses' | 'users' | 'ai-chat'
  const [activeSection, setActiveSection] = useState<'new-entry' | 'orders' | 'insights' | 'expenses' | 'users' | 'ai-chat' | 'storefront'>('orders');
  useEffect(() => {
    const openReports = () => {
      setActiveSection('insights');
      window.setTimeout(() => document.getElementById('ankur-owner-report-panel')?.scrollIntoView({behavior:'smooth',block:'start'}), 0);
    };
    window.addEventListener('ankur-owner-reports', openReports);
    return () => window.removeEventListener('ankur-owner-reports', openReports);
  }, []);


  // Order List Filter tabs: 'all' | 'pending' | 'confirmed' | 'packing' | 'dispatched' | 'delivered' | 'trash'
  const [orderFilterTab, setOrderFilterTab] = useState<'all' | 'pending' | 'confirmed' | 'packing' | 'dispatched' | 'delivered' | 'trash'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

  // Orders View Mode: 'slot' (default dispatch slot view) | 'all' (complete order management view)
  const [ordersViewMode, setOrdersViewMode] = useState<'slot' | 'all'>('slot');
  const [selectedDispatchSlot, setSelectedDispatchSlot] = useState<DispatchSlotKey>('today_morning');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [dispatchTimeFilter, setDispatchTimeFilter] = useState<'all' | DispatchSlotKey>('all');
  useEffect(() => {
    if (!notificationTarget) return;
    setActiveSection('orders'); setOrderFilterTab('all'); setPaymentFilter('all');
    setDispatchTimeFilter('all'); setSelectedDistrict('all'); setSearchQuery(notificationTarget.orderId);
  }, [notificationTarget]);

  // Firebase orders
  const migratedScheduleIds = React.useRef(new Set<string>());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Rate Settings & Capacity
  const [rates, setRates] = useState<RateSettings>(DEFAULT_RATES);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editDryIceRate, setEditDryIceRate] = useState<number>(50);
  const [editThermocolRate, setEditThermocolRate] = useState<number>(10);
  const [editWholesaleRate, setEditWholesaleRate] = useState<number>(0);
  const [dailyCapacity, setDailyCapacity] = useState<number>(() => {
    const saved = localStorage.getItem('ankur_dryice_daily_capacity');
    return saved ? Number(saved) : 500;
  });
  const [editCapacity, setEditCapacity] = useState<number>(500);
  const [savingRates, setSavingRates] = useState(false);

  // Delete / Trash Confirmation Modal
  const [orderToTrash, setOrderToTrash] = useState<Order | null>(null);
  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // New Entry Form State
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newQuantityInput, setNewQuantityInput] = useState('10');
  const dispatchSlots = getDispatchSlots();
  const [newDispatchTiming, setNewDispatchTiming] = useState(dispatchSlots[0]?.label || 'आज सुबह 12 AM–12 PM');
  const [newOwnerNotes, setNewOwnerNotes] = useState('');
  const [newTestOrder, setNewTestOrder] = useState(false);
  const [savingNewOrder, setSavingNewOrder] = useState(false);
  const [newOrderSuccess, setNewOrderSuccess] = useState<{ orderId: string; pin: string } | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Insights State
  const [insightsTimeFilter, setInsightsTimeFilter] = useState<'today' | '7d' | '10d' | '15d' | '30d' | 'all' | 'custom'>('today');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  // Subscribe to Rates
  useEffect(() => {
    const unsub = subscribeToRates((loaded) => {
      setRates(loaded);
      setEditDryIceRate(loaded.dryIceRate);
      setEditThermocolRate(loaded.thermocolRate);
      setEditWholesaleRate(loaded.wholesaleRate || 0);
    });
    return () => unsub();
  }, []);

  // Real-time listener for all orders
  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    setErrorMsg(null);
    const ordersCol = collection(db, 'orders');
    
    const unsubscribe = subscribeOrderDocuments(
      {} ,
      (snapshot) => {
        const list: Order[] = snapshot.docs.map((d) => d.data() as Order);
        list.forEach((order) => {
          if (order.dispatchDate || migratedScheduleIds.current.has(order.orderId)) return;
          const parts = dispatchParts(order);
          if (!parts.date) return;
          migratedScheduleIds.current.add(order.orderId);
          void updateDoc(doc(db, 'orders', order.orderId), {
            dispatchDate: parts.date,
            slot: parts.slot,
            dispatchTiming: formatDispatchDate(parts.date, parts.slot, 'hi'),
          }).catch((error) => { migratedScheduleIds.current.delete(order.orderId); console.warn('Legacy dispatch schedule migration deferred:', error); });
        });
        
        // Sort newest first
        list.sort((a, b) => {
          const timeA = getOrderISTDate(a)?.timestampMs || 0;
          const timeB = getOrderISTDate(b)?.timestampMs || 0;
          return timeB - timeA;
        });

        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore real-time orders error:', error);
        setLoading(false);
        try {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        } catch (e: any) {
          setErrorMsg('ऑर्डर लोड करने में समस्या आई: ' + (e.message || 'Error'));
        }
      }
    );

    const expensesCol = collection(db, 'expenses');
    const unsubExpenses = onSnapshot(expensesCol, (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });

    return () => {
      unsubscribe();
      unsubExpenses();
    };
  }, [isAdmin]);

  const [expenses, setExpenses] = useState<any[]>([]);
  const [monthlyReportBusy, setMonthlyReportBusy] = useState(false);
  const [monthlyReportError, setMonthlyReportError] = useState('');

  const fetchAllOrders = () => {
    setSuccessMsg("ऑर्डर रियल-टाइम सिंक हो रहे हैं");
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  // Saved customers list aggregated from actual previous orders
  const savedCustomers = useMemo(() => {
    const map = new Map<string, SavedCustomer>();
    orders.forEach((ord) => {
      const cleanPhone = (ord.customerPhone || '').replace(/[^0-9]/g, '').slice(-10);
      if (cleanPhone.length === 10) {
        const existing = map.get(cleanPhone);
        if (!existing) {
          map.set(cleanPhone, {
            name: ord.customerName || '',
            phone: cleanPhone,
            city: ord.city || ord.district || ord.address || '',
            orderCount: 1,
          });
        } else {
          existing.orderCount += 1;
          if (!existing.city && (ord.city || ord.district)) {
            existing.city = ord.city || ord.district || '';
          }
        }
      }
    });
    return Array.from(map.values());
  }, [orders]);

  // Filtered saved customers for dropdown
  const matchingCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return [];
    const q = customerSearchQuery.trim().toLowerCase();
    return savedCustomers.filter((c) => 
      c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.city.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [savedCustomers, customerSearchQuery]);

  // Browser Contact Picker API support
  const handlePickContact = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
        if (contacts && contacts[0]) {
          const c = contacts[0];
          if (c.name && c.name[0]) setNewCustomerName(c.name[0]);
          if (c.tel && c.tel[0]) {
            const clean = c.tel[0].replace(/[^0-9]/g, '').slice(-10);
            setNewCustomerPhone(clean);
          }
          setSuccessMsg('फोन कॉन्टैक्ट से जानकारी भरी गई।');
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      } catch (err) {
        console.warn('Contact picker dismissed or error:', err);
      }
    } else {
      setErrorMsg('इस ब्राउज़र/डिवाइस में कॉन्टैक्ट पिकर समर्थित नहीं है। कृपया ग्राहक खोज का उपयोग करें।');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // Today IST Metrics (Calendar day 12:00 AM to 11:59:59 PM Asia/Kolkata)
  const todayISTStr = getTodayISTDateStr();
  const todayActiveOrders = useMemo(() => {
    return orders.filter((ord) => !ord.isTrash && !ord.testOrder && getOrderISTDate(ord)?.dateStr === todayISTStr);
  }, [orders, todayISTStr]);

  const todayTotalOrders = todayActiveOrders.length;
  const todayTotalKg = Math.round(todayActiveOrders.reduce((sum, ord) => sum + (Number(ord.quantityKg) || 0), 0) * 100) / 100;
  const todayTotalValue = Math.round(todayActiveOrders.reduce((sum, ord) => sum + (Number(ord.totalAmount) || 0), 0) * 100) / 100;
  const todayPaymentReceived = Math.round(
    todayActiveOrders
      .filter((ord) => ord.paymentStatus === 'payment_verified')
      .reduce((sum, ord) => sum + (Number(ord.totalAmount) || 0), 0) * 100
  ) / 100;
  const todayPaymentPending = Math.round(
    todayActiveOrders
      .filter((ord) => ord.paymentStatus !== 'payment_verified')
      .reduce((sum, ord) => sum + (Number(ord.totalAmount) || 0), 0) * 100
  ) / 100;
  const todayPendingOrders = todayActiveOrders.filter((ord) => ord.status === 'pending').length;

  // Active (non-trash) vs Trashed orders
  const activeOrders = useMemo(() => orders.filter((o) => !o.isTrash), [orders]);
  const trashedOrders = useMemo(() => orders.filter((o) => !!o.isTrash), [orders]);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvError, setCsvError] = useState('');
  const csvInFlight = React.useRef(false);
  const handleOrdersCsv = async () => {
    if (csvInFlight.current || loading || errorMsg || !activeOrders.length) return;
    csvInFlight.current = true; setCsvBusy(true); setCsvError('');
    try { await downloadOrdersCsv(reportingOrders); }
    catch { setCsvError('CSV सेव / शेयर नहीं हुई। दोबारा कोशिश करें।'); }
    finally { csvInFlight.current = false; setCsvBusy(false); }
  };
  // Rolling 30-day overview from the same Firestore snapshot as the order list.
  const reportingOrders = useMemo(() => activeOrders.filter((ord) => ord.testOrder !== true), [activeOrders]);
  const ownerOverview = useMemo(() => calculateOwnerOverview(reportingOrders), [reportingOrders]);

  // Available districts/cities extracted from orders for dropdown filter
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const d = (o.district || o.city || '').trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'hi'));
  }, [orders]);

  // Every active order belongs to exactly one current, next-day, or old/overdue bucket.
  const slotCounts = useMemo(() => {
    return {
      today_morning: activeOrders.filter((o) => matchesDispatchSlot(o, 'today_morning')).length,
      today_evening: activeOrders.filter((o) => matchesDispatchSlot(o, 'today_evening')).length,
      tomorrow_morning: activeOrders.filter((o) => matchesDispatchSlot(o, 'tomorrow_morning')).length,
      tomorrow_evening: activeOrders.filter((o) => matchesDispatchSlot(o, 'tomorrow_evening')).length,
      old_overdue: activeOrders.filter((o) => matchesDispatchSlot(o, 'old_overdue')).length,
    };
  }, [activeOrders]);

  // Active orders for currently selected dispatch slot
  const slotOrders = useMemo(() => {
    return activeOrders.filter((o) => matchesDispatchSlot(o, selectedDispatchSlot));
  }, [activeOrders, selectedDispatchSlot]);

  // Filtered orders in All Orders tab
  const displayedOrders = useMemo(() => {
    let baseList = orderFilterTab === 'trash' ? trashedOrders : activeOrders;

    if (orderFilterTab !== 'all' && orderFilterTab !== 'trash') {
      baseList = baseList.filter((ord) => {
        if (orderFilterTab === 'packing') {
          return ord.status === 'in_packing';
        }
        return ord.status === orderFilterTab;
      });
    }

    // Payment Filter: 'all' | 'pending' | 'paid'
    if (paymentFilter === 'pending') {
      baseList = baseList.filter((ord) => ord.paymentStatus !== 'payment_verified');
    } else if (paymentFilter === 'paid') {
      baseList = baseList.filter((ord) => ord.paymentStatus === 'payment_verified');
    }

    // Dispatch Time Filter: 'all' | DispatchSlotKey
    if (dispatchTimeFilter !== 'all') {
      baseList = baseList.filter((ord) => matchesDispatchSlot(ord, dispatchTimeFilter));
    }

    // Filter by selected district
    if (selectedDistrict !== 'all') {
      baseList = baseList.filter((ord) => {
        const d = (ord.district || ord.city || '').trim().toLowerCase();
        return d === selectedDistrict.toLowerCase();
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      baseList = baseList.filter((ord) => {
        const orderIdMatch = (ord.orderId || '').toLowerCase().includes(q);
        const nameMatch = (ord.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (ord.customerPhone || '').includes(q);
        const cityMatch = (ord.district || ord.city || ord.address || '').toLowerCase().includes(q);
        return orderIdMatch || nameMatch || phoneMatch || cityMatch;
      });
    }

    return baseList;
  }, [activeOrders, trashedOrders, orderFilterTab, paymentFilter, dispatchTimeFilter, selectedDistrict, searchQuery]);

  // Status Counts for filter tabs
  const statusCounts = useMemo(() => {
    return {
      all: activeOrders.length,
      pending: activeOrders.filter((o) => o.status === 'pending').length,
      confirmed: activeOrders.filter((o) => o.status === 'confirmed').length,
      packing: activeOrders.filter((o) => o.status === 'in_packing').length,
      dispatched: activeOrders.filter((o) => o.status === 'dispatched').length,
      delivered: activeOrders.filter((o) => o.status === 'delivered').length,
      trash: trashedOrders.length,
    };
  }, [activeOrders, trashedOrders]);

  // Operational status update (Confirm, Packing, Dispatched, Delivered)
  const handleUpdateStatus = async (ord: Order, newStatus: OrderStatus) => {
    try {
      setActionLoadingId(ord.orderId);
      setErrorMsg(null);

      if (newStatus === 'dispatched') {
        const handled = await tryInventoryDispatch(ord.orderId, newStatus);
        if (handled) {
          setOrders((prev) => prev.map((o) => (o.orderId === ord.orderId ? { ...o, status: newStatus } : o)));
          setSuccessMsg(`ऑर्डर #${ord.orderId} की स्थिति '${newStatus}' अपडेट हो गई।`);
          setTimeout(() => setSuccessMsg(null), 3000);
          return;
        }
      }

      const englishNotes = document.documentElement.dataset.appLanguage === 'en';
      let statusMsg = '';
      if (newStatus === 'confirmed') statusMsg = englishNotes ? 'Order confirmed. Delivery preparation is underway.' : 'ऑर्डर की पुष्टि हुई। डिलीवरी की तैयारी जारी है।';
      else if (newStatus === 'in_packing') statusMsg = englishNotes ? (ord.billingVersion===2 ? 'Product packing is underway.' : 'Dry ice and thermocol packing is underway.') : (ord.billingVersion===2 ? 'प्रोडक्ट की पैकिंग जारी है।' : 'ड्राई आइस और थर्मोकोल की पैकिंग जारी है।');
      else if (newStatus === 'dispatched') statusMsg = englishNotes ? 'Dry ice was handed over to the bus / transporter.' : 'ड्राई आइस बस / ट्रांसपोर्टर को सौंप दी गई है।';
      else if (newStatus === 'delivered') statusMsg = englishNotes ? 'Order delivered successfully.' : 'ऑर्डर सफलतापूर्वक पहुँच गया।';

      const batch = writeBatch(db);
      const orderRef = resolvedOrderRef(ord.orderId);
      batch.update(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      if (ord.trackingToken) {
        const trackRef = resolvedTrackingRef(ord.trackingToken);
        batch.update(trackRef, {
          status: newStatus,
          lastStatusUpdate: statusMsg,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.orderId === ord.orderId ? { ...o, status: newStatus } : o))
      );

      setSuccessMsg(`ऑर्डर #${ord.orderId} की स्थिति '${newStatus}' अपडेट हो गई।`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Status update error:', err);
      setErrorMsg('स्थिति अपडेट करने में त्रुटि: ' + (err.message || 'Error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Payment status toggle
  const handleTogglePayment = async (ord: Order) => {
    if (ord.paymentStatus === 'payment_verified' && !window.confirm('Mark this order as unpaid?')) return;
    try {
      setActionLoadingId(ord.orderId);
      setErrorMsg(null);
      const nextPaymentStatus: PaymentStatus = 
        ord.paymentStatus === 'payment_verified' ? 'pending_verification' : 'payment_verified';

      const batch = writeBatch(db);
      const orderRef = resolvedOrderRef(ord.orderId);
      batch.update(orderRef, {
        paymentStatus: nextPaymentStatus,
        updatedAt: serverTimestamp(),
      });

      if (ord.trackingToken) {
        const trackRef = resolvedTrackingRef(ord.trackingToken);
        batch.update(trackRef, {
          paymentStatus: nextPaymentStatus,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      setOrders((prev) =>
        prev.map((o) => (o.orderId === ord.orderId ? { ...o, paymentStatus: nextPaymentStatus } : o))
      );

      setSuccessMsg(`ऑर्डर #${ord.orderId} पेमेंट: ${nextPaymentStatus === 'payment_verified' ? 'वेरीफाइड (Paid)' : 'पेंडिंग (Pending)'}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Payment toggle error:', err);
      setErrorMsg('पेमेंट स्थिति अपडेट करने में त्रुटि: ' + (err.message || 'Error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Move Order to Trash (Soft Delete)
  const handleMoveToTrash = async (ord: Order) => {
    try {
      setActionLoadingId(ord.orderId);
      const orderRef = resolvedOrderRef(ord.orderId);
      await updateDoc(orderRef, {
        isTrash: true,
        trashedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setOrders((prev) =>
        prev.map((o) => (o.orderId === ord.orderId ? { ...o, isTrash: true } : o))
      );

      setOrderToTrash(null);
      setOpenMenuOrderId(null);
      setSuccessMsg(`ऑर्डर #${ord.orderId} को ट्रैश में स्थानांतरित किया गया।`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Move to trash error:', err);
      setErrorMsg('ऑर्डर ट्रैश करने में त्रुटि: ' + (err.message || 'Error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Restore Order from Trash
  const handleRestoreOrder = async (ord: Order) => {
    try {
      setActionLoadingId(ord.orderId);
      const orderRef = resolvedOrderRef(ord.orderId);
      await updateDoc(orderRef, {
        isTrash: false,
        trashedAt: null,
        updatedAt: serverTimestamp(),
      });

      setOrders((prev) =>
        prev.map((o) => (o.orderId === ord.orderId ? { ...o, isTrash: false } : o))
      );

      setSuccessMsg(`ऑर्डर #${ord.orderId} को सफलतापूर्वक रीस्टोर कर दिया गया।`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Restore order error:', err);
      setErrorMsg('ऑर्डर रीस्टोर करने में त्रुटि: ' + (err.message || 'Error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Save new owner-entered order
  const handleCreateOwnerOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = newCustomerName.trim();
    const phone = newCustomerPhone.replace(/[^0-9]/g, '').slice(-10);
    const city = newCity.trim();
    const parsedQty = parseFloat(newQuantityInput);

    if (!name || name.length < 2) {
      setErrorMsg('कृपया ग्राहक का नाम दर्ज करें (कम से कम 2 अक्षर)।');
      return;
    }
    if (!phone || phone.length < 10) {
      setErrorMsg('कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।');
      return;
    }
    if (!city || city.length < 2) {
      setErrorMsg('कृपया शहर दर्ज करें।');
      return;
    }
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMsg('कृपया सही मात्रा (KG) दर्ज करें (शून्य से अधिक)।');
      return;
    }

    try {
      setSavingNewOrder(true);

      const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const generatedOrderId = `ADI-${dateSegment}-${randomSuffix}`;
      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
      const generatedTrackingToken = `${generatedOrderId}_${generatedPin}`;

      const cleanOrderPhone = phone.replace(/[^0-9]/g, '').slice(-10);
      const userSnap = cleanOrderPhone.length === 10 ? await getDocs(collection(db, 'users')) : null;
      const customerUser = userSnap?.docs.find((userDoc) => String(userDoc.data().phone || '').replace(/[^0-9]/g, '').slice(-10) === cleanOrderPhone);
      const customerType = customerUser?.data().customerType === 'wholesale' ? 'wholesale' : 'retail';
      const bookedDryIceRate = customerType === 'wholesale' ? rates.wholesaleRate : rates.dryIceRate;
      if (typeof bookedDryIceRate !== 'number' || bookedDryIceRate <= 0) throw new Error('Owner must set the wholesale rate first.');
      const slotId = dispatchSlots.find((item) => item.label === newDispatchTiming)?.id || 'tomorrow_morning';
      const slot = slotId.endsWith('morning') ? 'morning' : 'evening';
      const dispatchDate = slotId.startsWith('tomorrow') ? addIstDays(istDateKey(), 1) : istDateKey();
      const unitRate = bookedDryIceRate + rates.thermocolRate + (rates.transportRate || 0);
      const dryIceSubtotal = Math.round(parsedQty * bookedDryIceRate * 100) / 100;
      const thermocolSubtotal = Math.round(parsedQty * rates.thermocolRate * 100) / 100;
      const totalAmount = Math.round(parsedQty * unitRate * 100) / 100;

      const batch = writeBatch(db);

      const orderRef = doc(db, 'orders', generatedOrderId);
      const orderData: Order = {
        orderId: generatedOrderId,
        trackingToken: generatedTrackingToken,
        trackingPin: generatedPin,
        customerName: name,
        customerPhone: phone,
        district: city,
        address: city,
        city: city,
        quantityKg: parsedQty,
        dispatchTiming: formatDispatchDate(dispatchDate, slot, 'hi'),
        dispatchDate,
        slot,
        customerType,
        calculatedTotal: totalAmount,
        customerTotal: totalAmount,
        amountChanged: false,
        thermocolIncluded: true,
        testOrder: newTestOrder,
        productName: 'ड्राई आइस (Dry Ice)',
        dryIcePricePerKg: bookedDryIceRate,
        dryIceSubtotal,
        thermocolPricePerKg: rates.thermocolRate,
        thermocolSubtotal,
        transportPrice: rates.transportRate || 0,
        totalAmount,
        status: 'pending',
        paymentStatus: 'pending_verification',
        paymentMethod: 'manual_verification',
        paymentNotes: newOwnerNotes.trim() || (document.documentElement.dataset.appLanguage === 'en' ? 'New owner entry' : 'मालिक द्वारा नई एंट्री'),
        userId: 'owner_manual_entry',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const trackingRef = doc(db, 'order_tracking', generatedTrackingToken);
      const trackingData = {
        orderId: generatedOrderId,
        trackingToken: generatedTrackingToken,
        status: 'pending',
        productName: 'ड्राई आइस (Dry Ice)',
        quantityKg: parsedQty,
        district: city,
        dispatchTiming: formatDispatchDate(dispatchDate, slot, 'hi'),
        dispatchDate,
        slot,
        paymentStatus: 'pending_verification',
        lastStatusUpdate: document.documentElement.dataset.appLanguage === 'en' ? 'Order entered by owner.' : 'मालिक द्वारा ऑर्डर दर्ज किया गया।',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      batch.set(orderRef, orderData);
      batch.set(trackingRef, trackingData);

      await batch.commit();

      // Add to local state
      setOrders((prev) => [orderData, ...prev]);

      setNewOrderSuccess({ orderId: generatedOrderId, pin: generatedPin });
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCity('');
      setNewQuantityInput('10');
      setNewOwnerNotes('');
      setNewTestOrder(false);
      setCustomerSearchQuery('');
    } catch (err: any) {
      console.error('Owner order creation error:', err);
      setErrorMsg('ऑर्डर सेव करने में त्रुटि: ' + (err.message || 'Error'));
    } finally {
      setSavingNewOrder(false);
    }
  };

  // Save updated rates and capacity
  const handleSaveRates = async () => {
    try {
      setSavingRates(true);
      setErrorMsg(null);
      await saveCurrentRates({
        dryIceRate: Number(editDryIceRate),
        thermocolRate: Number(editThermocolRate),
        transportRate: 0,
        wholesaleRate: editWholesaleRate > 0 ? Number(editWholesaleRate) : 0,
      });
      const newCap = Number(editCapacity) || 500;
      setDailyCapacity(newCap);
      localStorage.setItem('ankur_dryice_daily_capacity', String(newCap));
      setIsRateModalOpen(false);
      setSuccessMsg(`दरें और क्षमता सफलतापूर्वक अपडेट की गईं: दर ₹${Number(editDryIceRate) + Number(editThermocolRate)}/kg | क्षमता: ${newCap} KG`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg('दरें सहेजने में त्रुटि: ' + (err.message || 'Error'));
    } finally {
      setSavingRates(false);
    }
  };

  // Insights analytics computation from actual active orders
  const insightsData = useMemo(() => {
    const todayStr = getTodayISTDateStr();
    const todayDate = new Date();

    const filtered = reportingOrders.filter((ord) => {
      const parts = getOrderISTDate(ord);
      if (!parts) return false;

      if (insightsTimeFilter === 'all') return true;

      if (insightsTimeFilter === 'today') {
        return parts.dateStr === todayStr;
      }

      if (insightsTimeFilter === 'custom') {
        if (!customFromDate && !customToDate) return true;
        if (customFromDate && parts.dateStr < customFromDate) return false;
        if (customToDate && parts.dateStr > customToDate) return false;
        return true;
      }

      let days = 7;
      if (insightsTimeFilter === '10d') days = 10;
      else if (insightsTimeFilter === '15d') days = 15;
      else if (insightsTimeFilter === '30d') days = 30;

      const diffDays = (todayDate.getTime() - parts.timestampMs) / (1000 * 3600 * 24);
      return diffDays <= days && diffDays >= -1;
    });

    const totalOrders = filtered.length;
    const totalKg = Math.round(filtered.reduce((sum, o) => sum + (Number(o.quantityKg) || 0), 0) * 10) / 10;
    const totalOrderValue = Math.round(filtered.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0));
    
    // Separate verified payment received from booked value
    const paymentReceived = Math.round(filtered
      .filter((o) => o.paymentStatus === 'payment_verified')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0));

    const paymentPending = Math.round(filtered
      .filter((o) => o.paymentStatus !== 'payment_verified')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0));

    const pendingOrdersCount = filtered.filter((o) => o.status === 'pending').length;
    const confirmedOrdersCount = filtered.filter((o) => o.status === 'confirmed').length;
    const dispatchedOrdersCount = filtered.filter((o) => o.status === 'dispatched').length;
    const deliveredOrdersCount = filtered.filter((o) => o.status === 'delivered').length;

    const avgKgPerOrder = totalOrders > 0 ? (totalKg / totalOrders).toFixed(1) : '0';
    const avgOrderValue = totalOrders > 0 ? Math.round(totalOrderValue / totalOrders) : 0;

    // Day-wise aggregation: Date | Orders | KG | Order Value | Payment Received
    const dayMap = new Map<string, { date: string; orders: number; kg: number; value: number; paid: number }>();

    filtered.forEach((ord) => {
      const parts = getOrderISTDate(ord);
      const dStr = parts?.dateStr || 'अज्ञात';
      const entry = dayMap.get(dStr) || { date: dStr, orders: 0, kg: 0, value: 0, paid: 0 };
      entry.orders += 1;
      entry.kg += Number(ord.quantityKg) || 0;
      entry.value += Number(ord.totalAmount) || 0;
      if (ord.paymentStatus === 'payment_verified') {
        entry.paid += Number(ord.totalAmount) || 0;
      }
      dayMap.set(dStr, entry);
    });

    const dayBreakdown = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    // District breakdown
    const districtMap = new Map<string, { district: string; orders: number; kg: number }>();
    filtered.forEach((ord) => {
      const dist = ord.district || ord.city || 'अन्य';
      const item = districtMap.get(dist) || { district: dist, orders: 0, kg: 0 };
      item.orders += 1;
      item.kg += Number(ord.quantityKg) || 0;
      districtMap.set(dist, item);
    });
    const districtBreakdown = Array.from(districtMap.values()).sort((a, b) => b.kg - a.kg);

    // Dispatch Slot breakdown
    const slotMap = new Map<string, number>();
    filtered.forEach((ord) => {
      const slot = ord.dispatchTiming || 'अज्ञात';
      slotMap.set(slot, (slotMap.get(slot) || 0) + 1);
    });
    const slotBreakdown = Array.from(slotMap.entries()).map(([slot, count]) => ({ slot, count }));

    return {
      totalOrders,
      totalKg,
      totalOrderValue,
      paymentReceived,
      paymentPending,
      pendingOrdersCount,
      confirmedOrdersCount,
      dispatchedOrdersCount,
      deliveredOrdersCount,
      avgKgPerOrder,
      avgOrderValue,
      dayBreakdown,
      districtBreakdown,
      slotBreakdown,
    };
  }, [reportingOrders, insightsTimeFilter, customFromDate, customToDate]);

  // Not the owner: the Owner Dashboard is never shown. Access is decided by the
  // verified owner Google account (and enforced again by firestore.rules).
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-3">
        <SignInScreen
          title="ओनर डैशबोर्ड सिर्फ़ मालिक के लिए है"
          subtitle={currentUser ? 'इस Google अकाउंट को ओनर एक्सेस नहीं है। मालिक के अकाउंट से लॉगिन करें।' : 'मालिक के Google अकाउंट से साइन इन करें।'}
        />
        {onGoToOrder && (
          <button type="button" onClick={onGoToOrder} className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold cursor-pointer">
            ग्राहक ऐप पर लौटें
          </button>
        )}
      </div>
    );
  }

  // Live calculation for New Entry form
  const newEntryQty = parseFloat(newQuantityInput) || 0;
  const newEntryUnitRate = rates.dryIceRate + rates.thermocolRate + (rates.transportRate || 0);
  const newEntryTotalAmount = Math.round(newEntryQty * newEntryUnitRate * 100) / 100;

  return (
    <div className="ankur-owner-dashboard max-w-5xl mx-auto py-3 px-3 sm:px-6 text-slate-900 min-h-screen">
      
      {/* 1. TOP HEADER */}
      <div className="ankur-owner-masthead flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-bold mb-0.5">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>अंकुर सिंह — मालिक डैशबोर्ड</span>
          </div>
          <span className="ankur-owner-kicker">BUSINESS COMMAND CENTER</span>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
            Ankur Dryice and Events
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
            <span>अधिकृत: <strong className="font-mono text-slate-700">{ADMIN_EMAIL}</strong></span>
            <button
              onClick={() => { setEditCapacity(dailyCapacity); setIsRateModalOpen(true); }}
              className="text-sky-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Settings className="w-3 h-3 text-sky-600" />
              <span>दर: ₹{rates.dryIceRate + rates.thermocolRate}/kg (बदलें)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          {onGoToOrder && (
            <button
              onClick={onGoToOrder}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="ग्राहक बुकिंग फ़ॉर्म पर जाएं"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Customer Form</span>
            </button>
          )}

          <button
            onClick={fetchAllOrders}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 cursor-pointer disabled:opacity-50"
            title="ऑर्डर रिफ्रेश करें"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          <button
            onClick={() => signOutUser()}
            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="लॉगआउट करें"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Logout</span>
          </button>
        </div>
      </div>


      {/* 3. NAVIGATION TABS: 3 PER LINE (2 ROWS TOTAL) */}
      <nav aria-label="मालिक डैशबोर्ड के सभी सेक्शन" className="ankur-owner-nav grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 border-b border-slate-200 pb-2.5">
        <button
          onClick={() => setActiveSection('new-entry')}
          className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'new-entry'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>New Entry</span>
        </button>

        <button
          onClick={() => setActiveSection('orders')}
          className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'orders'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5 shrink-0" />
          <span>Orders ({activeOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('insights')}
          className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'insights'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 shrink-0" />
          <span>इनसाइट्स</span>
        </button>

        <button
          onClick={() => setActiveSection('expenses')}
          className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'expenses'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>खर्च</span>
        </button>

        <button
          onClick={() => setActiveSection('users')}
          className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'users'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>Users</span>
        </button>

        <button
          onClick={() => setActiveSection('storefront')}
          className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'storefront'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Store className="w-3.5 h-3.5 shrink-0" />
          <span>स्टोर / थीम</span>
        </button>

        <button
          onClick={() => setActiveSection('ai-chat')}
          className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-sm font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'ai-chat'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span>AI चैट</span>
        </button>
      </nav>

      {/* Alerts */}
      {errorMsg && (
        <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Low Stock / Daily Capacity Warning Banner */}
      {todayTotalKg >= dailyCapacity * 0.75 && (
        <div className={`mb-3 p-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-xs ${
          todayTotalKg >= dailyCapacity
            ? 'bg-rose-50 border-rose-300 text-rose-900 animate-pulse'
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 shrink-0 ${todayTotalKg >= dailyCapacity ? 'text-rose-600' : 'text-amber-600'}`} />
            <div>
              <span className="block">
                {todayTotalKg >= dailyCapacity ? '⚠️ स्टॉक समाप्त / क्षमता सीमा पार (Low Stock / Capacity Reached):' : '⚠️ स्टॉक / क्षमता चेतावनी (Capacity Alert):'}
              </span>
              <span className="text-xs font-normal opacity-95">
                आज की कुल ड्राई आइस बुकिंग <strong>{todayTotalKg} KG</strong> हो चुकी है (निर्धारित दैनिक क्षमता: <strong>{dailyCapacity} KG</strong> का {Math.round((todayTotalKg / dailyCapacity) * 100)}%)। कृपया नया स्टॉक सुनिश्चित करें।
              </span>
            </div>
          </div>
        </div>
      )}

      {csvError && <p role="alert" className="text-sm text-red-700 p-3">{csvError}</p>}
      {/* PHASE A: read-only 30-day owner overview. No extra Firestore queries. */}
      {activeSection === 'orders' && (
        <section aria-label="पिछले 30 दिन का ऑर्डर सारांश" className="ankur-owner-overview mb-4 border border-slate-200 rounded-2xl bg-sky-50/60 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">पिछले 30 दिन · ओनर ओवरव्यू</h3>
            <button type="button" onClick={() => { void handleOrdersCsv(); }} disabled={csvBusy || loading || !!errorMsg || activeOrders.length === 0}
              className="px-3 py-1.5 rounded-lg bg-sky-700 text-white text-xs font-bold disabled:opacity-50">
              {csvBusy ? 'CSV तैयार हो रही है…' : 'सभी ऑर्डर CSV सेव / शेयर'}
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-600" role="status">ऑर्डर का सारांश लोड हो रहा है…</p>
          ) : errorMsg ? (
            <p className="text-sm text-rose-700" role="alert">ऑर्डर लोड नहीं हुए, सारांश उपलब्ध नहीं है।</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['ऑर्डर', ownerOverview.recentOrders.toLocaleString('en-IN')],
                  ['पेंडिंग', ownerOverview.pendingOrders.toLocaleString('en-IN')],
                  ['Dispatched', ownerOverview.dispatchedOrders.toLocaleString('en-IN')],
                  ['अनुमानित ऑर्डर मूल्य', `₹${ownerOverview.estimatedOrderValue.toLocaleString('en-IN')}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white border border-slate-200 p-2.5">
                    <p className="text-[11px] text-slate-500 font-semibold">{label}</p>
                    <p className="text-base font-black text-slate-900 tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-600">सिर्फ पिछले 30 दिन के गैर-ट्रैश ऑर्डर। अनुमानित मूल्य में रद्द ऑर्डर शामिल नहीं; यह प्राप्त भुगतान नहीं है।
                {ownerOverview.undatedOrders > 0 ? ` ${ownerOverview.undatedOrders} बिना तारीख वाले ऑर्डर इस सारांश में नहीं जोड़े गए।` : ''}
              </p>
              {ownerOverview.recentOrders === 0 && <p className="text-xs text-slate-600">इस अवधि में कोई ऑर्डर नहीं मिला।</p>}
            </>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION A: नई एंट्री (OWNER-ONLY ORDER ENTRY FORM) */}
      {/* ========================================================================= */}
      {activeSection === 'new-entry' && (
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-sky-600" />
                <span>मालिक द्वारा नई ऑर्डर एंट्री</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                फोन या सीधे संपर्क से प्राप्त ग्राहक का ऑर्डर यहाँ दर्ज करें।
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">लागू दर</span>
              <span className="text-xs font-mono font-bold text-sky-700">₹{newEntryUnitRate}/kg</span>
            </div>
          </div>

          {newOrderSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ऑर्डर सफलतापूर्वक सेव हो गया!</span>
              </div>
              <div className="font-mono text-slate-800">
                ऑर्डर ID: <strong>{newOrderSuccess.orderId}</strong> &bull; पिन: <strong>{newOrderSuccess.pin}</strong>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onGoToTrack(newOrderSuccess.orderId, newOrderSuccess.pin)}
                  className="text-sky-700 font-bold hover:underline"
                >
                  ट्रैकिंग देखें &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => setNewOrderSuccess(null)}
                  className="text-slate-500 hover:underline"
                >
                  नई एंट्री करें
                </button>
              </div>
            </div>
          )}

          {/* Customer Lookup & Contact Picker */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                <span>सहेजे गए ग्राहक खोजें</span>
              </span>
              <button
                type="button"
                onClick={handlePickContact}
                className="text-xs font-semibold text-sky-700 hover:text-sky-900 bg-white border border-sky-200 hover:bg-sky-50 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="डिवाइस के फोन कॉन्टैक्ट से चुनें"
              >
                <span>📱 फोन कॉन्टैक्ट</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="नाम, मोबाइल या शहर से पुराने ग्राहक खोजें..."
                value={customerSearchQuery}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />

              {showCustomerDropdown && matchingCustomers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {matchingCustomers.map((cust) => (
                    <div
                      key={cust.phone}
                      onClick={() => {
                        setNewCustomerName(cust.name);
                        setNewCustomerPhone(cust.phone);
                        if (cust.city) setNewCity(cust.city);
                        setShowCustomerDropdown(false);
                        setCustomerSearchQuery('');
                      }}
                      className="p-2.5 hover:bg-sky-50 cursor-pointer text-xs flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-slate-900 block">{cust.name}</strong>
                        <span className="text-[11px] font-mono text-slate-500">{cust.phone} &bull; {cust.city || 'शहर नहीं'}</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {cust.orderCount} ऑर्डर
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleCreateOwnerOrder} className="space-y-3">
            {/* Customer Name */}
            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                ग्राहक का नाम <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="उदा. राहुल शर्मा"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                मोबाइल नंबर (10 अंक) <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="उदा. 9876543210"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* शहर (City) */}
            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                शहर <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="उदा. लखनऊ, कानपुर, गोरखपुर, वाराणसी"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Custom Quantity Input (decimals allowed, no preset buttons) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-800">
                  ड्राई आइस की मात्रा (KG) <span className="text-rose-500">*</span>
                </label>
                <span className="font-mono font-bold text-sky-700 text-xs sm:text-sm">
                  {newEntryQty > 0 ? `${newEntryQty} KG` : 'मात्रा लिखें'}
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                required
                value={newQuantityInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = val.split('.');
                  if (parts.length > 2) return;
                  setNewQuantityInput(val);
                }}
                placeholder="उदा. 2, 7, 10, 15, 27.5 या 50"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                कस्टम मात्रा दर्ज करें (दशमलव स्वीकार्य है)।
              </p>
            </div>

            {/* Dispatch Slot */}
            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                डिस्पैच स्लॉट (IST) <span className="text-rose-500">*</span>
              </label>
              <select
                value={newDispatchTiming}
                onChange={(e) => setNewDispatchTiming(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              >
                {dispatchSlots.map((s) => (
                  <option key={s.id} value={s.label} disabled={s.disabled}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Automatic Total Calculation */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>ड्राई आइस ({newEntryQty} kg × ₹{rates.dryIceRate}):</span>
                <span className="font-mono font-semibold">₹{Math.round(newEntryQty * rates.dryIceRate * 100) / 100}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>थर्मोकोल पैकिंग ({newEntryQty} kg × ₹{rates.thermocolRate}):</span>
                <span className="font-mono font-semibold">₹{Math.round(newEntryQty * rates.thermocolRate * 100) / 100}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1 border-t border-sky-200 text-slate-900 font-bold">
                <span>कुल देय राशि:</span>
                <span className="text-base font-black font-mono text-emerald-700">₹{newEntryTotalAmount}</span>
              </div>
            </div>

            {/* Owner-only Notes */}
            <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
              <input type="checkbox" checked={newTestOrder} onChange={(e) => setNewTestOrder(e.target.checked)} /> Test order — exclude from reports
            </label>

            {/* Owner-only Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                मालिक नोट्स (Owner Notes - वैकल्पिक)
              </label>
              <textarea
                rows={2}
                value={newOwnerNotes}
                onChange={(e) => setNewOwnerNotes(e.target.value)}
                placeholder="उदा. बस डिपो से रिसीव करेंगे / टोकन नंबर 4"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingNewOrder}
              className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingNewOrder ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>ऑर्डर सेव हो रहा है...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>ऑर्डर सेव करें (₹{newEntryTotalAmount})</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: AI Chat */}
      {/* ========================================================================= */}
      {activeSection === 'ai-chat' && (
        <div className="max-w-xl mx-auto">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-sky-600" />
            AI चैट - ऑर्डर इनसाइट्स
          </h3>
          <AIChat
            context={JSON.stringify({
              todayDate: todayISTStr,
              totalActiveOrders: reportingOrders.length,
              todayOrdersCount: todayTotalOrders,
              todayTotalKg: todayTotalKg,
              todayTotalValue: todayTotalValue,
              todayPendingOrders: todayPendingOrders,
              todayPaymentReceived: todayPaymentReceived,
              todayPaymentPending: todayPaymentPending,
              dailyCapacity: dailyCapacity,
              statusCounts: statusCounts,
              todayOrders: todayActiveOrders.slice(0, 30).map((o) => ({
                orderId: o.orderId,
                customerName: o.customerName,
                customerPhone: o.customerPhone,
                district: o.district || o.city || '',
                quantityKg: o.quantityKg,
                dispatchTiming: o.dispatchTiming,
                status: o.status,
                paymentStatus: o.paymentStatus,
                totalAmount: o.totalAmount,
              })),
              recentOrders: reportingOrders.slice(0, 30).map((o) => ({
                orderId: o.orderId,
                customerName: o.customerName,
                customerPhone: o.customerPhone,
                district: o.district || o.city || '',
                quantityKg: o.quantityKg,
                dispatchTiming: o.dispatchTiming,
                status: o.status,
                paymentStatus: o.paymentStatus,
                totalAmount: o.totalAmount,
                date: getOrderISTDate(o)?.dateStr || '',
              }))
            })}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: ऑर्डर (DISPATCH SLOT DEFAULT VIEW & ALL ORDERS MANAGEMENT) */}
      {/* ========================================================================= */}
      {activeSection === 'orders' && (
        <div className="space-y-3">
          {ordersViewMode === 'slot' ? (
            /* ========================================================= */
            /* 1. DISPATCH SLOT DEFAULT SELECTION VIEW                   */
            /* ========================================================= */
            <div className="space-y-3">
              {/* 4 Dispatch Slot Buttons in 2x2 layout with real Firebase counts */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Today Morning */}
                <button
                  type="button"
                  onClick={() => setSelectedDispatchSlot('today_morning')}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedDispatchSlot === 'today_morning'
                      ? 'bg-sky-500 border-sky-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Today Morning</span>
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      selectedDispatchSlot === 'today_morning' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700'
                    }`}>
                      {slotCounts.today_morning}
                    </span>
                  </div>
                  <span className={`text-[10px] ${selectedDispatchSlot === 'today_morning' ? 'text-white' : 'text-slate-400'}`}>
                    Subah (6 AM–12 PM)
                  </span>
                </button>

                {/* Today Evening */}
                <button
                  type="button"
                  onClick={() => setSelectedDispatchSlot('today_evening')}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedDispatchSlot === 'today_evening'
                      ? 'bg-sky-500 border-sky-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Sunset className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Today Evening</span>
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      selectedDispatchSlot === 'today_evening' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700'
                    }`}>
                      {slotCounts.today_evening}
                    </span>
                  </div>
                  <span className={`text-[10px] ${selectedDispatchSlot === 'today_evening' ? 'text-white' : 'text-slate-400'}`}>
                    Shaam (12 PM–10 PM)
                  </span>
                </button>

                {/* Tomorrow Morning */}
                <button
                  type="button"
                  onClick={() => setSelectedDispatchSlot('tomorrow_morning')}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedDispatchSlot === 'tomorrow_morning'
                      ? 'bg-sky-500 border-sky-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Sun className="w-4 h-4 text-yellow-500 shrink-0" />
                      <span>Tomorrow Morning</span>
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      selectedDispatchSlot === 'tomorrow_morning' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700'
                    }`}>
                      {slotCounts.tomorrow_morning}
                    </span>
                  </div>
                  <span className={`text-[10px] ${selectedDispatchSlot === 'tomorrow_morning' ? 'text-white' : 'text-slate-400'}`}>
                    Tomorrow morning (6 AM–12 PM)
                  </span>
                </button>

                {/* Tomorrow Evening */}
                <button
                  type="button"
                  onClick={() => setSelectedDispatchSlot('tomorrow_evening')}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    selectedDispatchSlot === 'tomorrow_evening'
                      ? 'bg-sky-500 border-sky-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Tomorrow Evening</span>
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      selectedDispatchSlot === 'tomorrow_evening' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700'
                    }`}>
                      {slotCounts.tomorrow_evening}
                    </span>
                  </div>
                  <span className={`text-[10px] ${selectedDispatchSlot === 'tomorrow_evening' ? 'text-white' : 'text-slate-400'}`}>
                    Tomorrow evening (12 PM–10 PM)
                  </span>
                </button>
              </div>

              <button type="button" onClick={() => setSelectedDispatchSlot('old_overdue')} className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-bold ${selectedDispatchSlot === 'old_overdue' ? 'bg-amber-700 text-white border-amber-800' : 'bg-amber-50 text-amber-950 border-amber-300'}`}>
                <span>Old / Overdue</span><span>{slotCounts.old_overdue}</span>
              </button>

              {/* 5th Button: सभी ऑर्डर */}
              <button
                type="button"
                onClick={() => setOrdersViewMode('all')}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-400" />
                  <span>सभी ऑर्डर</span>
                </div>
                <span className="font-mono bg-slate-800 text-sky-300 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                  {activeOrders.length} कुल ऑर्डर &rarr;
                </span>
              </button>

              {/* Selected Slot Orders List */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">
                    चयनित स्लॉट के ऑर्डर ({slotOrders.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {selectedDispatchSlot === 'today_morning' && 'आज सुबह'}
                    {selectedDispatchSlot === 'today_evening' && 'आज शाम'}
                    {selectedDispatchSlot === 'tomorrow_morning' && 'कल सुबह'}
                    {selectedDispatchSlot === 'tomorrow_evening' && 'कल शाम'}
                    {selectedDispatchSlot === 'old_overdue' && 'Old / Overdue'}
                  </span>
                </div>

                {slotOrders.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                    इस डिस्पैच स्लॉट में कोई ऑर्डर नहीं है।
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
                    {slotOrders.map((ord) => {
                      const districtOnly = ord.district || ord.city || 'उत्तर प्रदेश';
                      const isPaid = ord.paymentStatus === 'payment_verified';
                      const isActionLoading = actionLoadingId === ord.orderId;

                      return (
                        <div
                          key={ord.orderId}
                          className={`bg-white border rounded-xl p-2.5 sm:p-3 shadow-2xs transition-all space-y-1.5 ${
                            ord.isTrash ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200 hover:border-sky-300'
                          }`}
                        >
                          {/* 1. TOP ROW: #46YX | PIN: XXXXXX | ⋮ */}
                          <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100 text-xs">
                            <div className="flex items-center gap-1 min-w-0">
                              <span
                                title={`Order #${ord.orderId}`}
                                className="font-mono font-bold text-slate-700 text-xs truncate hover:text-sky-700 cursor-pointer"
                              >
                                #{getShortOrderId(ord.orderId)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono text-[10px] bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                                PIN: {ord.trackingPin}
                              </span>

                              {/* Three-dot menu */}
                              <div className="relative">
                                <button
                                  onClick={() => setOpenMenuOrderId(openMenuOrderId === ord.orderId ? null : ord.orderId)}
                                  className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                  title="अधिक विकल्प"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {openMenuOrderId === ord.orderId && (
                                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                                    {ord.isTrash ? (
                                      <button
                                        onClick={() => handleRestoreOrder(ord)}
                                        className="w-full px-3 py-1.5 text-left text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5 font-semibold cursor-pointer"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Restore Order</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setOrderToTrash(ord);
                                          setOpenMenuOrderId(null);
                                        }}
                                        className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 font-semibold cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Delete Order</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        onGoToTrack(ord.orderId, ord.trackingPin);
                                        setOpenMenuOrderId(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer font-medium"
                                    >
                                      <Package className="w-3.5 h-3.5 text-slate-500" />
                                      <span>ट्रैकिंग देखें</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 2. COMPACT PAYMENT ROW */}
                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[10px] text-slate-500 font-medium">Payment:</span>
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                    : 'bg-amber-50 text-amber-700 border border-amber-300'
                                }`}
                              >
                                {isPaid ? 'Paid' : 'Pending'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!isPaid && !ord.isTrash && (
                                <a
                                  href={`https://wa.me/91${ord.customerPhone.slice(-10)}?text=${encodeURIComponent(
                                    `नमस्ते ${ord.customerName}, अंकुर ड्राई आइस से आपके ऑर्डर #${ord.orderId} (कुल राशि: ₹${ord.totalAmount}) के भुगतान की पुष्टि के लिए कृपया पेमेंट का स्क्रीनशॉट यहाँ भेजें।`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                  title="ग्राहक से WhatsApp पर स्क्रीनशॉट मांगें"
                                >
                                  <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>स्क्रीनशॉट मांगें</span>
                                </a>
                              )}

                              <button
                                disabled={isActionLoading}
                                onClick={() => handleTogglePayment(ord)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                                  isPaid
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                }`}
                              >
                                <CreditCard className="w-2.5 h-2.5" />
                                <span>{isPaid ? 'Mark Unpaid' : 'Mark Paid'}</span>
                              </button>
                            </div>
                          </div>

                          {/* 3. COMPACT STATUS BUTTONS — UNIFORM SINGLE ROW */}
                          {!ord.isTrash && (
                            <div className="grid grid-cols-4 min-[370px]:grid-cols-4 gap-1">
                              <button
                                disabled={isActionLoading || ord.status === 'confirmed'}
                                onClick={() => handleUpdateStatus(ord, 'confirmed')}
                                className={`py-0.5 sm:py-1 px-0.5 sm:px-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-0.5 truncate ${
                                  ord.status === 'confirmed'
                                    ? 'bg-sky-500 border-sky-600 text-white shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-sky-50 hover:border-sky-300'
                                }`}
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                                <span className="truncate">Confirm</span>
                              </button>

                              <button
                                disabled={isActionLoading || ord.status === 'in_packing'}
                                onClick={() => handleUpdateStatus(ord, 'in_packing')}
                                className={`py-0.5 sm:py-1 px-0.5 sm:px-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-0.5 truncate ${
                                  ord.status === 'in_packing'
                                    ? 'bg-blue-600 border-blue-700 text-white shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300'
                                }`}
                              >
                                <PackageCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                                <span className="truncate">Packing</span>
                              </button>

                              <button
                                disabled={isActionLoading || ord.status === 'dispatched'}
                                onClick={() => handleUpdateStatus(ord, 'dispatched')}
                                className={`py-0.5 sm:py-1 px-0.5 sm:px-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-0.5 truncate ${
                                  ord.status === 'dispatched'
                                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300'
                                }`}
                              >
                                <Truck className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                                <span className="truncate">Dispatch</span>
                              </button>

                              <button
                                disabled={isActionLoading || ord.status === 'delivered'}
                                onClick={() => handleUpdateStatus(ord, 'delivered')}
                                className={`py-0.5 sm:py-1 px-0.5 sm:px-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-0.5 truncate ${
                                  ord.status === 'delivered'
                                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                                }`}
                              >
                                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                                <span className="truncate">Deliver</span>
                              </button>
                            </div>
                          )}

                          {/* 4. CUSTOMER DETAILS — TWO COMPACT COLUMNS */}
                          <div className="ankur-order-card-details bg-slate-50 border border-slate-300 rounded-lg p-1 sm:p-1.5 text-xs text-slate-900">
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                              <div className="min-w-0 break-words">
                                <span className="text-slate-800 text-[10px] font-semibold">ग्राहक: </span>
                                <span className="font-bold text-slate-900 text-xs sm:text-sm break-words">{ord.customerName}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-800 text-[10px] font-semibold">मात्रा: </span>
                                <span className="font-mono font-bold text-sky-700 text-xs sm:text-sm">{quantityText(ord)}</span>
                              </div>

                              <div className="min-w-0 break-words">
                                <span className="text-slate-800 text-[10px] font-semibold">जिला: </span>
                                <span className="font-semibold text-slate-700 text-xs">{districtOnly}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-800 text-[10px] font-semibold">कुल राशि: </span>
                                <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">₹{ord.totalAmount}</span>
                                {ord.amountChanged === true && <span className="ml-1 rounded bg-orange-100 px-1 text-[9px] font-bold text-orange-900" title={`Calculated ₹${ord.calculatedTotal} · customer ₹${ord.customerTotal}`}>Rate changed · ₹{ord.calculatedTotal} → ₹{ord.customerTotal}</span>}
                              </div>

                              <div className="col-span-2 flex items-center justify-between pt-0.5 border-t border-slate-200/50 text-[10px] text-slate-800">
                                <span className="font-semibold">Dispatch:</span>
                                <span className="font-semibold text-slate-800 truncate">{orderDispatchLabel(ord)}</span>
                              </div>
                            </div>
                          </div>

                          {/* 5. NOTE */}
                          {ord.paymentNotes && ord.paymentNotes.trim().length > 0 && (
                            <div
                              onClick={() => setExpandedNoteId(expandedNoteId === ord.orderId ? null : ord.orderId)}
                              className={`text-[10px] text-slate-600 bg-amber-50/60 px-2 py-0.5 rounded border border-amber-200/70 cursor-pointer ${
                                expandedNoteId === ord.orderId ? 'break-words' : 'truncate'
                              }`}
                              title={ord.paymentNotes}
                            >
                              <span className="text-amber-800 font-semibold">नोट: </span>
                              <span>{ord.paymentNotes}</span>
                            </div>
                          )}
                          <OwnerOrderContactActions order={ord} />

                          {ord.isTrash && (
                            <div className="p-1 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-[10px] text-rose-700">
                              <span className="flex items-center gap-1 truncate">
                                <Trash2 className="w-3 h-3 text-rose-500 shrink-0" />
                                <span className="truncate">ऑर्डर ट्रैश में है</span>
                              </span>
                              <button
                                disabled={isActionLoading}
                                onClick={() => handleRestoreOrder(ord)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Restore</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* 2. ALL ORDERS COMPLETE MANAGEMENT VIEW                    */
            /* ========================================================= */
            <div className="space-y-3">
              {/* Back to Slot View */}
              <button
                type="button"
                onClick={() => setOrdersViewMode('slot')}
                className="text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>&larr; डिस्पैच स्लॉट व्यू पर वापस जाएं</span>
              </button>

              {/* Compact Real Totals Summary */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                <button
                  type="button"
                  onClick={() => setOrderFilterTab('all')}
                  className={`border rounded-xl p-2 text-center shadow-2xs transition-all cursor-pointer ${
                    orderFilterTab === 'all'
                      ? 'bg-sky-500 border-sky-600 text-white'
                      : 'bg-white border-slate-200 hover:border-sky-400 text-slate-800'
                  }`}
                >
                  <span className={`text-[10px] block ${orderFilterTab === 'all' ? 'text-white' : 'text-slate-400'}`}>Total</span>
                  <span className={`font-mono font-bold text-xs ${orderFilterTab === 'all' ? 'text-white' : 'text-slate-900'}`}>{activeOrders.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilterTab('pending')}
                  className={`border rounded-xl p-2 text-center shadow-2xs transition-all cursor-pointer ${
                    orderFilterTab === 'pending'
                      ? 'bg-amber-500 border-amber-600 text-white'
                      : 'bg-amber-50/80 border-amber-200 hover:border-amber-400 text-amber-900'
                  }`}
                >
                  <span className={`text-[10px] block ${orderFilterTab === 'pending' ? 'text-white' : 'text-amber-700'}`}>Pending</span>
                  <span className={`font-mono font-bold text-xs ${orderFilterTab === 'pending' ? 'text-white' : 'text-amber-800'}`}>{statusCounts.pending}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilterTab('confirmed')}
                  className={`border rounded-xl p-2 text-center shadow-2xs transition-all cursor-pointer ${
                    orderFilterTab === 'confirmed'
                      ? 'bg-sky-500 border-sky-600 text-white'
                      : 'bg-sky-50/80 border-sky-200 hover:border-sky-400 text-sky-900'
                  }`}
                >
                  <span className={`text-[10px] block ${orderFilterTab === 'confirmed' ? 'text-white' : 'text-sky-700'}`}>Confirmed</span>
                  <span className={`font-mono font-bold text-xs ${orderFilterTab === 'confirmed' ? 'text-white' : 'text-sky-800'}`}>{statusCounts.confirmed}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilterTab('packing')}
                  className={`border rounded-xl p-2 text-center shadow-2xs transition-all cursor-pointer ${
                    orderFilterTab === 'packing'
                      ? 'bg-blue-600 border-blue-700 text-white'
                      : 'bg-blue-50/80 border-blue-200 hover:border-blue-400 text-blue-900'
                  }`}
                >
                  <span className={`text-[10px] block ${orderFilterTab === 'packing' ? 'text-white' : 'text-blue-700'}`}>Packing</span>
                  <span className={`font-mono font-bold text-xs ${orderFilterTab === 'packing' ? 'text-white' : 'text-blue-800'}`}>{statusCounts.packing}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilterTab('dispatched')}
                  className={`border rounded-xl p-2 text-center shadow-2xs transition-all cursor-pointer ${
                    orderFilterTab === 'dispatched'
                      ? 'bg-indigo-600 border-indigo-700 text-white'
                      : 'bg-indigo-50/80 border-indigo-200 hover:border-indigo-400 text-indigo-900'
                  }`}
                >
                  <span className={`text-[10px] block ${orderFilterTab === 'dispatched' ? 'text-white' : 'text-indigo-700'}`}>Dispatched</span>
                  <span className={`font-mono font-bold text-xs ${orderFilterTab === 'dispatched' ? 'text-white' : 'text-indigo-800'}`}>{statusCounts.dispatched}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilterTab('delivered')}
                  className={`border rounded-xl p-2 text-center shadow-2xs transition-all cursor-pointer ${
                    orderFilterTab === 'delivered'
                      ? 'bg-emerald-600 border-emerald-700 text-white'
                      : 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-400 text-emerald-900'
                  }`}
                >
                  <span className={`text-[10px] block ${orderFilterTab === 'delivered' ? 'text-white' : 'text-emerald-700'}`}>Delivered</span>
                  <span className={`font-mono font-bold text-xs ${orderFilterTab === 'delivered' ? 'text-white' : 'text-emerald-800'}`}>{statusCounts.delivered}</span>
                </button>
              </div>

              {/* Status Filters (2 per row) */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderFilterTab('all')}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      orderFilterTab === 'all'
                        ? 'bg-sky-500 border-sky-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>सभी ({statusCounts.all})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderFilterTab('trash')}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      orderFilterTab === 'trash'
                        ? 'bg-slate-900 border-slate-950 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Trash ({statusCounts.trash})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderFilterTab('pending')}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      orderFilterTab === 'pending'
                        ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending ({statusCounts.pending})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderFilterTab('confirmed')}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      orderFilterTab === 'confirmed'
                        ? 'bg-sky-500 border-sky-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-sky-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmed ({statusCounts.confirmed})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderFilterTab('packing')}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      orderFilterTab === 'packing'
                        ? 'bg-blue-600 border-blue-700 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Packing ({statusCounts.packing})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderFilterTab('dispatched')}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      orderFilterTab === 'dispatched'
                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Dispatched ({statusCounts.dispatched})</span>
                  </button>
                </div>

                {/* Payment Filter */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-600">Payment:</span>
                  <div className="flex gap-1.5 flex-1">
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('all')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        paymentFilter === 'all'
                          ? 'bg-sky-500 border-sky-600 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      सभी Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('pending')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        paymentFilter === 'pending'
                          ? 'bg-amber-500 border-amber-600 text-white'
                          : 'bg-white border-amber-200 text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      Payment Pending
                    </button>
                  </div>
                </div>
              </div>

              {/* Search + District Controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ऑर्डर ID, ग्राहक नाम, मोबाइल या जिला..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="w-full sm:w-52 shrink-0">
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      aria-label="जिला या शहर चुनें"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 shadow-2xs cursor-pointer appearance-none"
                    >
                      <option value="all">
                        सभी जिले / शहर {availableDistricts.length > 0 ? `(${availableDistricts.length})` : ''}
                      </option>
                      {availableDistricts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* All Orders List */}
              {displayedOrders.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  {orderFilterTab === 'trash' ? 'ट्रैश में कोई ऑर्डर नहीं है।' : 'कोई ऑर्डर नहीं मिला।'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
                  {displayedOrders.map((ord) => {
                    const districtOnly = ord.district || ord.city || 'उत्तर प्रदेश';
                    const isPaid = ord.paymentStatus === 'payment_verified';
                    const isActionLoading = actionLoadingId === ord.orderId;

                    return (
                      <div
                        key={ord.orderId}
                        className={`bg-white border rounded-xl p-2.5 sm:p-3 shadow-2xs transition-all space-y-1.5 ${
                          ord.isTrash ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        {/* 1. TOP ROW: #46YX | PIN: XXXXXX | ⋮ */}
                        <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100 text-xs">
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              title={`Order #${ord.orderId}`}
                              className="font-mono font-bold text-slate-700 text-xs truncate hover:text-sky-700 cursor-pointer"
                            >
                              #{getShortOrderId(ord.orderId)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono text-[10px] bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                              PIN: {ord.trackingPin}
                            </span>

                            {/* Three-dot menu */}
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuOrderId(openMenuOrderId === ord.orderId ? null : ord.orderId)}
                                className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                title="अधिक विकल्प"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {openMenuOrderId === ord.orderId && (
                                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                                  {ord.isTrash ? (
                                    <button
                                      onClick={() => handleRestoreOrder(ord)}
                                      className="w-full px-3 py-1.5 text-left text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5 font-semibold cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Restore Order</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setOrderToTrash(ord);
                                        setOpenMenuOrderId(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 font-semibold cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Delete Order</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      onGoToTrack(ord.orderId, ord.trackingPin);
                                      setOpenMenuOrderId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer font-medium"
                                  >
                                    <Package className="w-3.5 h-3.5 text-slate-500" />
                                    <span>ट्रैकिंग देखें</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. COMPACT PAYMENT ROW */}
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] text-slate-500 font-medium">Payment:</span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                  : 'bg-amber-50 text-amber-700 border border-amber-300'
                              }`}
                            >
                              {isPaid ? 'Paid' : 'Pending'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!isPaid && !ord.isTrash && (
                              <a
                                href={`https://wa.me/91${ord.customerPhone.slice(-10)}?text=${encodeURIComponent(
                                  `नमस्ते ${ord.customerName}, अंकुर ड्राई आइस से आपके ऑर्डर #${ord.orderId} (कुल राशि: ₹${ord.totalAmount}) के भुगतान की पुष्टि के लिए कृपया पेमेंट का स्क्रीनशॉट यहाँ भेजें।`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                title="ग्राहक से WhatsApp पर स्क्रीनशॉट मांगें"
                              >
                                <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />
                                <span>स्क्रीनशॉट मांगें</span>
                              </a>
                            )}

                            <button
                              disabled={isActionLoading}
                              onClick={() => handleTogglePayment(ord)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                                isPaid
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                              }`}
                            >
                              <CreditCard className="w-2.5 h-2.5" />
                              <span>{isPaid ? 'Mark Unpaid' : 'Mark Paid'}</span>
                            </button>
                          </div>
                        </div>

                        {/* 3. COMPACT STATUS BUTTONS — UNIFORM SINGLE ROW */}
                        {!ord.isTrash && (
                          <div className="grid grid-cols-4 min-[370px]:grid-cols-4 gap-1">
                            <button
                              disabled={isActionLoading || ord.status === 'confirmed'}
                              onClick={() => handleUpdateStatus(ord, 'confirmed')}
                              className={`py-0.5 px-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-0.5 truncate flex-1 ${
                                ord.status === 'confirmed'
                                  ? 'bg-sky-500 border-sky-600 text-white shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-sky-50 hover:border-sky-300'
                              }`}
                            >
                              <span className="truncate">Confirm</span>
                            </button>

                            <button
                              disabled={isActionLoading || ord.status === 'in_packing'}
                              onClick={() => handleUpdateStatus(ord, 'in_packing')}
                              className={`py-0.5 px-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-0.5 truncate flex-1 ${
                                ord.status === 'in_packing'
                                  ? 'bg-blue-600 border-blue-700 text-white shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300'
                              }`}
                            >
                              <span className="truncate">Packing</span>
                            </button>

                            <button
                              disabled={isActionLoading || ord.status === 'dispatched'}
                              onClick={() => handleUpdateStatus(ord, 'dispatched')}
                              className={`py-0.5 px-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-0.5 truncate flex-1 ${
                                ord.status === 'dispatched'
                                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300'
                              }`}
                            >
                              <span className="truncate">Dispatch</span>
                            </button>

                            <button
                              disabled={isActionLoading || ord.status === 'delivered'}
                              onClick={() => handleUpdateStatus(ord, 'delivered')}
                              className={`py-0.5 px-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-0.5 truncate flex-1 ${
                                ord.status === 'delivered'
                                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                              }`}
                            >
                              <span className="truncate">Deliver</span>
                            </button>
                          </div>
                        )}

                        {/* 4. CUSTOMER DETAILS — TWO COMPACT COLUMNS */}
                        <div className="ankur-order-card-details bg-slate-50 border border-slate-300 rounded-lg p-1 sm:p-1.5 text-xs text-slate-900">
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                            <div className="truncate">
                              <span className="text-slate-700 text-[10px] font-semibold">ग्राहक: </span>
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">{ord.customerName}</span>
                            </div>
                            <div className="text-right truncate">
                              <span className="text-slate-700 text-[10px] font-semibold">मात्रा: </span>
                              <span className="font-mono font-bold text-sky-700 text-xs sm:text-sm">{quantityText(ord)}</span>
                            </div>

                            <div className="truncate">
                              <span className="text-slate-700 text-[10px] font-semibold">जिला: </span>
                              <span className="font-semibold text-slate-700 text-xs">{districtOnly}</span>
                            </div>
                            <div className="text-right truncate">
                              <span className="text-slate-700 text-[10px] font-semibold">कुल राशि: </span>
                              <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">₹{ord.totalAmount}</span>
                              {ord.amountChanged === true && <span className="ml-1 rounded bg-orange-100 px-1 text-[9px] font-bold text-orange-900" title={`Calculated ₹${ord.calculatedTotal} · customer ₹${ord.customerTotal}`}>Rate changed · ₹{ord.calculatedTotal} → ₹{ord.customerTotal}</span>}
                            </div>

                            <div className="col-span-2 flex items-center justify-between pt-0.5 border-t border-slate-200/50 text-[10px] text-slate-800">
                              <span className="font-semibold">Dispatch:</span>
                              <span className="font-semibold text-slate-800 truncate">{orderDispatchLabel(ord)}</span>
                            </div>
                          </div>
                        </div>

                        {/* 5. NOTE */}
                        {ord.paymentNotes && ord.paymentNotes.trim().length > 0 && (
                          <div
                            onClick={() => setExpandedNoteId(expandedNoteId === ord.orderId ? null : ord.orderId)}
                            className={`text-[10px] text-slate-600 bg-amber-50/60 px-2 py-0.5 rounded border border-amber-200/70 cursor-pointer ${
                              expandedNoteId === ord.orderId ? 'break-words' : 'truncate'
                            }`}
                            title={ord.paymentNotes}
                          >
                            <span className="text-amber-800 font-semibold">नोट: </span>
                            <span>{ord.paymentNotes}</span>
                          </div>
                        )}
                          <OwnerOrderContactActions order={ord} />

                          {ord.isTrash && (
                          <div className="p-1 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-[10px] text-rose-700">
                            <span className="flex items-center gap-1 truncate">
                              <Trash2 className="w-3 h-3 text-rose-500 shrink-0" />
                              <span className="truncate">ऑर्डर ट्रैश में है</span>
                            </span>
                            <button
                              disabled={isActionLoading}
                              onClick={() => handleRestoreOrder(ord)}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Restore</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION D: खर्च (EXPENSES) */}
      {/* ========================================================================= */}
      {activeSection === 'expenses' && <ExpensesView />}

      {/* ========================================================================= */}
      {/* SECTION E: यूज़र्स (USER MANAGEMENT) */}
      {/* ========================================================================= */}
      {activeSection === 'users' && <>
            <StaffOrderAccessManager />
            <DailyWinnerOwnerControls />
            <UserManagement />
          </>}

      {/* SECTION F: स्टोर / थीम / होम (STOREFRONT MANAGEMENT) */}
      {activeSection === 'storefront' && <OwnerStorefrontManager />}

      {/* ========================================================================= */}
      {/* SECTION C: इनसाइट्स (INSIGHTS & BUSINESS ANALYTICS) */}
      {/* ========================================================================= */}
      {activeSection === 'insights' && (
        <div id="ankur-owner-report-panel" className="space-y-4">
          <button type="button" onClick={() => { void handleOrdersCsv(); }} disabled={csvBusy || loading || !!errorMsg || activeOrders.length === 0}
            className="bg-sky-700 text-white p-2 rounded disabled:opacity-50">
            ऑर्डर CSV (Excel / Sheets)
          </button>
          <button 
            onClick={async () => {
              setMonthlyReportBusy(true);
              setMonthlyReportError('');
              try {
                await generateMonthlyPDF(reportingOrders, expenses);
              } catch (err) {
                const detail = err instanceof Error ? err.message : String(err);
                setMonthlyReportError('रिपोर्ट डाउनलोड नहीं हुई: ' + detail);
              } finally {
                setMonthlyReportBusy(false);
              }
            }}
            disabled={monthlyReportBusy}
            className="bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold disabled:opacity-60"
          >
            {monthlyReportBusy ? 'मासिक रिपोर्ट बन रही है...' : 'मासिक रिपोर्ट PDF डाउनलोड / शेयर करें'}
          </button>
          <p className="text-xs text-slate-600">रिपोर्ट की अवधि: हर महीने 15 तारीख से अगले महीने की 14 तारीख। Android पर PDF सेव/शेयर का विकल्प खुलेगा।</p>
          {monthlyReportError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{monthlyReportError}</p>}
          {/* ========================================================================= */}
          {/* 1. आज का विवरण (TODAY'S SUMMARY - REAL FIREBASE IST CALENDAR DAY DATA) */}
          {/* ========================================================================= */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-600" />
                <span>आज का विवरण</span>
                <span className="text-[11px] font-normal text-slate-500">(Today IST &bull; 12 AM–11:59 PM)</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                {todayISTStr}
              </span>
            </div>

            {/* 2-Column Mobile Layout:
                [ Today's Orders ]       [ Today's Total KG ]
                [ Order Value ]          [ Payment Received ]
                [ Payment Pending ]      [ Pending Orders ]
            */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {/* [ Today's Orders ] */}
              <button
                type="button"
                onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('all'); setPaymentFilter('all'); }}
                className="bg-white border border-slate-200 hover:border-sky-400 rounded-xl p-2.5 sm:p-3 shadow-2xs text-left transition-all cursor-pointer"
              >
                <span className="text-[10px] sm:text-xs text-slate-500 font-semibold block">Today's Orders</span>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-0.5">{todayTotalOrders}</div>
                <span className="text-[10px] text-slate-400 mt-0.5 block flex items-center justify-between">
                  <span>आज के कुल ऑर्डर</span>
                  <span className="text-sky-600 font-bold">&rarr;</span>
                </span>
              </button>

              {/* [ Today's Total KG ] */}
              <button
                type="button"
                onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('all'); setPaymentFilter('all'); }}
                className="bg-white border border-sky-200 hover:border-sky-400 rounded-xl p-2.5 sm:p-3 shadow-2xs bg-sky-50/20 text-left transition-all cursor-pointer"
              >
                <span className="text-[10px] sm:text-xs text-sky-700 font-semibold block">Today's Total KG</span>
                <div className="text-lg sm:text-xl font-bold font-mono text-sky-800 mt-0.5">{todayTotalKg} KG</div>
                <span className="text-[10px] text-sky-600/70 mt-0.5 block flex items-center justify-between">
                  <span>आज कुल मात्रा</span>
                  <span className="text-sky-600 font-bold">&rarr;</span>
                </span>
              </button>

              {/* [ Order Value ] */}
              <button
                type="button"
                onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('all'); setPaymentFilter('all'); }}
                className="bg-white border border-emerald-200 hover:border-emerald-400 rounded-xl p-2.5 sm:p-3 shadow-2xs bg-emerald-50/20 text-left transition-all cursor-pointer"
              >
                <span className="text-[10px] sm:text-xs text-emerald-700 font-semibold block">Order Value</span>
                <div className="text-lg sm:text-xl font-bold font-mono text-emerald-800 mt-0.5">₹{todayTotalValue}</div>
                <span className="text-[10px] text-emerald-600/70 mt-0.5 block flex items-center justify-between">
                  <span>कुल बुकिंग मूल्य</span>
                  <span className="text-emerald-600 font-bold">&rarr;</span>
                </span>
              </button>

              {/* [ Payment Received ] */}
              <button
                type="button"
                onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('all'); setPaymentFilter('all'); }}
                className="bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl p-2.5 sm:p-3 shadow-2xs bg-emerald-50/40 text-left transition-all cursor-pointer"
              >
                <span className="text-[10px] sm:text-xs text-emerald-800 font-semibold block">Payment Received</span>
                <div className="text-lg sm:text-xl font-bold font-mono text-emerald-900 mt-0.5">₹{todayPaymentReceived}</div>
                <span className="text-[10px] text-emerald-700/80 mt-0.5 block flex items-center justify-between">
                  <span>प्राप्त भुगतान (Verified)</span>
                  <span className="text-emerald-700 font-bold">&rarr;</span>
                </span>
              </button>

              {/* [ Payment Pending ] */}
              <button
                type="button"
                onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('all'); setPaymentFilter('pending'); }}
                className="bg-white border border-rose-200 hover:border-rose-400 rounded-xl p-2.5 sm:p-3 shadow-2xs bg-rose-50/20 text-left transition-all cursor-pointer"
              >
                <span className="text-[10px] sm:text-xs text-rose-700 font-semibold block">Payment Pending</span>
                <div className="text-lg sm:text-xl font-bold font-mono text-rose-800 mt-0.5">₹{todayPaymentPending}</div>
                <span className="text-[10px] text-rose-600/70 mt-0.5 block flex items-center justify-between">
                  <span>बकाया भुगतान (Payment Due)</span>
                  <span className="text-rose-600 font-bold">&rarr;</span>
                </span>
              </button>

              {/* [ Pending Orders ] */}
              <button
                type="button"
                onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('pending'); setPaymentFilter('all'); }}
                className="bg-white border border-amber-200 hover:border-amber-400 rounded-xl p-2.5 sm:p-3 shadow-2xs bg-amber-50/20 text-left transition-all cursor-pointer"
              >
                <span className="text-[10px] sm:text-xs text-amber-700 font-semibold block">Pending Orders</span>
                <div className="text-lg sm:text-xl font-bold font-mono text-amber-800 mt-0.5">{todayPendingOrders}</div>
                <span className="text-[10px] text-amber-600/70 mt-0.5 block flex items-center justify-between">
                  <span>पेंडिंग ऑर्डर</span>
                  <span className="text-amber-600 font-bold">&rarr;</span>
                </span>
              </button>
            </div>
          </div>

          {/* Time Filters */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'today', label: 'Today (आज)' },
                { id: '7d', label: '7 दिन' },
                { id: '10d', label: '10 दिन' },
                { id: '15d', label: '15 दिन' },
                { id: '30d', label: '30 दिन' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'कस्टम रेंज' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setInsightsTimeFilter(tf.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    insightsTimeFilter === tf.id
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {insightsTimeFilter === 'custom' && (
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 text-xs"
                />
                <span>से</span>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 text-xs"
                />
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('all'); setPaymentFilter('all'); }}
              className="bg-white border border-slate-200 hover:border-sky-400 rounded-xl p-3 shadow-2xs text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] text-slate-500 block">कुल ऑर्डर</span>
              <div className="text-xl font-bold font-mono text-slate-900">{insightsData.totalOrders}</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">औसत: {insightsData.avgKgPerOrder} KG/ऑर्डर</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('all'); setPaymentFilter('all'); }}
              className="bg-white border border-sky-200 hover:border-sky-400 rounded-xl p-3 shadow-2xs bg-sky-50/20 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] text-sky-700 block">कुल ड्राई आइस (KG)</span>
              <div className="text-xl font-bold font-mono text-sky-800">{insightsData.totalKg} KG</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">कुल बिकी मात्रा</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('all'); setPaymentFilter('all'); }}
              className="bg-white border border-emerald-200 hover:border-emerald-400 rounded-xl p-3 shadow-2xs bg-emerald-50/20 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] text-emerald-700 block">बुक किया गया मूल्य (₹)</span>
              <div className="text-xl font-bold font-mono text-emerald-800">₹{insightsData.totalOrderValue}</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">औसत: ₹{insightsData.avgOrderValue}/ऑर्डर</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('all'); setPaymentFilter('pending'); }}
              className="bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl p-3 shadow-2xs bg-emerald-50/40 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] text-emerald-800 block">प्राप्त भुगतान (Verified)</span>
              <div className="text-xl font-bold font-mono text-emerald-900">₹{insightsData.paymentReceived}</div>
              <span className="text-[10px] text-amber-700 mt-0.5 block">पेंडिंग (Due): ₹{insightsData.paymentPending}</span>
            </button>
          </div>

          {/* Operational Status Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              type="button"
              onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('pending'); setPaymentFilter('all'); }}
              className="bg-amber-50/60 border border-amber-200 hover:border-amber-400 rounded-xl p-2.5 text-left transition-all cursor-pointer"
            >
              <span className="text-amber-800 font-semibold block">पेंडिंग (Pending)</span>
              <div className="text-lg font-bold font-mono text-amber-900">{insightsData.pendingOrdersCount}</div>
            </button>

            <button
              type="button"
              onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('confirmed'); setPaymentFilter('all'); }}
              className="bg-sky-50/60 border border-sky-200 hover:border-sky-400 rounded-xl p-2.5 text-left transition-all cursor-pointer"
            >
              <span className="text-sky-800 font-semibold block">कन्फर्म (Confirmed)</span>
              <div className="text-lg font-bold font-mono text-sky-900">{insightsData.confirmedOrdersCount}</div>
            </button>

            <button
              type="button"
              onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('dispatched'); setPaymentFilter('all'); }}
              className="bg-indigo-50/60 border border-indigo-200 hover:border-indigo-400 rounded-xl p-2.5 text-left transition-all cursor-pointer"
            >
              <span className="text-indigo-800 font-semibold block">डिस्पैच (Dispatched)</span>
              <div className="text-lg font-bold font-mono text-indigo-900">{insightsData.dispatchedOrdersCount}</div>
            </button>

            <button
              type="button"
              onClick={() => { setActiveSection('orders'); setOrdersViewMode('all'); setOrderFilterTab('delivered'); setPaymentFilter('all'); }}
              className="bg-emerald-50/60 border border-emerald-200 hover:border-emerald-400 rounded-xl p-2.5 text-left transition-all cursor-pointer"
            >
              <span className="text-emerald-800 font-semibold block">डिलीवर (Delivered)</span>
              <div className="text-lg font-bold font-mono text-emerald-900">{insightsData.deliveredOrdersCount}</div>
            </button>
          </div>

          {/* Daily Trend Chart (Orders & Volume) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              <span>दैनिक मात्रा प्रवृत्ति (KG by Day)</span>
            </h4>

            {insightsData.dayBreakdown.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                इस समयावधि में कोई डेटा उपलब्ध नहीं है।
              </div>
            ) : (
              <div className="h-56 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...insightsData.dayBreakdown].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                      unit="kg"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2 rounded-lg text-xs space-y-1">
                              <div className="font-bold text-sky-300">{d.date}</div>
                              <div>मात्रा: <strong>{d.kg} KG</strong></div>
                              <div>ऑर्डर: <strong>{d.orders}</strong></div>
                              <div>बुकिंग: <strong>₹{d.value}</strong></div>
                              <div>प्राप्त: <strong>₹{d.paid}</strong></div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="kg" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Day-wise Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>दिन-वार विवरण (Date | Orders | KG | Order Value | Payment Received)</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-3 py-2">तारीख (Date)</th>
                    <th className="px-3 py-2">ऑर्डर संख्या</th>
                    <th className="px-3 py-2">कुल मात्रा (KG)</th>
                    <th className="px-3 py-2">कुल बुकिंग मूल्य</th>
                    <th className="px-3 py-2">प्राप्त भुगतान (Verified)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {insightsData.dayBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                        कोई रिकॉर्ड नहीं मिला।
                      </td>
                    </tr>
                  ) : (
                    insightsData.dayBreakdown.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-semibold text-slate-900">{row.date}</td>
                        <td className="px-3 py-2 font-mono">{row.orders}</td>
                        <td className="px-3 py-2 font-mono font-bold text-sky-700">{row.kg} KG</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">₹{row.value}</td>
                        <td className="px-3 py-2 font-mono font-bold text-emerald-700">₹{row.paid}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* District & Slot Breakdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* District-wise */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <h5 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                <span>जिला-वार वितरण (District-wise)</span>
              </h5>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {insightsData.districtBreakdown.slice(0, 6).map((item) => (
                  <div key={item.district} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-none">
                    <span className="text-slate-800 font-medium truncate">{item.district}</span>
                    <span className="font-mono text-sky-700 font-bold">{item.kg} KG ({item.orders})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dispatch-slot Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <h5 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>डिस्पैच स्लॉट विश्लेषण</span>
              </h5>
              <div className="space-y-1">
                {insightsData.slotBreakdown.map((item) => (
                  <button
                    key={item.slot}
                    type="button"
                    onClick={() => {
                      const foundSlot = dispatchSlots.find(s => s.label === item.slot);
                      if (foundSlot) {
                        setSelectedDispatchSlot(foundSlot.id as DispatchSlotKey);
                      } else {
                        if (item.slot.includes('आज सुबह')) setSelectedDispatchSlot('today_morning');
                        else if (item.slot.includes('आज शाम')) setSelectedDispatchSlot('today_evening');
                        else if (item.slot.includes('कल सुबह')) setSelectedDispatchSlot('tomorrow_morning');
                        else if (item.slot.includes('कल शाम')) setSelectedDispatchSlot('tomorrow_evening');
                      }
                      setOrdersViewMode('slot');
                      setActiveSection('orders');
                    }}
                    className="w-full flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-sky-50 border-b border-slate-100 last:border-none transition-colors cursor-pointer text-left group"
                  >
                    <span className="text-slate-800 font-medium truncate group-hover:text-sky-700 flex items-center gap-1">
                      <span>{item.slot}</span>
                      <span className="text-sky-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                    </span>
                    <span className="font-mono text-slate-900 font-bold bg-slate-100 group-hover:bg-sky-100 group-hover:text-sky-800 px-2 py-0.5 rounded-md">
                      {item.count} ऑर्डर
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE / TRASH CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {orderToTrash && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 text-center mb-1">
              ऑर्डर ट्रैश में स्थानांतरित करें?
            </h3>
            
            <p className="text-xs text-slate-600 text-center mb-4 leading-relaxed">
              ऑर्डर <strong>#{orderToTrash.orderId}</strong> ({orderToTrash.customerName}) को सामान्य सूची से हटाकर ट्रैश में रखा जाएगा। आप इसे कभी भी रीस्टोर कर सकते हैं।
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setOrderToTrash(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                onClick={() => handleMoveToTrash(orderToTrash)}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                हाँ, ट्रैश करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OWNER RATE SETTINGS MODAL */}
      {/* ========================================================================= */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-sky-600" />
                <span>ग्राहक दर नियंत्रण (Rate Control)</span>
              </h3>
              <button onClick={() => setIsRateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              यहाँ से बदली गई दरें केवल नए ऑर्डरों पर लागू होंगी। पुराने ऑर्डरों की बुक की गई राशि सुरक्षित रहेगी।
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ड्राई आइस दर (₹/KG):
                </label>
                <input
                  type="number"
                  min="1"
                  value={editDryIceRate}
                  onChange={(e) => setEditDryIceRate(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  थर्मोकोल पैकिंग दर (₹/KG):
                </label>
                <input
                  type="number"
                  min="0"
                  value={editThermocolRate}
                  onChange={(e) => setEditThermocolRate(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Wholesale Dry Ice Rate (₹/KG):</label>
                <input type="number" min="1" value={editWholesaleRate || ''} onChange={(e) => setEditWholesaleRate(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900" placeholder="Set owner-approved rate" />
                <p className="mt-1 text-[10px] text-slate-600">Wholesale booking stays unavailable until this owner-set rate is saved.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  दैनिक ड्राई आइस क्षमता (Daily Capacity KG):
                </label>
                <input
                  type="number"
                  min="10"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5 text-xs">
                <div className="flex justify-between text-slate-700 font-bold">
                  <span>ग्राहक के लिए कुल दर:</span>
                  <span className="font-mono text-sky-800">
                    ₹{Number(editDryIceRate) + Number(editThermocolRate)}/KG
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsRateModalOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                disabled={savingRates}
                onClick={handleSaveRates}
                className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {savingRates ? 'सेव हो रहा है...' : 'दरें सेव करें'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
