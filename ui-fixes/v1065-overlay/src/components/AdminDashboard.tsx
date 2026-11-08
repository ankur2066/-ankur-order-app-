Warning: truncated output (original token count: 39672)
Total output lines: 2939

import { StaffOrderAccessManager } from './StaffOrderAccessManager';
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
      setErrorMsg('कृपया 10 अंकों का मान्य मोबा…25672 tokens truncated…-left transition-all cursor-pointer"
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
