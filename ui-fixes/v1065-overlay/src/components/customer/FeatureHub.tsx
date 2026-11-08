import React, { useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { ArrowLeft, Calculator, CalendarClock, ClipboardList, Gift, Handshake, Headphones, Languages, Lightbulb, MapPin, PackageSearch, Percent, ReceiptText, Share2, Sparkles, Warehouse } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useLanguage } from '../../context/LanguageContext';
import {DataFeaturePanel} from './FeatureDataPanels';
import {useStorefrontProducts} from '../../hooks/useProducts';
import {getLocalRates,subscribeToRates} from '../../data/rates';
import {UP_DISTRICTS} from '../../data/upDistricts';
import {displayPricePerKg} from '../../data/catalog';
import {calculateDryIce} from '../../utils/dryIceCalc';
import {ReferralSharePanel} from './ReferralSharePanel';

export type FeatureId = 'calculator'|'video'|'loyalty'|'catalog'|'partner'|'subscriptions'|'promotions'|'inventory'|'reports'|'faq'|'rates'|'support'|'service-area'|'referral';

const FEATURES: Array<{id:FeatureId; icon:React.ComponentType<{className?:string}>; en:string; hi:string; auth?:boolean; owner?:boolean; state?:string}> = [
  {id:'calculator',icon:Calculator,en:'Ice Calculator',hi:'आइस कैलकुलेटर'},
  {id:'video',icon:Lightbulb,en:'Video Idea Builder',hi:'वीडियो आइडिया बिल्डर'},
  {id:'loyalty',icon:Gift,en:'Loyalty Rewards',hi:'लॉयल्टी रिवार्ड',auth:true,state:'Reward policy is not configured.'},
  {id:'catalog',icon:PackageSearch,en:'Application Catalogue',hi:'एप्लिकेशन कैटलॉग'},
  {id:'partner',icon:Handshake,en:'Wholesale Partner',hi:'होलसेल पार्टनर',auth:true,state:'Partner approval is required.'},
  {id:'subscriptions',icon:CalendarClock,en:'Regular Supply',hi:'नियमित सप्लाई',auth:true,state:'Owner approval is required. No automatic charge.'},
  {id:'promotions',icon:Percent,en:'Promotions',hi:'प्रमोशन',state:'No public promotion is active.'},
  {id:'inventory',icon:Warehouse,en:'Inventory',hi:'इन्वेंटरी',owner:true,state:'Opening stock is not configured.'},
  {id:'reports',icon:ClipboardList,en:'Reports Hub',hi:'रिपोर्ट हब',owner:true},
  {id:'faq',icon:Sparkles,en:'FAQ / How-to',hi:'सवाल और तरीका'},
  {id:'rates',icon:ReceiptText,en:'Rate Card',hi:'रेट कार्ड'},
  {id:'support',icon:Headphones,en:'Support Hub',hi:'सपोर्ट हब'},
  {id:'service-area',icon:MapPin,en:'Service Area',hi:'सेवा क्षेत्र'},
  {id:'referral',icon:Share2,en:'Referral Share',hi:'रेफरल शेयर',auth:true,state:'Referral rewards require owner review.'},
];

const OWNER_SWITCHED_FEATURES=new Set(['loyalty','catalog','partner','subscriptions','promotions','inventory','referral','calculator','video','reports','faq','rates','support','service-area']);

