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
end=s.index("function ServiceAreaPanel()",start)
replacement=r'''type VideoContact = {name:string;city:string;mobile:string};
const VIDEO_OCCASIONS = [
  {id:'wedding',name:'Wedding Entry / शादी की एंट्री'},
  {id:'stage',name:'Stage Fog / स्टेज फॉग'},
  {id:'engagement',name:'Engagement / सगाई'},
  {id:'birthday',name:'Birthday / जन्मदिन'},
  {id:'cocktail',name:'Cocktail / बार फॉग'},
  {id:'business',name:'Dry Ice Supply / ड्राई आइस सप्लाई'},
  {id:'other',name:'Other Event / अन्य कार्यक्रम'},
] as const;
function VideoIdeaPanel({user}:{user:User|null}){
  const [occasion,setOccasion]=useState('wedding');
  const [customOccasion,setCustomOccasion]=useState('');
  const [duration,setDuration]=useState(10);
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
    'Create an original '+duration+'-second vertical 9:16 video concept for '+eventName+' featuring Ankur Dryice.',
    'Describe a scene-by-scene storyboard, Hindi captions and a clear call to action.',
    'Show safe dry-ice handling. Do not claim a video has already been generated.',
    contact.name.trim()?'Requested name or brand: '+contact.name.trim()+'.':'',
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
    <select id="ankur-video-occasion" className="w-full rounded-xl border p-3 min-h-12"
      value={occasion} onChange={e=>setOccasion(e.target.value)}>
      {VIDEO_OCCASIONS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
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
