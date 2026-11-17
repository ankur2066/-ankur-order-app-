import React, {useEffect, useMemo, useState} from 'react';
import {doc, onSnapshot, setDoc, serverTimestamp} from 'firebase/firestore';
import type {User} from 'firebase/auth';
import {db} from '../../firebase';
import {useLanguage} from '../../context/LanguageContext';

/**
 * v1.0.67 (Ankur 2026-11-12): floating slide at the very top of customer Home.
 * Rotates Lucky Winner -> Offer -> Poll. Content comes from settings/homeSlides
 * (owner-only write, public read under the existing settings rule). The winner
 * slide also falls back to dailyWinners/{IST day} when the owner picked one there.
 * Poll votes go to homePollVotes/{pollId}_{uid}; that needs the new rule, and
 * a denied write still thanks the customer quietly.
 */
type Slides = {
  winnerName: string; winnerCity: string;
  offerText: string;
  pollId: string; pollQuestion: string; pollOptions: string[];
};
const EMPTY: Slides = {winnerName: '', winnerCity: '', offerText: '', pollId: '', pollQuestion: '', pollOptions: []};
/**
 * v1.0.71 (Ankur 2026-11-13): built-in slides shown when settings/homeSlides is
 * empty (no owner winner/offer/poll), so the banner never disappears. Any owner
 * slide replaces all of these. Read-only: nothing is written to Firestore.
 */
export const DEFAULT_HOME_SLIDES: readonly {key: string; icon: string; text: string}[] = [
  {key: 'd-brand', icon: '❄️', text: 'Ankur Dry Ice — लखनऊ में ड्राई आइस, होलसेल और रिटेल'},
  {key: 'd-delivery', icon: '🚚', text: 'Alambagh, Kaiserbagh, Porter या गोदाम से पिकअप'},
  {key: 'd-help', icon: '📞', text: 'ऑर्डर/मदद: 95808 82066'},
];
const istDay = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const readSlides = (v: Record<string, unknown> | undefined): Slides => {
  if (!v) return EMPTY;
  const opts = Array.isArray(v.pollOptions) ? v.pollOptions.map(o => clean(o, 40)).filter(Boolean).slice(0, 4) : [];
  return {
    winnerName: clean(v.winnerName, 70), winnerCity: clean(v.winnerCity, 45),
    offerText: clean(v.offerText, 140),
    pollId: clean(v.pollId, 40), pollQuestion: clean(v.pollQuestion, 120), pollOptions: opts,
  };
};

