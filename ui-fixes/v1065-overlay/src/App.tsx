import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BellRing, Loader2, ShieldCheck, X } from 'lucide-react';
import { Header } from './components/Header';
import { OrderForm } from './components/OrderForm';
import { OrderTrackingView } from './components/OrderTrackingView';
import { CustomerOrders } from './components/CustomerOrders';
import { AdminDashboard } from './components/AdminDashboard';
import { StaffDashboard } from './components/StaffDashboard';
import { BottomNav, type CustomerTab } from './components/customer/BottomNav';
import { CustomerHome } from './components/customer/CustomerHome';
import { CategoriesTab } from './components/customer/CategoriesTab';
import { ProfileTab } from './components/customer/ProfileTab';
import { NotificationSheet } from './components/customer/NotificationSheet';
import { NotificationToast } from './components/customer/NotificationToast';
import { BrandMark } from './components/customer/BrandMark';
import { DailyWinnerBanner } from './components/customer/DailyWinner';
import { FeatureHub } from './components/customer/FeatureHub';
import { DataFeaturePanel } from './components/customer/FeatureDataPanels';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AppUpdateNotice } from './components/AppUpdateNotice';
import { useAccess } from './hooks/useAccess';
import { useStorefrontProducts } from './hooks/useProducts';
import { useStorefrontSettings } from './hooks/useStorefrontSettings';
import { useOrderNotifications } from './hooks/useOrderNotifications';
import { useNotificationOpening } from './hooks/useNotificationOpening';
import { configureOrderPush, subscribeNewOrderPush, enableOrderPush } from './services/orderPush';
import { subscribeToRates, getLocalRates } from './data/rates';
import { BUSINESS_CALL_HREF, BUSINESS_WHATSAPP_BASE } from './data/products';
import type { Order, OrderTracking, ProductItem, PromoAction, RateSettings } from './types';

type Tab = CustomerTab | 'order' | 'track' | 'admin';

const SubPageBar: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div
    className="sticky top-0 z-40 c-card border-b b-line flex items-center gap-1 px-2"
    style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
  >
    <button type="button" onClick={onBack} className="focus-ring w-11 h-11 flex items-center justify-center rounded-full cursor-pointer" aria-label="वापस">
      <ArrowLeft className="w-5 h-5 t-main" />
    </button>
    <span className="text-[15px] font-black t-main">{title}</span>
  </div>
);

