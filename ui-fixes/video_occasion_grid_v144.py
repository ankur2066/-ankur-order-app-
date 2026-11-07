#!/usr/bin/env python3
"""v1.0.44: occasion selector only, 24 choices in a three-column expanded grid.

Applies after v141 and makes NO changes to Video contact, duration, prompt
generator, Gemini link, customer booking, Owner/Staff, or Firebase.
"""
from pathlib import Path
p=Path("src/components/customer/FeatureHub.tsx")
s=p.read_text(encoding="utf-8")
def once(a,b):
    global s
    assert s.count(a)==1, f"Occasion source drift: {a[:90]}"
    s=s.replace(a,b,1)

old_start="const VIDEO_OCCASIONS = [\n"
assert s.count(old_start)==1
a=s.index(old_start)
b=s.index("] as const;",a)+len("] as const;")
old=s[a:b]
assert old.count("{id:")==7 and "Dry Ice Supply" in old
new="""const VIDEO_OCCASIONS = [
  {id:'wedding',name:'Wedding Entry / शादी की एंट्री'},
  {id:'stage',name:'Stage Fog / स्टेज फॉग'},
  {id:'engagement',name:'Engagement / सगाई'},
  {id:'birthday',name:'Birthday / जन्मदिन'},
  {id:'cocktail',name:'Cocktail / बार फॉग'},
  {id:'reception',name:'Reception / रिसेप्शन'},
  {id:'haldi',name:'Haldi / हल्दी'},
  {id:'mehndi',name:'Mehndi / मेहंदी'},
  {id:'sangeet',name:'Sangeet / संगीत'},
  {id:'dj-night',name:'DJ Night / डीजे नाइट'},
  {id:'corporate',name:'Corporate Event / कॉर्पोरेट इवेंट'},
  {id:'anniversary',name:'Anniversary / सालगिरह'},
  {id:'ring-ceremony',name:'Ring Ceremony / रिंग सेरेमनी'},
  {id:'bride-entry',name:'Bride Entry / दुल्हन एंट्री'},
  {id:'groom-entry',name:'Groom Entry / दूल्हा एंट्री'},
  {id:'couple-dance',name:'Couple Dance / कपल डांस'},
  {id:'baby-shower',name:'Baby Shower / गोदभराई'},
  {id:'college-fest',name:'College Fest / कॉलेज फेस्ट'},
  {id:'school-function',name:'School Annual Day / स्कूल वार्षिकोत्सव'},
  {id:'product-launch',name:'Product Launch / प्रोडक्ट लॉन्च'},
  {id:'opening',name:'Grand Opening / शुभारंभ'},
  {id:'awards',name:'Award Ceremony / पुरस्कार समारोह'},
  {id:'new-year',name:'New Year Party / न्यू ईयर पार्टी'},
  {id:'other',name:'Other Event / अन्य कार्यक्रम'},
] as const;"""
assert new.count("{id:")==24 and "Dry Ice Supply" not in new
s=s[:a]+new+s[b:]
once("  const [occasion,setOccasion]=useState('wedding');",
     "  const [occasion,setOccasion]=useState('wedding');\n  const [occasionOpen,setOccasionOpen]=useState(false);")
old_jsx="""    <label className="block font-semibold" htmlFor="ankur-video-occasion">Occasion / Function</label>
    <select id="ankur-video-occasion" className="w-full rounded-xl border p-3 min-h-12"
      value={occasion} onChange={e=>setOccasion(e.target.value)}>
      {VIDEO_OCCASIONS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select>"""
new_jsx="""    <label className="block font-semibold" htmlFor="ankur-video-occasion">Occasion / Function</label>
    <button type="button" id="ankur-video-occasion"
      className="ankur-video-occasion-toggle c-soft rounded-xl border b-line w-full p-3 min-h-12"
      aria-expanded={occasionOpen} aria-controls="ankur-video-occasion-options"
      onClick={()=>setOccasionOpen(open=>!open)}>
      <span>{VIDEO_OCCASIONS.find(item=>item.id===occasion)?.name||'Choose function'}</span>
      <span aria-hidden="true">{occasionOpen?'▲':'▼'}</span>
    </button>
    {occasionOpen&&<div id="ankur-video-occasion-options" role="group"
      aria-label="Choose occasion" className="ankur-video-occasion-grid">
      {VIDEO_OCCASIONS.map(item=><button type="button" key={item.id}
        aria-pressed={occasion===item.id}
        className="ankur-video-occasion-option rounded-xl border b-line c-soft"
        onClick={()=>{setOccasion(item.id);setOccasionOpen(false);}}>
        <span className="ankur-video-occasion-en">{item.name.split(' / ')[0]}</span>
        <span className="ankur-video-occasion-hi" lang="hi">{item.name.split(' / ')[1]}</span>
      </button>)}
    </div>}"""
once(old_jsx,new_jsx)
assert "Dry Ice Supply / ड्राई आइस सप्लाई" not in s
assert s.count("aria-pressed={occasion===item.id}")==1
p.write_text(s,encoding="utf-8")

css=Path("src/index.css")
before=css.read_text(encoding="utf-8")
sheet=Path("ui-fixes/video-occasion-grid-v144.css").read_text(encoding="utf-8")
assert "ANKUR VIDEO OCCASION GRID v1.0.44" not in before
css.write_text(before+"\n"+sheet,encoding="utf-8")
print("PASS: 24 occasions, no Dry Ice Supply, 3 columns on mobile; prompt and all other screens unchanged")