/** v1.0.71: rendered at the very top of customer Home (CustomerHome topSlot). */
export const HomeSlides: React.FC<{currentUser: User | null}> = ({currentUser}) => {
  const {language} = useLanguage();
  const hi = language === 'hi';
  const [slides, setSlides] = useState<Slides>(EMPTY);
  const [daily, setDaily] = useState<{name: string; city: string} | null>(null);
  const [index, setIndex] = useState(0);
  const [voted, setVoted] = useState<string>('');

  useEffect(() => onSnapshot(doc(db, 'settings', 'homeSlides'), s => setSlides(readSlides(s.data())), () => setSlides(EMPTY)), []);
  useEffect(() => {
    const day = istDay();
    return onSnapshot(doc(db, 'dailyWinners', day), s => {
      const v = s.data();
      setDaily(s.exists() && v?.active === true && v.date === day && clean(v.name, 70) && clean(v.city, 45)
        ? {name: clean(v.name, 70), city: clean(v.city, 45)} : null);
    }, () => setDaily(null));
  }, []);
  useEffect(() => { if (slides.pollId) setVoted(localStorage.getItem(`ankurPoll:${slides.pollId}`) || ''); }, [slides.pollId]);

  const winner = daily || (slides.winnerName && slides.winnerCity ? {name: slides.winnerName, city: slides.winnerCity} : null);
  const items = useMemo(() => {
    const list: {key: string; icon: string; node: React.ReactNode}[] = [];
    if (winner) list.push({key: 'w', icon: '🏆', node: <><span className="ankur-hb-headline">{hi ? 'आज के विजेता' : "Today's winner"}:</span><span className="ankur-hb-sub"> {winner.name}, {winner.city}</span></>});
    if (slides.offerText) list.push({key: 'o', icon: '🎁', node: <span className="ankur-hb-headline line-clamp-3">{slides.offerText}</span>});
    if (slides.pollId && slides.pollQuestion && slides.pollOptions.length >= 2) list.push({key: 'p', icon: '🗳️', node: (
      <span className="min-w-0 flex-1">
        <span className="ankur-hb-headline line-clamp-2" style={{fontSize: 19}}>{slides.pollQuestion}</span>
        {voted ? <span className="ankur-hb-sub">{hi ? 'धन्यवाद! आपका जवाब मिल गया।' : 'Thank you! Your answer is saved.'}</span> : (
          <span className="mt-1 flex flex-wrap gap-1">
            {slides.pollOptions.map(opt => <button key={opt} type="button" className="ankur-poll-option rounded-full px-2.5 py-0.5 text-xs font-bold c-card b-line border"
              onClick={async () => {
                localStorage.setItem(`ankurPoll:${slides.pollId}`, opt); setVoted(opt);
                if (!currentUser) return;
                try { await setDoc(doc(db, 'homePollVotes', `${slides.pollId}_${currentUser.uid}`), {pollId: slides.pollId, uid: currentUser.uid, option: opt, votedAt: serverTimestamp()}); } catch { /* rule not published yet */ }
              }}>{opt}</button>)}
          </span>
        )}
      </span>
    )});
    if (!list.length) for (const d of DEFAULT_HOME_SLIDES) list.push({key: d.key, icon: d.icon, node: <BannerText text={d.text} />});
    return list;
  }, [winner, slides, voted, hi, currentUser]);

  useEffect(() => {
    if (items.length < 2) { setIndex(0); return; }
    const t = window.setInterval(() => setIndex(i => (i + 1) % items.length), 4500);
    return () => window.clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  const at = index % items.length;
  const item = items[at];
  // v1.0.76 (Ankur, 14 Nov 2026): big, colourful, 3D banner like Blinkit's home banners:
  // ~164px tall, one vibrant gradient per slide, white bold headline, 3D picture on the
  // right, soft depth shadow, dots below. Auto-slide (4.5 s) unchanged.
  return <div role="status" aria-live="polite" data-no-translate
    className={`ankur-home-slides ankur-hb ankur-hb-tone-${at % 5} mb-3`}>
    <div className="ankur-hb-row">
      <div className="ankur-hb-copy">{item.node}</div>
      <span aria-hidden="true" className="ankur-hb-art">
        {item.icon === '❄️' ? <IceCube3D /> : <span className="ankur-hb-emoji">{item.icon}</span>}
      </span>
    </div>
    {items.length > 1 && <div className="ankur-hb-dots" aria-hidden="true">
      {items.map((it, i) => <button key={it.key} type="button" tabIndex={-1} onClick={() => setIndex(i)}
        className="ankur-hb-dot" style={{width: i === at ? 22 : 7, opacity: i === at ? 1 : 0.5}} />)}
    </div>}
  </div>;
};

/** "Headline — sub line" -> big headline + smaller line (the dash stays for screen readers). */
const BannerText: React.FC<{text: string}> = ({text}) => {
  const cut = text.indexOf(' — ');
  if (cut < 0) return <span className="ankur-hb-headline">{text}</span>;
  return <>
    <span className="ankur-hb-headline">{text.slice(0, cut)}</span>
    <span className="sr-only"> — </span>
    <span className="ankur-hb-sub">{text.slice(cut + 3)}</span>
  </>;
};

/** v1.0.76: 3D-looking dry-ice cube (three shaded faces, gloss, cold vapour). */
const IceCube3D: React.FC = () => <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="ankurIceTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="hsl(195 100% 98%)" /><stop offset="1" stopColor="hsl(197 90% 84%)" /></linearGradient>
    <linearGradient id="ankurIceLeft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="hsl(199 85% 80%)" /><stop offset="1" stopColor="hsl(205 75% 60%)" /></linearGradient>
    <linearGradient id="ankurIceRight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="hsl(200 80% 70%)" /><stop offset="1" stopColor="hsl(210 70% 48%)" /></linearGradient>
  </defs>
  <path d="M22 30 Q40 18 58 28 M66 22 Q84 10 100 22" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="5" strokeLinecap="round" />
  <polygon points="60,38 100,58 60,78 20,58" fill="url(#ankurIceTop)" />
  <polygon points="20,58 60,78 60,112 20,92" fill="url(#ankurIceLeft)" />
  <polygon points="60,78 100,58 100,92 60,112" fill="url(#ankurIceRight)" />
  <polygon points="60,38 100,58 60,78 20,58" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2" strokeLinejoin="round" />
  <path d="M32 62 L44 68 M30 72 L30 84 M70 86 L86 78" stroke="rgba(255,255,255,.85)" strokeWidth="3" strokeLinecap="round" />
  <circle cx="48" cy="52" r="5" fill="rgba(255,255,255,.95)" />
</svg>;

/** Owner Tools: edit the winner, offer and poll shown in the customer slide. */
export const HomeSlidesOwnerControls: React.FC = () => {
  const {language} = useLanguage();
  const hi = language === 'hi';
  const [form, setForm] = useState<Slides>(EMPTY);
  const [optionsText, setOptionsText] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Slides>(EMPTY);
  useEffect(() => onSnapshot(doc(db, 'settings', 'homeSlides'), s => { const v = readSlides(s.data()); setSaved(v); setForm(v); setOptionsText(v.pollOptions.join(', ')); }, () => {}), []);
  const field = (label: string, key: 'winnerName' | 'winnerCity' | 'offerText' | 'pollQuestion', max: number) =>
    <label className="block text-xs font-bold t-sub">{label}
      <input className="mt-1 w-full rounded-lg border b-line c-card px-3 py-2 text-sm t-main" maxLength={max}
        value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} />
    </label>;
  const save = async () => {
    setBusy(true); setMsg('');
    const opts = optionsText.split(',').map(o => o.trim()).filter(Boolean).slice(0, 4);
    const pollQuestion = form.pollQuestion.trim();
    const sameQuestion = !!pollQuestion && pollQuestion === saved.pollQuestion && !!saved.pollId;
    try {
      await setDoc(doc(db, 'settings', 'homeSlides'), {
        winnerName: form.winnerName.trim(), winnerCity: form.winnerCity.trim(), offerText: form.offerText.trim(),
        pollQuestion, pollOptions: opts, pollId: pollQuestion ? (sameQuestion ? saved.pollId : `p${Date.now()}`) : '',
        updatedAt: serverTimestamp(),
      });
      setMsg(hi ? 'सेव हो गया। ग्राहक के होम पर दिखेगा।' : 'Saved. Customers will see it on Home.');
    } catch { setMsg(hi ? 'सेव नहीं हुआ, दोबारा कोशिश करें।' : 'Could not save, please try again.'); }
    setBusy(false);
  };
  return <section className="ankur-home-slides-owner mt-4 rounded-2xl border b-line c-card p-4 space-y-3">
    <h3 className="text-base font-extrabold t-main">{hi ? 'होम स्लाइड: विजेता, ऑफ़र, पोल' : 'Home slide: winner, offer, poll'}</h3>
    <div className="grid grid-cols-2 gap-2">{field(hi ? 'विजेता का नाम' : 'Winner name', 'winnerName', 70)}{field(hi ? 'शहर' : 'City', 'winnerCity', 45)}</div>
    {field(hi ? 'ऑफ़र (खाली = नहीं दिखेगा)' : 'Offer (empty = hidden)', 'offerText', 140)}
    {field(hi ? 'पोल का सवाल' : 'Poll question', 'pollQuestion', 120)}
    <label className="block text-xs font-bold t-sub">{hi ? 'पोल के विकल्प (कॉमा से अलग, 2 से 4)' : 'Poll options (comma separated, 2 to 4)'}
      <input className="mt-1 w-full rounded-lg border b-line c-card px-3 py-2 text-sm t-main" value={optionsText} onChange={e => setOptionsText(e.target.value)} />
    </label>
    <button type="button" disabled={busy} onClick={save} className="focus-ring rounded-xl c-brand px-4 py-2 text-sm font-extrabold">{busy ? (hi ? 'सेव हो रहा…' : 'Saving…') : (hi ? 'सेव करें' : 'Save')}</button>
    {msg && <p role="status" className="text-xs font-bold t-sub">{msg}</p>}
  </section>;
};
