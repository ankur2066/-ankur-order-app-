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
    if (winner) list.push({key: 'w', icon: '🏆', node: <span className="min-w-0 truncate">{hi ? 'आज के विजेता' : "Today's winner"}: {winner.name}, {winner.city}</span>});
    if (slides.offerText) list.push({key: 'o', icon: '🎁', node: <span className="min-w-0 line-clamp-2">{slides.offerText}</span>});
    if (slides.pollId && slides.pollQuestion && slides.pollOptions.length >= 2) list.push({key: 'p', icon: '🗳️', node: (
      <span className="min-w-0 flex-1">
        <span className="block truncate">{slides.pollQuestion}</span>
        {voted ? <span className="block text-xs font-bold">{hi ? 'धन्यवाद! आपका जवाब मिल गया।' : 'Thank you! Your answer is saved.'}</span> : (
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
    if (!list.length) for (const d of DEFAULT_HOME_SLIDES) list.push({key: d.key, icon: d.icon, node: <span className="min-w-0 line-clamp-2">{d.text}</span>});
    return list;
  }, [winner, slides, voted, hi, currentUser]);

  useEffect(() => {
    if (items.length < 2) { setIndex(0); return; }
    const t = window.setInterval(() => setIndex(i => (i + 1) % items.length), 4500);
    return () => window.clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  const item = items[index % items.length];
  return <div role="status" aria-live="polite" data-no-translate
    className="ankur-home-slides sticky top-0 z-20 mb-3 rounded-2xl px-3 py-2.5 text-sm font-extrabold"
    style={{background: 'var(--status-pending-bg)', color: 'var(--status-pending-ink)', boxShadow: 'var(--shadow-raised)'}}>
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="text-lg">{item.icon}</span>
      {item.node}
    </div>
    {items.length > 1 && <div className="mt-1.5 flex justify-center gap-1" aria-hidden="true">
      {items.map((it, i) => <button key={it.key} type="button" tabIndex={-1} onClick={() => setIndex(i)}
        className="h-1.5 rounded-full" style={{width: i === index % items.length ? 16 : 6, background: 'currentColor', opacity: i === index % items.length ? 0.9 : 0.35}} />)}
    </div>}
  </div>;
};

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