const CalculatorPanel = () => {
  const {language}=useLanguage();
  const hi=language==='hi';
  const [minutes,setMinutes]=useState(12),[machines,setMachines]=useState(1),[hours,setHours]=useState(0);
  const [rates,setRates]=useState(getLocalRates);
  React.useEffect(()=>subscribeToRates(setRates),[]);
  const result=calculateDryIce({mode:'entry',entryMinutes:minutes,entryUnits:machines,
    stageMinutes:0,stageUnits:0,hoursBeforeEvent:hours},rates);
  const fields=[
    {title:hi?'फॉग मिनट':'Fog minutes',value:minutes,onChange:setMinutes,max:120},
    {title:hi?'मशीन / मटका':'Machines / matkas',value:machines,onChange:setMachines,max:20},
    {title:hi?'इवेंट से पहले घंटे':'Hours before event',value:hours,onChange:setHours,max:12}
  ];
  return <section className="space-y-3" aria-label="Dry ice calculator">
    <p className="text-sm t-sub">{hi
      ?'लगभग 3 मिनट फॉग प्रति किलो प्रति मशीन, ट्रांसपोर्ट लॉस और 10% मार्जिन का अनुमान। वास्तविक समय अलग हो सकता है।'
      :'Estimate uses about 3 fog minutes per kg per machine, transit loss and 10% margin. Actual output varies.'}</p>
    {fields.map(f=><label className="block text-sm font-semibold" key={f.title}>{f.title}
      <input type="number" min="0" max={f.max} step="1" value={f.value}
        className="w-full rounded-xl border p-3 mt-1"
        onChange={e=>{const n=Number(e.target.value);
          f.onChange(Math.min(f.max,Math.max(0,Number.isFinite(n)?Math.round(n):0)));}}/>
    </label>)}
    <div className="c-soft rounded-xl p-3" role="status">
      <p className="font-black">{hi?'बुक करने का अनुमान':'Suggested booking'}: {result.bookKg} KG</p>
      <p className="text-sm">{hi?'अनुमानित राशि':'Estimated amount'}: ₹{result.estimatedTotal}</p>
      {result.belowMinimum&&<p className="text-xs">{hi?'न्यूनतम बुकिंग 10 KG है।':'Minimum booking is 10 KG.'}</p>}
      {result.aboveMaximum&&<p className="text-xs">{hi?'बड़ी मात्रा के लिए टीम से बात करें।':'Contact the team for large orders.'}</p>}
    </div>
    <button type="button" className="c-brand rounded-xl p-3 w-full font-bold"
      disabled={!result.bookKg||result.aboveMaximum}
      onClick={()=>window.dispatchEvent(new CustomEvent('ankur-open-calculator-booking',{detail:result.bookKg}))}>
      {hi?'यही मात्रा बुकिंग में भरें':'Use quantity in booking'}
    </button>
    <p className="text-xs t-sub">{hi?'अंतिम राशि बुकिंग फॉर्म पर जाँचें।':'Check the final amount in the booking form.'}</p>
  </section>;
};

const SafePanel: React.FC<{id:FeatureId; state?:string; user:User|null;role:string|null;onOpenReports:()=>void}> = ({id,state,user,role,onOpenReports}) => {
  if(id==='reports'&&role==='admin')return <ReportsHub user={user} onOpenReports={onOpenReports}/>;
  if(id==='referral'&&role!=='admin')return <ReferralSharePanel user={user}/>;
  if(['loyalty','partner','subscriptions','promotions','inventory','reports','referral'].includes(id))return <DataFeaturePanel id={id} user={user} role={role}/>;
  if(id==='calculator') return <CalculatorPanel/>;
  if(id==='video') return <VideoIdeaPanel user={user}/>;
  if(id==='rates') return <LiveRateCard/>;
  if(id==='support') return <SupportPanel/>;
  if(id==='faq') return <FaqPanel/>;
  if(id==='service-area') return <ServiceAreaPanel/>;
  if(id==='catalog') return <ApplicationCatalog/>;
  return <div className="rounded-xl c-soft p-4 text-sm font-bold">{state || 'This feature uses verified account and order data.'}</div>;
};

function ReportsHub({user,onOpenReports}:{user:User|null;onOpenReports:()=>void}) {
  const {language}=useLanguage(),hi=language==='hi';
  return <section className="space-y-4">
    <p className="text-sm t-sub">{hi?'ओनर इनसाइट्स से सभी ऑर्डर की CSV और 15 तारीख से अगली 14 तारीख तक की मासिक PDF निकालें।':'Open Owner Insights for all-order CSV and the monthly PDF covering the 15th through the following 14th.'}</p>
    <button type="button" className="min-h-11 rounded-xl c-brand p-3 w-full font-bold" onClick={onOpenReports}>{hi?'ऑर्डर और मासिक रिपोर्ट खोलें':'Open order and monthly reports'}</button>
    <details className="border b-line rounded-xl p-3"><summary className="font-bold">{hi?'डिलीवरी की रसीदें':'Delivery receipts'}</summary><div className="mt-3"><DataFeaturePanel id="reports" user={user} role="admin"/></div></details>
  </section>;
}

