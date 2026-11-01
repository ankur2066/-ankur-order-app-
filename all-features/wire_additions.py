"""Final optional-feature wiring after billing + language overlay."""
from pathlib import Path
p=Path('src/App.tsx');s=p.read_text()
s=s.replace("import { ThemeProvider }", "import { FeatureHub } from './components/customer/FeatureHub';\nimport { DataFeaturePanel } from './components/customer/FeatureDataPanels';\nimport { ThemeProvider }",1)
anchor="  const handleReorder = (pastOrder: Order) => {"
effect="""  useEffect(() => {
    const select = (event:Event) => {const id=(event as CustomEvent<string>).detail;const product=products.find(p=>p.id===id&&p.active);if(product)handleBook(product);};
    window.addEventListener('ankur-select-product',select);
    const track=(event:Event)=>{const r=(event as CustomEvent).detail;if(r?.orderId&&r?.trackingPin)handleGoToTrack(r.orderId,r.trackingPin);};
    window.addEventListener('ankur-track-order',track);
    return()=>{window.removeEventListener('ankur-select-product',select);window.removeEventListener('ankur-track-order',track);};
  },[products]);
  useEffect(()=>{const ref=new URLSearchParams(location.search).get('ref');if(ref&&/^[A-Za-z0-9_-]{3,128}$/.test(ref))localStorage.setItem('ankur.referrer',ref);},[]);
"""
assert s.count(anchor)==1;s=s.replace(anchor,effect+anchor)
s=s.replace("{currentTab === 'ai-video' && <AIVideoStudio currentUser={currentUser} />}","{currentTab === 'ai-video' && <><FeatureHub currentUser={currentUser} role={role} initial=\"video\"/><AIVideoStudio currentUser={currentUser} /></>}")
anchor='          <AdminDashboard\n';assert s.count(anchor)==1;s=s.replace(anchor,'          <FeatureHub currentUser={currentUser} role={role} />\n'+anchor,1)
anchor='          <StaffDashboard ';assert s.count(anchor)==1;s=s.replace(anchor,'          {access.permissions.updateStatus && <DataFeaturePanel id="eta" user={currentUser} role={role}/>}\n'+anchor,1)
anchor='          <CustomerOrders\n';assert s.count(anchor)==1;s=s.replace(anchor,'          <FeatureHub currentUser={currentUser} role={role} initial="subscriptions" />\n'+anchor,1)
p.write_text(s)
p=Path('src/data/products.ts');s=p.read_text().replace("BUSINESS_CALL_HREF = 'tel:+918896332066'","BUSINESS_CALL_HREF = 'tel:+919580882066'");p.write_text(s)
p=Path('src/data/upDistricts.ts');s=p.read_text();s+='\nfor(const district of ["अमरोहा (Amroha)","बदायूँ (Budaun)","भदोही (Bhadohi)","बिजनौर (Bijnor)","एटा (Etah)","फर्रुखाबाद (Farrukhabad)","महाराजगंज (Maharajganj)"])if(!UP_DISTRICTS.includes(district))UP_DISTRICTS.push(district);\n';p.write_text(s)
p=Path('src/utils/ownerReports.ts');s=p.read_text();s=s.replace("  const header = 'orderId,date,customerName,district,quantityKg,totalAmount,status';","  const mixed=orders.some(o=>o.billingVersion===2);\n  const header = 'orderId,date,customerName,district,quantityKg,totalAmount,status'+(mixed?',quantity,unit':'');")
s=s.replace("    csvText(o.status),","    csvText(o.status),\n    ...(mixed?[String(o.billingVersion===2&&o.billing?o.billing.quantityUnits/(o.billing.unit==='kg'?1000:1):o.quantityKg||0),csvText(o.billingVersion===2?o.billing?.unit:'kg')]:[]),")
p.write_text(s)
for name in ['AdminDashboard','StaffDashboard']:
    p=Path('src/components')/(name+'.tsx');s=p.read_text();s=s.replace("statusMsg = 'ड्राई आइस बस / डिलीवरी बॉय को हैंडओवर कर दी गई है।';","statusMsg = ord.billingVersion===2?'Product handed over for delivery.':'ड्राई आइस बस / डिलीवरी बॉय को हैंडओवर कर दी गई है।';");p.write_text(s)
p=Path('src/components/OrderForm.tsx');s=p.read_text();anchor='  const executeOrderSubmission = async () => {'
effect="""  useEffect(()=>{const fill=(e:Event)=>{const qty=(e as CustomEvent<number>).detail;if(Number.isInteger(qty)&&qty>=10&&qty<=5000)setQuantityInput(String(qty));};window.addEventListener('ankur-estimated-quantity',fill);return()=>window.removeEventListener('ankur-estimated-quantity',fill);},[]);
"""
assert s.count(anchor)==1;s=s.replace(anchor,effect+anchor);p.write_text(s)
p=Path('src/components/customer/CustomerHome.tsx');s=p.read_text();s="import { FeatureHub } from './FeatureHub';\n"+s
s=s.replace('      <main className="aqp-main aqp-form-only-main">','      <main className="aqp-main aqp-form-only-main">\n        <details className="mx-4 mb-3"><summary className="font-bold p-3">Ice calculator and rate card</summary><FeatureHub currentUser={null} role={null}/></details>',1);p.write_text(s)
p=Path('src/components/OrderTrackingView.tsx');s=p.read_text();anchor='{trackingData.quantityKg}'
# Tracking projection carries only manual ETA metadata; absent fields remain hidden.
needle='      {trackingData && ('
if needle in s:s=s.replace(needle,"      {trackingData && (trackingData as any).etaMs && <p role=\"status\" className=\"p-3\">Estimated arrival: {new Date((trackingData as any).etaMs).toLocaleString()} · Manual estimate; last updated {String((trackingData as any).etaUpdatedAt?.toDate?.().toLocaleString()||'recently')}</p>}\n"+needle,1)
p.write_text(s)
