"""Stage unit-billing source after v1.0.32; no deployment or live data writes."""
from pathlib import Path
import shutil
root=Path('billing/templates')
# Seasonal customer storefront gate: owner products are never deleted.
Path('src/config').mkdir(parents=True,exist_ok=True)
shutil.copyfile('seasonal/catalogPolicy.template','src/config/seasonalCatalog.ts')
for source,target in [('unitBilling.template','src/billing/unitBilling.ts'),('catalogDrafts.template','src/billing/catalogDrafts.ts'),('productOrders.template','src/services/productOrders.ts'),('useUnitProducts.template','src/hooks/useUnitProducts.ts'),('UnitProductManager.template','src/components/UnitProductManager.tsx'),('UnitProductForm.template','src/components/UnitProductForm.tsx')]:
    p=Path(target);p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/source,p)
def replace(path,a,b,count=1):
    p=Path(path);s=p.read_text();assert s.count(a)==count,(path,a[:90],s.count(a),count);p.write_text(s.replace(a,b))

types='src/types.ts'
replace(types,'export interface Order {',"export interface Order {\n  billingVersion?: 2;\n  productId?: string;\n  billing?: import('./billing/unitBilling').BillSnapshot;")
replace(types,'export interface OrderTracking {',"export interface OrderTracking {\n  billingVersion?: 2;\n  productId?: string;\n  billing?: Pick<import('./billing/unitBilling').BillSnapshot,'unit'|'quantityUnits'>;")
replace(types,'export interface ProductItem {',"export interface ProductItem {\n  unitProduct?: import('./billing/unitBilling').UnitProduct;")
replace('src/data/catalog.ts',"  accessories: { label: 'एक्सेसरीज़' },","  accessories: { label: 'एक्सेसरीज़' },\n  pyro: { label: 'पायरो' },\n  event_effects: { label: 'इवेंट इफेक्ट्स' },")
replace('src/data/catalog.ts','  const r = applyProductRates(p, rates);','unused') if False else None
replace('src/data/catalog.ts','export function displayPricePerKg(p: ProductItem, base: RateSettings): number {','export function displayPricePerKg(p: ProductItem, base: RateSettings): number {\n  if (p.unitProduct) return p.unitProduct.unitPricePaise / 100;')
replace('src/components/customer/categoryIcons.tsx','PartyPopper, Package, Tag, LayoutGrid','PartyPopper, Package, Tag, LayoutGrid, Sparkles, Wind')
replace('src/components/customer/categoryIcons.tsx','  accessories: Package,','  accessories: Package,\n  pyro: Sparkles,\n  event_effects: Wind,')
replace('src/hooks/useProducts.ts',"import { INITIAL_PRODUCTS } from '../data/products';","import { INITIAL_PRODUCTS } from '../data/products';\nimport { useUnitProducts } from './useUnitProducts';\nimport { UNIT_LABELS } from '../billing/unitBilling';")
replace('src/hooks/useProducts.ts','export function useStorefrontProducts() {','export function useStorefrontProducts() {\n  const unit = useUnitProducts();')
replace('src/hooks/useProducts.ts','    products: sortProducts(products.filter((p) => p.active)),',"    products: sortProducts([...products.filter((p) => p.active), ...unit.products.map(p => ({id:p.id,name:p.name,hindiName:p.hindiName,category:p.category,active:p.active,unitProduct:p,unit:p.unit?UNIT_LABELS[p.unit]:'',ratePerKg:0,thermocolPerKg:0}))]),")

