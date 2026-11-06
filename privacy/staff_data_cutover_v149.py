#!/usr/bin/env python3
"""Source-only staff client cutover. Apply AFTER v1.0.48 owner/staff overlays."""
from pathlib import Path
p=Path("src/components/StaffDashboard.tsx")
s=p.read_text(encoding="utf-8")
def once(old,new,label):
    global s
    assert s.count(old)==1,(label,s.count(old))
    s=s.replace(old,new,1)

once("import { subscribeOrderDocuments, orderRef as resolvedOrderRef, trackingRef as resolvedTrackingRef } from '../services/productOrders';\n","",'no raw order helper')
once("import React, { useState, useEffect, useMemo } from 'react';",
     "import React, { useState, useEffect, useMemo, useRef } from 'react';",'request cancellation ref')
start=s.index("import { \n  collection,")
end=s.index("} from 'firebase/firestore';",start)+len("} from 'firebase/firestore';")
s=s[:start]+"import { collection, onSnapshot } from 'firebase/firestore';"+s[end:]

once("  const canView = permissions ? permissions.viewOrders : true;",
     "  const canView = permissions?.viewOrders === true;",'fail closed for missing view permission')
once("  const canUpdate = permissions ? permissions.updateStatus : true;",
     "  const canUpdate = permissions?.updateStatus === true;",'fail closed for missing update permission')
start=s.index("  const [revealedContactOrderId, setRevealedContactOrderId]")
end=s.index("  const [loading, setLoading]",start)
contact="""  const [contact, setContact] = useState<{ key: string; phone: string } | null>(null);
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
          typeof data.phone !== 'string' || !/^\\+91[6-9][0-9]{9}$/.test(data.phone)) {
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
"""
s=s[:start]+contact+s[end:]

start=s.index("    const ordersCol = collection(db, 'orders');")
end=s.index("    return () => unsubscribe();",start)
s=s[:start]+"""    // Strictly staff-safe projection documents; never listen to raw orders.
    const ordersCol = collection(db, 'staffOrderViews');
    const unsubscribe = onSnapshot(
      ordersCol,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const view = docSnap.data();
          if ((view.sourceCollection !== 'orders' && view.sourceCollection !== 'product_orders') ||
              typeof view.orderId !== 'string') return null;
          return {
            orderId: view.orderId,
            sourceCollection: view.sourceCollection,
            customerName: view.customerName || '',
            city: view.city || '',
            district: view.city || '',
            address: '',
            productName: view.productName || 'Dry Ice',
            dispatchTiming: view.dispatchTiming || '',
            status: view.status,
            paymentStatus: view.paymentStatus || '',
            quantityKg: typeof view.quantityKg === 'number' ? view.quantityKg : 0,
            billingVersion: view.billingVersion === 2 ? 2 : undefined,
            billing: view.billingVersion === 2 ? {
              unit: view.quantityUnit || 'piece',
              quantityUnits: typeof view.quantityUnits === 'number' ? view.quantityUnits : 0
            } : undefined,
            createdAt: view.createdAt,
            updatedAt: view.updatedAt,
            selfPickup: view.selfPickup || undefined
          } as unknown as Order;
        }).filter((entry): entry is Order => entry !== null);
        list.sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
          return timeB - timeA;
        });
        setOrders(list);
        setLoading(false);
      },
      (error) => {
        setOrders([]);
        setLoading(false);
        try {
          handleFirestoreError(error, OperationType.LIST, 'staffOrderViews');
        } catch {
          setErrorMsg('अभी सुरक्षित स्टाफ ऑर्डर लोड नहीं हो सके। मालिक से संपर्क करें।');
        }
      }
    );
""" + s[end:]

start=s.index("      let statusMsg = '';")
end=s.index("      await batch.commit();",start)+len("      await batch.commit();")
s=s[:start]+"""      if (!user || !isAndroidAppCheckReady()) {
        throw Error('इस कार्य के लिए सत्यापित Android ऐप जरूरी है।');
      }
      if (!staffSource(ord)) throw Error('ऑर्डर का स्रोत सत्यापित नहीं है।');
      const fn = httpsCallable(getFunctions(getApp(), 'asia-southeast1'), 'ankurStaffUpdateOrderStatus');
      await fn({
        sourceCollection: staffSource(ord),
        orderId: ord.orderId,
        status: newStatus
      });""" + s[end:]

assert 'subscribeOrderDocuments' not in s
assert 'resolvedOrderRef' not in s and 'resolvedTrackingRef' not in s
assert 'writeBatch' not in s and 'serverTimestamp' not in s
assert 'ord.trackingToken' not in s
assert "collection(db, 'staffOrderViews')" in s
assert "ankurGetOneOrderContact" in s and "ankurStaffUpdateOrderStatus" in s
p.write_text(s,encoding='utf-8')
print('PASS: staff now subscribes to safe projections; status uses authenticated callable')