export const FeatureHub: React.FC<{currentUser:User|null; role:string|null; initial?:FeatureId|null; onClose?:()=>void;allowed?:FeatureId[]}> = ({currentUser,role,initial=null,onClose,allowed}) => {
  const {language,t}=useLanguage(); const [active,setActive]=useState<FeatureId|null>(initial);
  const [featureFlags,setFeatureFlags]=useState<Record<string,boolean>>({});
  React.useEffect(()=>onSnapshot(doc(db,'settings','featureSuite'),snapshot=>setFeatureFlags(snapshot.data()?.features||{}),()=>setFeatureFlags({})),[]);
  // Customer visibility is NOT a permission grant. Existing authenticated rules remain mandatory.
  const visible=useMemo(()=>FEATURES.filter(f=>(!f.owner||role==='admin')&&
    (!allowed||allowed.includes(f.id))&&
    featureFlags[f.id]===true),[role,allowed,featureFlags]);
  const selected=visible.find(f=>f.id===active);
  if(selected) return <div className="c-app ankur-readable-customer-page min-h-screen page-with-bottom-nav"><header className="c-card border-b b-line px-3 py-3 flex items-center gap-2"><button aria-label={t('back')} onClick={()=>setActive(null)} className="w-11 h-11 rounded-full flex items-center justify-center"><ArrowLeft className="w-5 h-5"/></button><h1 className="font-black">{language==='hi'?selected.hi:selected.en}</h1></header><main className="p-4 max-w-lg mx-auto"><SafePanel id={selected.id} state={selected.state} user={currentUser} role={role} onOpenReports={()=>{setActive(null);window.dispatchEvent(new Event('ankur-owner-reports'));}}/>{selected.auth&&!currentUser&&<p className="mt-3 text-sm text-amber-700">Sign in is required to use account actions.</p>}</main></div>;
  return <section className="c-card border b-line rounded-2xl p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-black">{t('features')}</h2>{onClose&&<button onClick={onClose} className="text-xs t-brand">Close</button>}</div><div className="grid grid-cols-2 gap-2 mt-3">{visible.map(({id,icon:Icon,en,hi})=><button key={id} type="button" onClick={()=>setActive(id)} className="focus-ring min-h-20 c-soft rounded-xl p-3 text-left"><Icon className="w-5 h-5 t-brand"/><span className="block mt-2 text-xs font-extrabold">{language==='hi'?hi:en}</span></button>)}</div></section>;
};

export const LanguageSettings = () => { const {language,setLanguage,t}=useLanguage(); return <section className="c-card border b-line rounded-2xl p-4"><h2 className="text-sm font-black flex items-center gap-2"><Languages className="w-5 h-5 t-brand"/>{t('settings')}</h2><p className="mt-3 text-xs font-bold t-sub">{t('language')}</p><div className="grid grid-cols-2 gap-2 mt-2"><button type="button" aria-pressed={language==='en'} onClick={()=>setLanguage('en')} className={`min-h-11 rounded-xl border ${language==='en'?'b-brand c-soft':'b-line c-card'} font-bold`}>{t('english')}</button><button type="button" aria-pressed={language==='hi'} onClick={()=>setLanguage('hi')} className={`min-h-11 rounded-xl border ${language==='hi'?'b-brand c-soft':'b-line c-card'} font-bold`}>{t('hindi')}</button></div></section> };