function AppShell() {
  const { language } = useLanguage();
  const { user: currentUser, access, ready } = useAccess();
  const role = access.role;
  const isFieldTeam = role === 'staff' || role === 'delivery';

  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [reorderData, setReorderData] = useState<Order | null>(null);
  const [activeTrackingId, setActiveTrackingId] = useState('');
  const [activeTrackingPin, setActiveTrackingPin] = useState('');
  const [trackBackTab, setTrackBackTab] = useState<Tab>('my-orders');
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTarget, setNotificationTarget] = useState<{orderId:string} | null>(null);
  const [rates, setRates] = useState<RateSettings>(getLocalRates());

  const { products, loading: productsLoading, error: productsError } = useStorefrontProducts();
  const { banners, winner } = useStorefrontSettings();
  const notifications = useOrderNotifications(currentUser, role === 'admin' || (isFieldTeam && access.permissions.viewOrders));

  useEffect(() => {
    const unsub = subscribeToRates((loaded) => setRates(loaded));
    return () => unsub();
  }, []);

  const openNotification = useNotificationOpening(ready,role,access.permissions.viewOrders,(destination) => {
    notifications.clearToast();
    if (destination.kind === 'test') {
      setNotificationMessage('यह जाँच वाला TEST संदेश है। परीक्षण order साफ किया गया है या कोई वास्तविक order बनाया ही नहीं गया था।');
      setNoticesOpen(true);
    } else if (destination.kind === 'owner' || destination.kind === 'staff') {
      setNotificationMessage('');
      setNotificationTarget({orderId:destination.orderId});
      setNoticesOpen(false);
      if (destination.kind === 'owner') setCurrentTab('admin');
    } else if (destination.kind === 'tracking') {
      setNotificationMessage('');
      setActiveTrackingId(destination.orderId);
      setActiveTrackingPin(destination.pin);
      setTrackBackTab('my-orders');
      setCurrentTab('track');
      setNoticesOpen(false);
    } else {
      setNotificationMessage(destination.kind === 'denied' ? 'इस order को देखने की अनुमति नहीं है।' : 'इस संदेश में वैध order number नहीं है।');
      setNoticesOpen(true);
    }
  });

  // Add Android background push; Firebase onSnapshot remains the in-app source of truth.
  useEffect(() => {
    if (!ready) return;
    void configureOrderPush(currentUser, role, access.permissions.viewOrders);
  }, [ready, currentUser?.uid, role, access.permissions.viewOrders]);

  // Owner lands on the Owner Dashboard when they sign in; anyone else can never stay on it.
  const previousRole = useRef<typeof role>(null);
  useEffect(() => {
    if (!ready) return;
    if (role === 'admin' && previousRole.current !== 'admin') setCurrentTab('admin');
    if (role !== 'admin' && currentTab === 'admin') setCurrentTab('home');
    previousRole.current = role;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, ready]);

  const handleOrderSuccess = (orderId: string, trackingPin: string) => {
    setActiveTrackingId(orderId);
    setActiveTrackingPin(trackingPin);
    // The real Firestore commit completed before this callback; guest customers can subscribe.
    void subscribeNewOrderPush(orderId, trackingPin);
  };

  const handleGoToTrack = (orderId: string, pin: string = '') => {
    setTrackBackTab(currentTab === 'admin' ? 'admin' : 'my-orders');
    setActiveTrackingId(orderId);
    setActiveTrackingPin(pin);
    setCurrentTab('track');
  };

  const handleBook = (product: ProductItem | null) => {
    setSelectedProduct(product);
    setReorderData(null);
    setCurrentTab('order');
  };

  useEffect(() => {
    const select = (event:Event) => {const id=(event as CustomEvent<string>).detail;const product=products.find(p=>p.id===id&&p.active);if(product)handleBook(product);};
    window.addEventListener('ankur-select-product',select);
    const track=(event:Event)=>{const r=(event as CustomEvent).detail;if(r?.orderId&&r?.trackingPin)handleGoToTrack(r.orderId,r.trackingPin);};
    window.addEventListener('ankur-track-order',track);
    const applyEstimate=(event:Event)=>{
      const kg=(event as CustomEvent<number>).detail;
      if(!Number.isInteger(kg)||kg<10||kg>5000)return;
      try{window.sessionStorage.setItem('ankur.pending.calculated.kg',String(kg));}
      catch{return;}
      setCurrentTab('home');
    };
    window.addEventListener('ankur-open-calculator-booking',applyEstimate);
    return()=>{
      window.removeEventListener('ankur-select-product',select);
      window.removeEventListener('ankur-track-order',track);
      window.removeEventListener('ankur-open-calculator-booking',applyEstimate);
    };
  },[products]);
  useEffect(()=>{const ref=new URLSearchParams(location.search).get('ref');if(ref&&/^[A-Za-z0-9_-]{3,128}$/.test(ref))localStorage.setItem('ankur.referrer',ref);},[]);
  const handleReorder = (pastOrder: Order) => {
    if (pastOrder.billingVersion === 2) {
      const p=products.find(p=>p.id===pastOrder.productId&&p.unitProduct);
      if(p) {setSelectedProduct(p);setReorderData(pastOrder);setCurrentTab('order');}
      else {setNotificationMessage('यह प्रोडक्ट अभी booking के लिए उपलब्ध नहीं है।');setNoticesOpen(true);}
      return;
    }
    setSelectedProduct(null);
    setReorderData(pastOrder);
    setCurrentTab('order');
  };

  const handleQuickReorderFromTracking = (tracking: OrderTracking) => {
    if (tracking.billingVersion === 2) {
      const p=products.find(p=>p.id===tracking.productId&&p.unitProduct);
      if(p) handleBook(p);else {setNotificationMessage('यह प्रोडक्ट अभी booking के लिए उपलब्ध नहीं है।');setNoticesOpen(true);}
      return;
    }
    const qty = tracking.quantityKg || 10;
    const partialOrder: Order = {
      orderId: tracking.orderId,
      trackingToken: tracking.trackingToken,
      trackingPin: '',
      customerName: '',
      customerPhone: '',
      district: tracking.district || '',
      address: tracking.district || '',
      quantityKg: qty,
      dispatchTiming: tracking.dispatchTiming,
      productName: tracking.productName || 'ड्राई आइस (Dry Ice)',
      dryIcePricePerKg: getLocalRates().dryIceRate,
      dryIceSubtotal: qty * getLocalRates().dryIceRate,
      thermocolPricePerKg: getLocalRates().thermocolRate,
      thermocolSubtotal: qty * getLocalRates().thermocolRate,
      totalAmount: qty * (getLocalRates().dryIceRate + getLocalRates().thermocolRate + (getLocalRates().transportRate || 0)),
      status: 'pending',
      paymentStatus: 'pending_verification',
      paymentMethod: 'paytm_business_upi',
      userId: currentUser?.uid || 'guest',
      createdAt: null,
      updatedAt: null,
    };
    setSelectedProduct(null);
    setReorderData(partialOrder);
    setCurrentTab('order');
  };

  const handlePromoAction = (action: PromoAction) => {
    if (action === 'order') handleBook(null);
    else if (action === 'categories') setCurrentTab('home');
    else if (action === 'call') window.location.href = BUSINESS_CALL_HREF;
    else if (action === 'whatsapp') window.open(BUSINESS_WHATSAPP_BASE, '_blank', 'noopener,noreferrer');
  };

  // ---- Loading splash while the sign-in state and role are being resolved ----
  if (!ready) {
    return (
      <div className="c-app min-h-screen flex flex-col items-center justify-center gap-3 t-brand" role="status" aria-live="polite">
        <BrandMark className="w-14 h-14" />
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs t-sub">{language === 'hi' ? 'लोड हो रहा है…' : 'Loading…'}</span>
      </div>
    );
  }

  // ---- Staff / delivery: locked to their dashboard (rules enforce this server-side) ----
  if (isFieldTeam) {
    return (
      <div className="min-h-screen min-w-0 overflow-x-hidden bg-white text-slate-900 flex flex-col font-sans">
        {notifications.toast && <NotificationToast team notice={notifications.toast} onOpenNotice={openNotification} onDismiss={notifications.clearToast} />}
        <Header currentTab="staff-dashboard" setCurrentTab={() => {}} currentUser={currentUser} userRole={role} unreadCount={notifications.unreadCount} onOpenNotifications={() => { setNoticesOpen(true); void enableOrderPush(); }} />
        <main className="flex-1 min-w-0 pb-8">
          {access.permissions.updateStatus && <DataFeaturePanel id="eta" user={currentUser} role={role}/>}
          <StaffDashboard currentUser={currentUser} userRole={role} permissions={access.permissions} notificationTarget={notificationTarget} onLogoutSuccess={() => setCurrentTab('home')} />
        </main>
        <NotificationSheet open={noticesOpen} notices={notifications.notices}
          onClose={() => setNoticesOpen(false)} onMarkAllRead={notifications.markAllRead} onOpenNotice={openNotification} message={notificationMessage} />
      </div>
    );
  }

  // ---- Customer app (and owner, who can also open the Owner Dashboard) ----
  const navActive: CustomerTab | null =
    currentTab === 'track' ? 'my-orders' : currentTab === 'order' || currentTab === 'admin' ? null : currentTab;

  const handleNavChange = (tab: CustomerTab) => {
    if (tab === 'categories' && currentTab !== 'categories') setSelectedCategory('all');
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden aqp-app c-app t-main font-sans relative">
      {/* In-app status toast (shown only while the app is open) */}
      {notifications.toast && <NotificationToast notice={notifications.toast} onOpenNotice={openNotification} onDismiss={notifications.clearToast} />}

      {currentTab === 'home' && (
        <CustomerHome
          products={products}
          productsLoading={productsLoading}
          productsError={productsError}
          rates={rates}
          banners={banners}
          winner={winner}
          unreadCount={notifications.unreadCount}
          onOpenNotifications={() => { setNoticesOpen(true); void enableOrderPush(); }}
          onBook={handleBook}
          onReorder={handleReorder}
          onPromoAction={handlePromoAction}
          bookingForm={(inlineProduct) => (
            <OrderForm
              currentUser={currentUser}
              onOrderSuccess={handleOrderSuccess}
              onGoToTrack={handleGoToTrack}
              onGoToMyOrders={() => setCurrentTab('my-orders')}
              selectedProduct={inlineProduct}
            />
          )}
        />
      )}

      {currentTab === 'home' && (
        <section className="c-app ankur-readable-customer-page max-w-lg mx-auto px-3 pb-4">
          <details className="c-card border b-line rounded-2xl p-4">
            <summary className="font-black">{language === 'hi' ? 'AI सुविधाएँ और सेवाएँ' : 'AI Features and Services'}</summary>
            <div className="mt-3"><DailyWinnerBanner currentUser={currentUser} /></div>
            <div className="mt-3"><FeatureHub currentUser={currentUser} role={role}
              allowed={['calculator','loyalty','catalog','partner','subscriptions','promotions','faq','rates','support','service-area','referral']} /></div>
          </details>
        </section>
      )}

      {currentTab === 'categories' && (
        <CategoriesTab
          products={products}
          loading={productsLoading}
          rates={rates}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          onBook={handleBook}
        />
      )}

      {currentTab === 'order' && (
        <div className="bg-white min-h-screen">
          <SubPageBar title={language === 'hi' ? 'ड्राई आइस बुकिंग' : 'Dry Ice Booking'} onBack={() => setCurrentTab('home')} />
          <OrderForm
            currentUser={currentUser}
            onOrderSuccess={handleOrderSuccess}
            onGoToTrack={handleGoToTrack}
            onGoToMyOrders={() => setCurrentTab('my-orders')}
            reorderData={reorderData}
            onClearReorder={() => setReorderData(null)}
            selectedProduct={selectedProduct}
            onClearProduct={() => {
              setSelectedProduct(null);
              setCurrentTab('home');
            }}
          />
        </div>
      )}

      {currentTab === 'track' && (
        <div className="bg-white min-h-screen page-with-bottom-nav">
          <SubPageBar title={language === 'hi' ? 'ऑर्डर ट्रैकिंग' : 'Order Tracking'} onBack={() => setCurrentTab(trackBackTab)} />
          <OrderTrackingView
            key={activeTrackingId + '_' + activeTrackingPin}
            initialOrderId={activeTrackingId}
            initialPin={activeTrackingPin}
            onQuickReorder={handleQuickReorderFromTracking}
          />
        </div>
      )}

      {currentTab === 'my-orders' && (
        <div className="bg-white min-h-screen page-with-bottom-nav" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <details><summary>Regular Supply</summary><FeatureHub currentUser={currentUser} role={role} initial="subscriptions" allowed={["subscriptions"]}/></details>
          <CustomerOrders
            currentUser={currentUser}
            onGoToTrack={handleGoToTrack}
            onGoToOrder={() => handleBook(null)}
            onReorder={handleReorder}
          />
        </div>
      )}

      {currentTab === 'ai-video' && <FeatureHub currentUser={currentUser} role={role} initial="video" allowed={['video']}/>}

      {currentTab === 'profile' && (
        <ProfileTab
          currentUser={currentUser}
          role={role}
          onOpenOwnerDashboard={() => setCurrentTab('admin')}
        />
      )}

      {currentTab === 'admin' && role === 'admin' && (
        <div className="owner-app min-h-screen">
          <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-3 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 py-2.5">
              <ShieldCheck className="w-4 h-4 text-sky-600" /> ओनर पैनल
            </span>
            <button type="button" onClick={() => setCurrentTab('home')} className="text-xs font-extrabold text-sky-700 py-2.5 px-2 cursor-pointer">
              ग्राहक ऐप देखें
            </button>
          </div>
          <AdminDashboard
            notificationTarget={notificationTarget}
            currentUser={currentUser}
            onGoToTrack={handleGoToTrack}
            onGoToOrder={() => setCurrentTab('home')}
          />
        </div>
      )}

      {currentTab !== 'admin' && currentTab !== 'order' && <BottomNav active={navActive} onChange={handleNavChange} isOwner={role === 'admin'} />}

      <NotificationSheet
        open={noticesOpen}
        notices={notifications.notices}
        onClose={() => setNoticesOpen(false)}
        onMarkAllRead={notifications.markAllRead}
        onOpenNotice={openNotification}
        message={notificationMessage}
      />

    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppUpdateNotice />
        <AppShell />
      </ThemeProvider>
    </LanguageProvider>
  );
}