# Customer-facing catalogue and new-order picker offer only Dry Ice and Pyro.
# Saved orders, admin-only catalogue, prices and database remain unchanged.
replace('src/hooks/useProducts.ts',"import { UNIT_LABELS } from '../billing/unitBilling';","import { UNIT_LABELS } from '../billing/unitBilling';\nimport { isSeasonalPublicProduct } from '../config/seasonalCatalog';")
replace('src/hooks/useProducts.ts',"products: sortProducts([...products.filter((p) => p.active), ...unit.products.map(p =>", "products: sortProducts([...products.filter(isSeasonalPublicProduct), ...unit.products.filter(isSeasonalPublicProduct).map(p =>")
replace('src/components/customer/ProductCard.tsx',"import { CategoryIcon } from './categoryIcons';","import { CategoryIcon } from './categoryIcons';\nimport { rupees } from '../../billing/unitBilling';")
replace('src/components/customer/ProductCard.tsx','<p className="text-[10px] t-sub mt-1.5">थर्मोकोल पैकिंग सहित</p>',"<p className=\"text-[10px] t-sub mt-1.5\">{product.unitProduct ? (product.unitProduct.packingMode==='none'?'Packing charge नहीं':rupees(product.unitProduct.packingPricePaise)+' packing '+(product.unitProduct.packingMode==='per_order'?'एक बार':'प्रति '+product.unit)) : 'थर्मोकोल पैकिंग सहित'}</p>")
replace('src/components/OwnerStorefrontManager.tsx',"import { seedCatalog, useAllProducts }", "import { UnitProductManager } from './UnitProductManager';\nimport { seedCatalog, useAllProducts }")
replace('src/components/OwnerStorefrontManager.tsx',"{tab === 'products' && <ProductsPanel flash={flash} />}","{tab === 'products' && <div className=\"space-y-6\"><UnitProductManager /><ProductsPanel flash={flash} /></div>}")
replace('src/components/OrderForm.tsx',"import React, { useState, useEffect, useMemo } from 'react';","import React, { useState, useEffect, useMemo } from 'react';\nimport { UnitProductForm } from './UnitProductForm';")
replace('src/components/OrderForm.tsx','export const OrderForm: React.FC<OrderFormProps> =','const LegacyOrderForm: React.FC<OrderFormProps> =')
p=Path('src/components/OrderForm.tsx');s=p.read_text();s+='''\nexport const OrderForm: React.FC<OrderFormProps> = props => props.selectedProduct?.unitProduct
  ? <UnitProductForm key={props.selectedProduct.id} product={props.selectedProduct.unitProduct} currentUser={props.currentUser} onOrderSuccess={props.onOrderSuccess} onGoToTrack={props.onGoToTrack} />
  : <LegacyOrderForm {...props} />;\n''';p.write_text(s)

for path in ['src/components/AdminDashboard.tsx','src/components/StaffDashboard.tsx']:
    p=Path(path);s=p.read_text();s="import { subscribeOrderDocuments, orderRef as resolvedOrderRef, trackingRef as resolvedTrackingRef } from '../services/productOrders';\nimport { quantityText } from '../billing/unitBilling';\n"+s
    s=s.replace('onSnapshot(\n      ordersCol,','subscribeOrderDocuments(\n      {} ,',1)
    s=s.replace("doc(db, 'orders', ord.orderId)", 'resolvedOrderRef(ord.orderId)').replace("doc(db, 'order_tracking', ord.trackingToken)",'resolvedTrackingRef(ord.trackingToken)')
    s=s.replace('{ord.quantityKg} KG','{quantityText(ord)}').replace('${ord.quantityKg} KG','${quantityText(ord)}')
    s=s.replace('🧊 {quantityText(ord)} ड्राई आइस',"{ord.billingVersion===2?ord.productName:'🧊 ड्राई आइस'} · {quantityText(ord)}")
    s=s.replace("'ड्राई आइस और थर्मोकोल पैकिंग जारी है।'", "ord.billingVersion===2?'प्रोडक्ट की पैकिंग जारी है।':'ड्राई आइस और थर्मोकोल पैकिंग जारी है।'")
    p.write_text(s)