type VideoContact = {name:string;city:string;mobile:string};
const VIDEO_OCCASIONS = [
  {id:'wedding',name:'Wedding Entry / शादी की एंट्री',short:'Wedding Entry',hi:'शादी एंट्री'},
  {id:'stage',name:'Stage Fog / स्टेज फॉग',short:'Stage Fog',hi:'स्टेज फॉग'},
  {id:'engagement',name:'Engagement / सगाई',short:'Engagement',hi:'सगाई'},
  {id:'birthday',name:'Birthday / जन्मदिन',short:'Birthday',hi:'जन्मदिन'},
  {id:'cocktail',name:'Cocktail / बार फॉग',short:'Cocktail',hi:'बार फॉग'},
  {id:'reception',name:'Reception / रिसेप्शन',short:'Reception',hi:'रिसेप्शन'},
  {id:'haldi',name:'Haldi / हल्दी',short:'Haldi',hi:'हल्दी'},
  {id:'mehndi',name:'Mehndi / मेहंदी',short:'Mehndi',hi:'मेहंदी'},
  {id:'sangeet',name:'Sangeet / संगीत',short:'Sangeet',hi:'संगीत'},
  {id:'dj-night',name:'DJ Night / डीजे नाइट',short:'DJ Night',hi:'डीजे नाइट'},
  {id:'corporate',name:'Corporate Event / कॉर्पोरेट इवेंट',short:'Corporate',hi:'कॉर्पोरेट'},
  {id:'anniversary',name:'Anniversary / सालगिरह',short:'Anniversary',hi:'सालगिरह'},
  {id:'baby-shower',name:'Baby Shower / गोद भराई',short:'Baby Shower',hi:'गोद भराई'},
  {id:'bride-entry',name:'Bridal Entry / दुल्हन एंट्री',short:'Bridal Entry',hi:'दुल्हन एंट्री'},
  {id:'groom-entry',name:'Groom Entry / दूल्हा एंट्री',short:'Groom Entry',hi:'दूल्हा एंट्री'},
  {id:'varmala',name:'Varmala / वरमाला',short:'Varmala',hi:'वरमाला'},
  {id:'first-dance',name:'First Dance / पहला डांस',short:'First Dance',hi:'पहला डांस'},
  {id:'ring',name:'Ring Ceremony / रिंग सेरेमनी',short:'Ring Ceremony',hi:'रिंग सेरेमनी'},
  {id:'opening',name:'Grand Opening / भव्य उद्घाटन',short:'Grand Opening',hi:'उद्घाटन'},
  {id:'awards',name:'Award Ceremony / पुरस्कार समारोह',short:'Awards',hi:'पुरस्कार'},
  {id:'fashion',name:'Fashion Show / फैशन शो',short:'Fashion Show',hi:'फैशन शो'},
  {id:'college',name:'College Fest / कॉलेज फेस्ट',short:'College Fest',hi:'कॉलेज फेस्ट'},
  {id:'launch',name:'Product Launch / प्रोडक्ट लॉन्च',short:'Product Launch',hi:'प्रोडक्ट लॉन्च'},
  {id:'baraat',name:'Baraat Entry / बारात एंट्री',short:'Baraat',hi:'बारात'},
  {id:'pool',name:'Pool Party / पूल पार्टी',short:'Pool Party',hi:'पूल पार्टी'},
  {id:'diwali',name:'Diwali Party / दिवाली पार्टी',short:'Diwali',hi:'दिवाली'},
  {id:'newyear',name:'New Year Party / नया साल',short:'New Year',hi:'नया साल'},
  {id:'concert',name:'Live Concert / लाइव कॉन्सर्ट',short:'Concert',hi:'कॉन्सर्ट'},
  {id:'other',name:'Other Event / अन्य कार्यक्रम',short:'Other Event',hi:'अन्य कार्यक्रम'},
] as const;
function VideoIdeaPanel({user}:{user:User|null}){
  const {language}=useLanguage();
  const [occasion,setOccasion]=useState('wedding');
  const [occasionOpen,setOccasionOpen]=useState(false);
  const [customOccasion,setCustomOccasion]=useState('');
  const [duration,setDuration]=useState(30);
  const [notice,setNotice]=useState('');
  const [contact,setContact]=useState<VideoContact>({name:'',city:'',mobile:''});
  // Separate account data on shared phones; never sync to backend.
  const storageKey='ankur.video.idea.contact.v1.'+(user?.uid||'guest');
  React.useEffect(()=>{
    try{
      const saved=window.localStorage.getItem(storageKey);
      const data:unknown=saved?JSON.parse(saved):null;
      if(!data||typeof data!=='object'||Array.isArray(data)){
        setContact({name:'',city:'',mobile:''});return;
      }
      const obj=data as Record<string,unknown>;
      setContact({
        name:typeof obj.name==='string'?obj.name.slice(0,80):'',
        city:typeof obj.city==='string'?obj.city.slice(0,80):'',
        mobile:typeof obj.mobile==='string'?obj.mobile.replace(/\D/g,'').slice(0,10):'',
      });
    }catch{setContact({name:'',city:'',mobile:''});}
  },[storageKey]);
  const changeContact=(field:keyof VideoContact,value:string)=>{
    const clean=field==='mobile'?value.replace(/\D/g,'').slice(0,10):value.slice(0,80);
    const next={...contact,[field]:clean};
    setContact(next);
    try{window.localStorage.setItem(storageKey,JSON.stringify(next));}catch{
      setNotice('Details are available for this session but could not be saved on this device.');
    }
  };
  const eventName=occasion==='other'?(customOccasion.trim()||'an event'):
    (language==='hi'?VIDEO_OCCASIONS.find(x=>x.id===occasion)?.hi:VIDEO_OCCASIONS.find(x=>x.id===occasion)?.short)||'an event');
  const prompt=[
    'Generate an actual finished '+duration+'-second vertical 9:16 VIDEO for '+eventName+'. Render and return a playable video, not just a video concept, script or storyboard.',
    'Include cinematic scenes, Hindi captions, smooth transitions and a clear call to action in the final video.',
    'Show safe dry-ice handling. Use your available video-generation tool. If the requested duration or video generation is unavailable, clearly say so instead of presenting written text as a finished video.',
    contact.name.trim()?'Requested name or brand: '+contact.name.trim()+'.':'Do not add any business name, logo, watermark, phone number or branding unless explicitly provided in these details.',
    contact.city.trim()?'Location: '+contact.city.trim()+'.':'',
    contact.mobile.length===10?'Contact number for the requested video: '+contact.mobile+'.':'',
  ].filter(Boolean).join(' ');
  const copyPrompt=async()=>{
    try{
      await navigator.clipboard.writeText(prompt);
      setNotice('Prompt copied. Paste it into Gemini.');
    }catch{setNotice('Copy unavailable. Select and copy the prompt above.');}
  };
  return <div className="ankur-video-idea-page space-y-3">
    <label className="block font-semibold" htmlFor="ankur-video-occasion">Occasion / Function</label>
    <button id="ankur-video-occasion" type="button" aria-expanded={occasionOpen}
      aria-controls="ankur-video-occasion-options"
      onClick={()=>setOccasionOpen(open=>!open)}
      className="ankur-video-occasion-trigger w-full rounded-xl border p-3 min-h-12 text-left font-semibold">
      <span>{language==='hi'?VIDEO_OCCASIONS.find(item=>item.id===occasion)?.hi:VIDEO_OCCASIONS.find(item=>item.id===occasion)?.short}</span>
      <span aria-hidden="true">{occasionOpen?'▴':'▾'}</span>
    </button>
    {occasionOpen&&<div id="ankur-video-occasion-options" aria-label="Choose occasion"
        className="ankur-video-occasion-grid grid grid-cols-3 gap-2 p-2 rounded-xl border b-line">
      {VIDEO_OCCASIONS.map(item=><button key={item.id} type="button"
        aria-pressed={occasion===item.id}
        className={`ankur-video-occasion-option rounded-lg border p-2 ${occasion===item.id?'ankur-selected':''}`}
        onClick={()=>{setOccasion(item.id);setOccasionOpen(false);}}>
        <span className="block font-semibold">{language==='hi'?item.hi:item.short}</span>
      </button>)}
    </div>}
    {occasion==='other'&&<label className="block">Function name
      <input className="w-full rounded-xl border p-3 mt-2" maxLength={100}
        value={customOccasion} onChange={e=>setCustomOccasion(e.target.value)}/>
    </label>}
    <label className="block font-semibold">Length in seconds
      <input className="block w-full rounded-xl border p-3 mt-2" type="number"
        min="5" max="120" value={duration}
        onChange={e=>setDuration(Math.min(120,Math.max(5,Number(e.target.value)||5)))}/>
    </label>
    <label className="block font-semibold" htmlFor="ankur-video-prompt">Prompt</label>
    <textarea id="ankur-video-prompt" readOnly aria-label="Generated prompt"
      className="w-full min-h-36 rounded-xl border p-3" value={prompt}/>
    <button type="button" className="ankur-video-action ankur-video-copy c-brand"
      onClick={copyPrompt}>Copy Prompt</button>
    <a className="ankur-video-action ankur-gemini-button c-brand" href="https://gemini.google.com/app"
      target="_blank" rel="noopener noreferrer">Open Gemini</a>
    <p role="status" className="text-sm t-sub">{notice}</p>
    <section className="ankur-video-saved-details c-card rounded-2xl border b-line p-4"
      aria-label="Saved video contact details">
      <h2 className="font-extrabold text-base">Your details (saved on this device)</h2>
      <p className="text-xs t-sub mt-1 mb-3">Fill once. These details stay on this phone for this account until app data is cleared. They are included only when you copy the prompt.</p>
      <label className="block font-semibold">Name / Brand
        <input type="text" autoComplete="name" maxLength={80} value={contact.name}
          onChange={e=>changeContact('name',e.target.value)}
          className="block w-full rounded-xl border p-3 mt-1" />
      </label>
      <label className="block font-semibold mt-3">City / Place
        <input type="text" autoComplete="address-level2" maxLength={80} value={contact.city}
          onChange={e=>changeContact('city',e.target.value)}
          className="block w-full rounded-xl border p-3 mt-1" />
      </label>
      <label className="block font-semibold mt-3">Mobile Number
        <input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10}
          value={contact.mobile} onChange={e=>changeContact('mobile',e.target.value)}
          className="block w-full rounded-xl border p-3 mt-1" />
      </label>
    </section>
  </div>;
}
function FaqPanel(){
 const {language}=useLanguage(),hi=language==='hi';
 const questions=[
  [hi?'ड्राई आइस को कैसे छुएँ?':'How should I handle dry ice?',hi?'मोटे इंसुलेटेड दस्ताने पहनें। नंगी त्वचा से छूने पर ठंडी जलन हो सकती है।':'Use insulated gloves. Bare skin contact can cause cold burns.'],
  [hi?'क्या इसे पूरी तरह बंद डिब्बे में रखें?':'Can I seal it airtight?',hi?'कभी नहीं। गैस बनने से दबाव बढ़ सकता है।':'Never use an airtight container. Pressure can build up.'],
  [hi?'कहाँ स्टोर करें?':'How should it be stored?',hi?'हवादार जगह, बच्चों से दूर। बंद कमरे या गाड़ी में कार्बन डाइऑक्साइड जमा हो सकती है।':'Keep ventilated and away from children. CO₂ can build up in closed rooms and vehicles.'],
  [hi?'ऑर्डर कब कन्फर्म होगा?':'When is delivery confirmed?',hi?'ऐप के स्टेटस और टीम की पुष्टि से। केवल बुकिंग जमा करना डिलीवरी गारंटी नहीं है।':'After the app status and team confirmation; submitting a booking does not guarantee delivery.'],
  [hi?'बस से डिलीवरी होगी?':'Can I request bus delivery?',hi?'जगह, पैकिंग और बस उपलब्धता के अनुसार टीम पुष्टि करेगी।':'The team confirms destination, packing and available transport.']
 ];
 return <div className="space-y-3 text-sm" aria-label="Dry ice FAQs">
  {questions.map(([q,a])=><details className="rounded-xl border b-line p-3" key={q}>
   <summary className="font-semibold cursor-pointer">{q}</summary>
   <p className="mt-2 t-sub">{a}</p>
  </details>)}
 </div>;
}
function SupportPanel(){
 const {language}=useLanguage(),hi=language==='hi';
 return <div className="space-y-3" aria-label="Customer support">
  <p className="text-sm t-sub">{hi?'बुकिंग, पैकिंग या डिलीवरी के सवाल? कॉल और WhatsApp के नंबर अलग हैं।':'Questions about booking, packing or delivery? Call and WhatsApp use separate numbers.'}</p>
  <div className="grid grid-cols-2 gap-3">
   <a className="c-brand rounded-xl p-3 text-center font-bold" href="tel:+919580882066">{hi?'कॉल':'Call'}<span className="block text-xs">95808 82066</span></a>
   <a className="c-brand rounded-xl p-3 text-center font-bold" target="_blank" rel="noopener noreferrer"
    href="https://wa.me/918896332066?text=Hello%20Ankur%20Dryice%2C%20I%20need%20order%20support.">WhatsApp<span className="block text-xs">88963 32066</span></a>
  </div>
  <p className="text-xs t-sub">{hi?'ऑर्डर ID बता सकते हैं; OTP या UPI PIN कभी न भेजें।':'Share an order ID if useful; never send OTPs or UPI PINs.'}</p>
 </div>;
}
function ServiceAreaPanel(){
 const {language}=useLanguage(),hi=language==='hi';const[search,setSearch]=useState('');
 const districts=UP_DISTRICTS.filter(d=>d.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 return <section className="space-y-3" aria-label="Uttar Pradesh delivery enquiry">
  <p className="text-sm t-sub">{hi?'पूरे उत्तर प्रदेश में डिलीवरी के लिए पूछताछ करें। जिला दिखना समय या उपलब्धता की पुष्टि नहीं है।':'Enquire across Uttar Pradesh. A listed district is not a delivery availability or timing guarantee.'}</p>
  <label className="block text-sm font-bold">{hi?'जिला खोजें':'Search district'}
   <input maxLength={80} value={search} onChange={e=>setSearch(e.target.value)}
    className="w-full border rounded-xl p-3 mt-1" placeholder={hi?'जिले का नाम':'District name'} />
  </label>
  <p role="status" className="text-xs t-sub">{districts.length} {hi?'जिले मिले':'district matches'}</p>
  <ul className="max-h-64 overflow-y-auto rounded-xl border b-line p-2">{districts.map(d=><li className="border-b b-line p-2" key={d}>{hi?d.replace(/\s*\([^)]*\)\s*/,''):(d.match(/\(([^)]+)\)/)?.[1]||d)}</li>)}</ul>
  <p className="text-xs t-sub">{hi?'पैकिंग और पहुँचने का समय टीम से कन्फर्म करें।':'Confirm packing and arrival with the team.'}</p>
 </section>;
}
function LiveRateCard(){
 const {language}=useLanguage(),hi=language==='hi';const[rates,setRates]=useState(getLocalRates);
 React.useEffect(()=>subscribeToRates(setRates),[]);
 const display=(value:number)=>Number.isFinite(value)&&value>0?'₹'+value+' / KG':(hi?'रेट कन्फर्म करें':'Confirm rate');
 return <section className="space-y-3" aria-label="Rate card">
  <p className="text-sm t-sub">{hi?'यह ऐप में उपलब्ध रेट हैं, अंतिम कोटेशन नहीं।':'These are app rates, not a final quote.'}</p>
  <dl className="space-y-3">
   <div className="c-soft rounded-xl p-3 flex justify-between gap-2"><dt>{hi?'ड्राई आइस':'Dry ice'}</dt><dd className="font-bold">{display(rates.dryIceRate)}</dd></div>
   <div className="c-soft rounded-xl p-3 flex justify-between gap-2"><dt>{hi?'थर्मोकोल':'Thermocol'}</dt><dd className="font-bold">{display(rates.thermocolRate)}</dd></div>
   {Number.isFinite(rates.transportRate)&&rates.transportRate>0&&<div className="c-soft rounded-xl p-3 flex justify-between gap-2"><dt>{hi?'ट्रांसपोर्ट':'Transport'}</dt><dd className="font-bold">{display(rates.transportRate)}</dd></div>}
  </dl>
  <p className="text-xs t-sub">{hi?'असली मात्रा, पैकिंग और डिलीवरी के अनुसार बुकिंग में अंतिम बिल देखें।':'Check the final booking bill for quantity, packing and delivery.'}</p>
 </section>;
}
function ApplicationCatalog(){const{products,loading,error}=useStorefrontProducts();const[category,setCategory]=useState('all');const[rates,setRates]=useState(getLocalRates);React.useEffect(()=>subscribeToRates(setRates),[]);return <div className="space-y-3"><label>Application / category<select className="w-full border rounded-xl p-3" value={category} onChange={e=>setCategory(e.target.value)}>{['all',...new Set(products.map(p=>p.category))].map(c=><option key={c}>{c}</option>)}</select></label>{loading&&<p>Loading…</p>}{error&&<p role="alert">{error}</p>}{products.filter(p=>p.active&&(category==='all'||p.category===category)).map(p=><article className="border rounded-xl p-3" key={p.id}><h3 className="font-bold">{p.name}</h3><p>₹{displayPricePerKg(p,rates)} / {p.unitProduct?.unit||'KG'}</p><button className="mt-2 c-brand rounded-xl p-3" onClick={()=>window.dispatchEvent(new CustomEvent('ankur-select-product',{detail:p.id}))}>Book this product</button></article>)}</div>;}
