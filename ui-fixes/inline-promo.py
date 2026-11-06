"""Optional standard-booking promo path; original no-code submission stays byte-identical."""
from pathlib import Path
import shutil
shutil.copyfile('all-features/templates/useInlinePromo.template','src/hooks/useInlinePromo.ts')
p=Path('src/components/OrderForm.tsx');s=p.read_text()
def once(old,new):
 global s
 assert s.count(old)==1,(old[:80],s.count(old))
 s=s.replace(old,new,1)
once("import React, { useState, useEffect, useMemo } from 'react';","import React, { useState, useEffect, useMemo } from 'react';\nimport {useInlinePromo} from '../hooks/useInlinePromo';")
once('  const currentUnitRate =',"  const promo=useInlinePromo({customerName:customerName.trim(),customerPhone:customerPhone.replace(/[^0-9]/g,'').slice(-10),address:address.trim(),quantityKg:currentQuantityKg,dispatchTiming},currentUser?.uid||'guest');\n  const [promoNotice,setPromoNotice]=useState('');\n  useEffect(()=>{if(selectedProduct&&!promo.locked)promo.setCode('');},[selectedProduct?.id]);\n  const currentUnitRate =")
anchor='  const executeOrderSubmission = async () => {'
wrapper="""  const submitBooking = async () => {
    if (!promo.code.trim() && !promo.locked) { await executeOrderSubmission(); return; }
    if (selectedProduct || extraAmountText.trim() || extraAmountReason.trim()) { setErrorMsg('Promo codes apply to standard Dry Ice without additional requests.'); return; }
    try {
      setSubmitting(true);setErrorMsg(null);
      const result=await promo.book();
      const details={orderId:result.orderId,trackingPin:result.trackingPin,customerName:customerName.trim(),customerPhone:getClean10DigitPhone(customerPhone),address:address.trim(),quantityKg:currentQuantityKg,totalAmount:result.totalAmount,dispatchTiming};
      try {const key='ankur_dryice_placed_orders_v1',raw=JSON.parse(localStorage.getItem(key)||'[]'),rows=Array.isArray(raw)?raw:[];localStorage.setItem(key,JSON.stringify([{...details,trackingToken:result.orderId+'_'+result.trackingPin,userId:currentUser?.uid||'guest',productName:bookedProductName,status:'pending',paymentStatus:'pending_verification',promoCode:promo.code.trim().toUpperCase(),createdAtMs:Date.now()},...rows.filter((r:any)=>r.orderId!==result.orderId)].slice(0,20)));} catch { /* optional cache; committed order remains valid */ }
      setSuccessData(details);onOrderSuccess(result.orderId,result.trackingPin);onClearReorder?.();
    } catch { setErrorMsg('Promo booking could not complete. Apply the code again if rates changed; retry with the same original details.'); }
    finally {setSubmitting(false);}
  };
"""
once(anchor,wrapper+anchor)
# Change only the two call sites OUTSIDE the protected original function.
a=s.index('  const handleSubmit = async');tail=s[a:];assert tail.count('await executeOrderSubmission();')==2;tail=tail.replace('await executeOrderSubmission();','await submitBooking();');s=s[:a]+tail
once('              {/* 6. Price Breakdown (Price Breakup) */}', '''              {!selectedProduct&&<section className="space-y-2 border rounded-xl p-3" aria-label="Optional promo code">
                <label htmlFor="ankur-promo-code">Promo code (optional)</label>
                <div className="flex gap-2"><input id="ankur-promo-code" className="border rounded-xl p-2 min-w-0 flex-1" maxLength={64} value={promo.code} onChange={e=>{promo.setCode(e.target.value);setPromoNotice('');}} disabled={submitting||promo.busy}/><button type="button" className="c-brand rounded-xl p-2" disabled={submitting||promo.busy||!promo.code.trim()} onClick={async()=>{try{await promo.apply();setPromoNotice('Code checked. Review the discount below.');}catch{setPromoNotice('Code is unavailable, expired or does not match this quantity.');}}}>Apply code</button></div>
                <p className="text-xs">Standard Dry Ice only; additional requests need a separate owner quote.</p>{promoNotice&&<p role="status">{promoNotice}</p>}
              </section>}
              {/* 6. Price Breakdown (Price Breakup) */}''')
once('                <div className="apb-total-grand', '''                {promo.quote&&<div role="status" className="space-y-1"><p>Base amount: ₹{(promo.quote.baseTotalPaise/100).toFixed(2)}</p><p>Promo discount: −₹{(promo.quote.discountPaise/100).toFixed(2)}</p><strong>After promo: ₹{(promo.quote.totalPaise/100).toFixed(2)}</strong></div>}
                <div className="apb-total-grand''')
once('ऑर्डर बुक करें (₹{totalAmount})','ऑर्डर बुक करें (₹{promo.quote?promo.quote.totalPaise/100:totalAmount})')
p.write_text(s)