replace('src/components/CustomerOrders.tsx',"import React, { useState, useEffect } from 'react';","import React, { useState, useEffect } from 'react';\nimport { ownOrderDocuments } from '../services/productOrders';\nimport { quantityText } from '../billing/unitBilling';\nimport { UnitOrderBreakdown } from './UnitProductForm';")
replace('src/components/CustomerOrders.tsx','const querySnap = await getDocs(q);','const querySnap = await ownOrderDocuments(currentUser.uid);')
replace('src/components/CustomerOrders.tsx',"items.sort((a, b) => b.orderId.localeCompare(a.orderId));","items.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0) || b.orderId.localeCompare(a.orderId));")
replace('src/components/CustomerOrders.tsx','{ord.quantityKg} KG','{quantityText(ord)}')
replace('src/components/CustomerOrders.tsx','₹50&times;{ord.quantityKg} + ₹10&times;{ord.quantityKg} (थर्मोकोल)',"{ord.billingVersion===2 ? 'Product-wise bill' : '₹'+ord.dryIcePricePerKg+'×'+ord.quantityKg+' + ₹'+ord.thermocolPricePerKg+'×'+ord.quantityKg+' (packing)'}")
replace('src/components/CustomerOrders.tsx','            const BadgeIcon = badge.icon;','            const BadgeIcon = badge.icon;') if False else None
replace('src/components/CustomerOrders.tsx','              <div\n                key={ord.orderId}', '              <div\n                key={ord.orderId}') if False else None
# Show each immutable unit bill above its order actions without altering the legacy card.
p=Path('src/components/CustomerOrders.tsx');s=p.read_text();a='                    {ord.billingVersion===2 ?';idx=s.index(a);start=s.rfind('                <div',0,idx);s=s[:start]+"                {ord.billingVersion===2 && <UnitOrderBreakdown order={ord}/>}\n"+s[start:];p.write_text(s)
replace('src/components/OrderTrackingView.tsx',"import React, { useState, useEffect } from 'react';","import React, { useState, useEffect } from 'react';\nimport { trackingRef as resolvedTrackingRef } from '../services/productOrders';\nimport { quantityText } from '../billing/unitBilling';")
replace('src/components/OrderTrackingView.tsx',"doc(db, 'order_tracking', compoundToken)",'resolvedTrackingRef(compoundToken)')
p=Path('src/components/OrderTrackingView.tsx');s=p.read_text().replace('{trackingData.quantityKg} KG','{quantityText(trackingData)}').replace(' ड्राई आइस की आवश्यकता है?'," {trackingData.billingVersion===2?trackingData.productName:'ड्राई आइस'} की आवश्यकता है?");p.write_text(s)
# Historical records keep their recorded units and total in exports. Aggregate KG remains legacy dry ice only.
replace('src/utils/monthlyReport.ts',"import type { Order } from '../types';","import type { Order } from '../types';\nimport { quantityTextEnglish } from '../billing/unitBilling';")
replace('src/utils/monthlyReport.ts',"' | Quantity: ' + kg + ' KG | Booked: INR '","' | Dry-ice quantity: ' + kg + ' KG | Booked: INR '")
replace('src/utils/monthlyReport.ts',"'Customer', 'KG', 'INR'","'Customer', 'Quantity / unit', 'INR'")
replace('src/utils/monthlyReport.ts',"String(o.quantityKg || 0),",'quantityTextEnglish(o),')
print('Separate unit catalog/orders/tracking integrated into review source. No production changes.')
# Native registration and authenticated customer lookups include unit orders only after schema availability.
replace('src/services/orderPush.ts',"import { rememberTrackingToken, orderedTrackingTokens, recordTime } from './notificationState';","import { rememberTrackingToken, orderedTrackingTokens, recordTime } from './notificationState';\nimport { ownOrderDocuments } from './productOrders';")
replace('src/services/orderPush.ts',"getDocs(query(collection(db, 'orders'), where('userId', '==', expected.uid)))",'ownOrderDocuments(expected.uid)')
replace('src/hooks/useOrderNotifications.ts',"import { db } from '../firebase';","import { db } from '../firebase';\nimport { ownOrderDocuments, trackingRef, subscribeUnitOrderDocuments } from '../services/productOrders';\nimport { quantityText } from '../billing/unitBilling';")
replace('src/hooks/useOrderNotifications.ts',"getDocs(query(collection(db, 'orders'), where('userId', '==', currentUser.uid)))",'ownOrderDocuments(currentUser.uid)')
replace('src/hooks/useOrderNotifications.ts',"doc(db,'order_tracking',token)",'trackingRef(token)')
p=Path('src/hooks/useOrderNotifications.ts');s=p.read_text();a="  useEffect(() => {\n    if (!currentUser || !teamCanViewOrders) return;";i=s.index(a);j=s.index("  useEffect(() => {\n    const receive =",i);effect=s[i:j]
new=effect.replace("return onSnapshot(collection(db,'orders'), {includeMetadataChanges:true}, snapshot => {",'return subscribeUnitOrderDocuments(snapshot => {').replace("String(data.quantityKg || '')+' KG'",'quantityText(data)')
# Existing template has a city suffix: replace its quantity construction as a whole.
new=new.replace("String(data.quantityKg || '')+' KG · '","quantityText(data)+' · '")
assert new!=effect;s=s[:j]+new+s[j:];p.write_text(s)
# APO tracking points to its own protected projection; no units are inferred from its name.
p=Path('src/App.tsx');s=p.read_text();a='  const handleReorder = (pastOrder: Order) => {';assert s.count(a)==1
s=s.replace(a,a+'''
    if (pastOrder.billingVersion === 2) {
      const p=products.find(p=>p.id===pastOrder.productId&&p.unitProduct);
      if(p) {setSelectedProduct(p);setReorderData(pastOrder);setCurrentTab('order');}
      else {setNotificationMessage('यह प्रोडक्ट अभी booking के लिए उपलब्ध नहीं है।');setNoticesOpen(true);}
      return;
    }''',1)
a='  const handleQuickReorderFromTracking = (tracking: OrderTracking) => {';assert s.count(a)==1
s=s.replace(a,a+'''
    if (tracking.billingVersion === 2) {
      const p=products.find(p=>p.id===tracking.productId&&p.unitProduct);
      if(p) handleBook(p);else {setNotificationMessage('यह प्रोडक्ट अभी booking के लिए उपलब्ध नहीं है।');setNoticesOpen(true);}
      return;
    }''',1);p.write_text(s)
