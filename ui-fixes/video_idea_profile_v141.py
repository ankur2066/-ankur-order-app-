#!/usr/bin/env python3
"""v1.0.41: simplify Video Idea Builder and remove Profile's duplicate tools.

Only customer-facing presentation. Saved customer details are per account on
this device; never written to orders, Firestore, or silently sent to Gemini.
"""
from pathlib import Path

hub=Path("src/components/customer/FeatureHub.tsx")
s=hub.read_text(encoding="utf-8")
before="if(id==='video') return <VideoIdeaPanel/>;"
assert s.count(before)==1
s=s.replace(before,"if(id==='video') return <VideoIdeaPanel user={user}/>;",1)
start=s.index("function VideoIdeaPanel(){")
end=s.index("function FaqPanel()",start)
replacement=r'''type VideoContact = {name:string;city:string;mobile:string};
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
    (VIDEO_OCCASIONS.find(x=>x.id===occasion)?.name||'an event');
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
      <span>{VIDEO_OCCASIONS.find(item=>item.id===occasion)?.name}</span>
      <span aria-hidden="true">{occasionOpen?'▴':'▾'}</span>
    </button>
    {occasionOpen&&<div id="ankur-video-occasion-options" aria-label="Choose occasion"
        className="ankur-video-occasion-grid grid grid-cols-3 gap-2 p-2 rounded-xl border b-line">
      {VIDEO_OCCASIONS.map(item=><button key={item.id} type="button"
        aria-pressed={occasion===item.id}
        className={`ankur-video-occasion-option rounded-lg border p-2 ${occasion===item.id?'ankur-selected':''}`}
        onClick={()=>{setOccasion(item.id);setOccasionOpen(false);}}>
        <span className="block font-semibold">{item.short}</span>
        <span className="block ankur-video-occasion-hi">{item.hi}</span>
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
'''
s=s[:start]+replacement+s[end:]
assert s.count("function VideoIdeaPanel(")==1
assert "VideoIdeaPanel user={user}" in s
hub.write_text(s,encoding="utf-8")

profile=Path("src/components/customer/ProfileTab.tsx")
p=profile.read_text(encoding="utf-8")
old_import="import { FeatureHub, LanguageSettings } from './FeatureHub';"
assert p.count(old_import)==1
p=p.replace(old_import,"import { LanguageSettings } from './FeatureHub';",1)
old_tools='        <FeatureHub currentUser={currentUser} role={role} allowed={["calculator","loyalty","partner","subscriptions","promotions","faq","support","service-area","referral"]}/>\n'
assert p.count(old_tools)==1, "Profile tools have changed"
p=p.replace(old_tools,"",1)
assert "LanguageSettings" in p and 'Notification preferences' in p and "BUSINESS_CALL_HREF" in p
profile.write_text(p,encoding="utf-8")

css=Path("src/index.css")
before=css.read_text(encoding="utf-8")
overlay=Path("ui-fixes/video-idea-profile-v141.css").read_text(encoding="utf-8")
assert "ANKUR VIDEO IDEA PROFILE v1.0.41" not in before
css.write_text(before+"\n"+overlay,encoding="utf-8")
print("PASS: occasion chooser, equal action blocks, local per-account contact and no Profile tools duplication")
