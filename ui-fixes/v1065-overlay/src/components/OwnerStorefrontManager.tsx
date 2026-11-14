import React, { useEffect, useState } from 'react';
import { RETAIL_RATE_PER_KG } from '../config/businessConfig';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import {
  Check,
  EyeOff,
  Eye,
  ImagePlus,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Snowflake,
  Store,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { UnitProductManager } from './UnitProductManager';
import { seedCatalog, useAllProducts } from '../hooks/useProducts';
import { useTheme } from '../context/ThemeContext';
import { THEMES } from '../theme/themes';
import { CATEGORY_OPTIONS, categoryLabel, followsGlobalRates, LEGACY_PRODUCT_IDS } from '../data/catalog';
import { DEFAULT_BANNERS } from '../hooks/useStorefrontSettings';
import { resizeImageToJpeg } from '../utils/imageResize';
import { LuckyWinnerCard } from './customer/LuckyWinnerCard';
import type { LuckyWinner, ProductItem, PromoAction, PromoBanner, ThemeId } from '../types';

type SubTab = 'products' | 'theme' | 'home';

interface FormState {
  id: string | null;
  name: string;
  hindiName: string;
  category: string;
  ownPrice: boolean;
  ratePerKg: string;
  thermocolPerKg: string;
  mrpPerKg: string;
  unit: string;
  badge: string;
  description: string;
  imageUrl: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  hindiName: '',
  category: 'dry_ice',
  ownPrice: true,
  ratePerKg: '',
  thermocolPerKg: '10',
  mrpPerKg: '',
  unit: 'kg',
  badge: '',
  description: '',
  imageUrl: '',
  active: false, // new products start hidden until the owner turns them on
};

const ACTION_LABELS: Record<PromoAction, string> = {
  order: 'बुकिंग खोलें',
  categories: 'कैटेगरी खोलें',
  call: 'कॉल करें',
  whatsapp: 'WhatsApp खोलें',
  none: 'कुछ नहीं',
};

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-900';

export const OwnerStorefrontManager: React.FC = () => {
  const [tab, setTab] = useState<SubTab>('products');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    if (kind === 'ok') setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
      <div className="pb-3 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-sky-600" />
          स्टोर, थीम और होम स्क्रीन
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">ग्राहकों को दिखने वाले प्रोडक्ट, रंग, ऑफ़र बैनर और लकी विनर यहाँ से बदलें।</p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100" role="tablist">
        {([
          ['products', 'प्रोडक्ट'],
          ['theme', 'थीम'],
          ['home', 'होम / लकी विनर'],
        ] as [SubTab, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`py-2 rounded-lg text-xs sm:text-sm font-extrabold cursor-pointer ${tab === id ? 'bg-sky-500 text-white' : 'text-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <div
          role={msg.kind === 'err' ? 'alert' : 'status'}
          className={`p-3 rounded-xl text-xs flex items-start justify-between gap-2 ${msg.kind === 'err' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}
        >
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} aria-label="बंद करें"><X className="w-4 h-4" /></button>
        </div>
      )}

      {tab === 'products' && <div className="space-y-6"><UnitProductManager /><ProductsPanel flash={flash} /></div>}
      {tab === 'theme' && <ThemePanel flash={flash} />}
      {tab === 'home' && <HomePanel flash={flash} />}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

const ProductsPanel: React.FC<{ flash: (k: 'ok' | 'err', t: string) => void }> = ({ flash }) => {
  const { products, loading, seeded, error } = useAllProducts(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const startEdit = (p: ProductItem) =>
    setForm({
      id: p.id,
      name: p.name,
      hindiName: p.hindiName,
      category: p.category || 'dry_ice',
      ownPrice: !followsGlobalRates(p),
      ratePerKg: String(p.ratePerKg),
      thermocolPerKg: String(p.thermocolPerKg),
      mrpPerKg: p.mrpPerKg ? String(p.mrpPerKg) : '',
      unit: p.unit || 'kg',
      badge: p.badge || '',
      description: p.description || '',
      imageUrl: p.imageUrl || '',
      active: p.active,
    });

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const created = await seedCatalog();
      flash('ok', created > 0 ? `${created} मौजूदा प्रोडक्ट कैटलॉग में सेव हो गए।` : 'कैटलॉग पहले से सेव था; जाँच पूरी।');
    } catch (err: any) {
      flash('err', 'कैटलॉग सेव नहीं हो सका: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleToggle = async (p: ProductItem) => {
    try {
      await updateDoc(doc(db, 'products', p.id), { active: !p.active, updatedAt: serverTimestamp() });
    } catch (err: any) {
      flash('err', 'स्टेटस बदलने में त्रुटि: ' + err.message);
    }
  };

  const handleDelete = async (p: ProductItem) => {
    if (LEGACY_PRODUCT_IDS.includes(p.id)) {
      flash('err', 'मौजूदा प्रोडक्ट हटाए नहीं जाते। उसे “बंद” कर दें।');
      return;
    }
    if (!window.confirm(`“${p.hindiName}” हमेशा के लिए हटाएँ? (पुराने ऑर्डर प्रभावित नहीं होंगे)`)) return;
    try {
      await deleteDoc(doc(db, 'products', p.id));
      flash('ok', 'प्रोडक्ट हटा दिया गया।');
    } catch (err: any) {
      flash('err', 'हटाने में त्रुटि: ' + err.message);
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !form) return;
    if (!file.type.startsWith('image/')) {
      flash('err', 'कृपया इमेज फ़ाइल चुनें।');
      return;
    }
    try {
      setUploading(true);
      const blob = await resizeImageToJpeg(file, 900, 0.82);
      const key = form.id || `new_${Date.now().toString(36)}`;
      const r = storageRef(storage, `products/${key}_${Date.now()}.jpg`);
      await uploadBytes(r, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(r);
      set('imageUrl', url);
      flash('ok', 'इमेज अपलोड हो गई। नीचे “सहेजें” दबाना न भूलें।');
    } catch (err: any) {
      flash(
        'err',
        'इमेज अपलोड नहीं हो सकी: ' +
          (err?.message || '') +
          ' — जाँचें कि Firebase Storage चालू है और storage.rules लगे हैं। चाहें तो नीचे https:// इमेज लिंक चिपका दें।'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const rate = parseFloat(form.ratePerKg);
    const thermo = parseFloat(form.thermocolPerKg);
    if (form.name.trim().length < 2 || form.hindiName.trim().length < 2) {
      flash('err', 'प्रोडक्ट का हिंदी और अंग्रेज़ी नाम दोनों भरें।');
      return;
    }
    if (form.ownPrice && (!(rate > 0) || !(thermo >= 0))) {
      flash('err', 'सही कीमत भरें (ड्राई आइस की कीमत 0 से ज़्यादा होनी चाहिए)।');
      return;
    }
    const url = form.imageUrl.trim();
    if (url && !url.startsWith('https://')) {
      flash('err', 'इमेज लिंक https:// से शुरू होना चाहिए।');
      return;
    }

    const existing = products.find((p) => p.id === form.id);
    const id = form.id || `p_${Date.now().toString(36)}`;
    const payload: Record<string, any> = {
      id,
      name: form.name.trim().slice(0, 100),
      hindiName: form.hindiName.trim().slice(0, 100),
      category: form.category,
      ratePerKg: form.ownPrice ? rate : existing?.ratePerKg ?? RETAIL_RATE_PER_KG,
      thermocolPerKg: form.ownPrice ? thermo : existing?.thermocolPerKg ?? 10,
      active: form.active,
      useGlobalRates: !form.ownPrice,
      unit: (form.unit.trim() || 'kg').slice(0, 20),
      sortOrder: existing?.sortOrder ?? 100,
      updatedAt: serverTimestamp(),
    };
    if (form.badge.trim()) payload.badge = form.badge.trim().slice(0, 30);
    if (form.description.trim()) payload.description = form.description.trim().slice(0, 300);
    if (url) payload.imageUrl = url.slice(0, 1000);
    const mrp = parseFloat(form.mrpPerKg);
    if (mrp > 0) payload.mrpPerKg = mrp;

    try {
      setSaving(true);
      await setDoc(doc(db, 'products', id), payload);
      flash('ok', form.id ? 'प्रोडक्ट अपडेट हो गया।' : 'नया प्रोडक्ट जुड़ गया' + (form.active ? '।' : ' (अभी ग्राहकों से छिपा है)।'));
      setForm(null);
    } catch (err: any) {
      flash('err', 'सहेजने में त्रुटि: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {!seeded && !loading && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
          <p className="leading-relaxed">
            अभी ग्राहकों को ऐप में बने 3 मौजूदा प्रोडक्ट दिख रहे हैं। इन्हें Firestore में सेव करने पर आप इन्हें एडिट, बंद या इमेज के साथ मैनेज कर पाएँगे। कोई पुराना डेटा बदला या मिटाया नहीं जाएगा।
          </p>
          <button type="button" onClick={handleSeed} disabled={seeding} className="px-3.5 py-2 rounded-lg bg-sky-600 text-white font-extrabold disabled:opacity-60 cursor-pointer flex items-center gap-1.5">
            {seeding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            मौजूदा 3 प्रोडक्ट कैटलॉग में सेव करें
          </button>
        </div>
      )}

      {error && <p className="text-xs text-rose-700">प्रोडक्ट लोड नहीं हुए: {error}</p>}

      {!form && (
        <button
          type="button"
          onClick={() => setForm({ ...EMPTY_FORM })}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-400 text-sky-700 text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> नया प्रोडक्ट जोड़ें
        </button>
      )}

      {form && (
        <form onSubmit={handleSave} className="p-3.5 rounded-xl border border-sky-200 bg-slate-50 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900">{form.id ? 'प्रोडक्ट एडिट करें' : 'नया प्रोडक्ट'}</h4>
            <button type="button" onClick={() => setForm(null)} aria-label="बंद करें"><X className="w-4 h-4 text-slate-500" /></button>
          </div>

          <input className={inputCls} placeholder="हिंदी नाम (जैसे ड्राई आइस पेलेट्स)" value={form.hindiName} onChange={(e) => set('hindiName', e.target.value)} />
          <input className={inputCls} placeholder="English name" value={form.name} onChange={(e) => set('name', e.target.value)} />

          <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)} aria-label="कैटेगरी">
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-sky-600" checked={form.ownPrice} onChange={(e) => set('ownPrice', e.target.checked)} />
            इस प्रोडक्ट की अपनी कीमत रखें
          </label>
          {!form.ownPrice && (
            <p className="text-[11px] text-slate-500">यह प्रोडक्ट “रेट” सेटिंग वाला सामान्य रेट इस्तेमाल करेगा (पहले जैसा व्यवहार)।</p>
          )}
          {form.ownPrice && (
            <div className="grid grid-cols-3 gap-2">
              <input className={inputCls} inputMode="decimal" placeholder="ड्राई आइस ₹/kg" value={form.ratePerKg} onChange={(e) => set('ratePerKg', e.target.value)} />
              <input className={inputCls} inputMode="decimal" placeholder="थर्मोकोल ₹/kg" value={form.thermocolPerKg} onChange={(e) => set('thermocolPerKg', e.target.value)} />
              <input className={inputCls} inputMode="decimal" placeholder="कटा हुआ MRP (वैकल्पिक)" value={form.mrpPerKg} onChange={(e) => set('mrpPerKg', e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="यूनिट (kg)" value={form.unit} onChange={(e) => set('unit', e.target.value)} />
            <input className={inputCls} placeholder="बैज (जैसे बेस्ट सेलर)" value={form.badge} onChange={(e) => set('badge', e.target.value)} />
          </div>
          <textarea className={inputCls} rows={2} placeholder="छोटा विवरण (वैकल्पिक)" value={form.description} onChange={(e) => set('description', e.target.value)} />

          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-white border border-dashed border-slate-300 flex items-center justify-center">
                  <Snowflake className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <label className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs font-extrabold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {uploading ? 'अपलोड हो रही है…' : 'इमेज अपलोड करें'}
                <input type="file" accept="image/*" className="sr-only" onChange={handleImage} disabled={uploading} />
              </label>
              {form.imageUrl && (
                <button type="button" onClick={() => set('imageUrl', '')} className="text-xs font-bold text-rose-600 cursor-pointer">हटाएँ</button>
              )}
            </div>
            <input className={inputCls} placeholder="या https:// इमेज लिंक चिपकाएँ" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm font-extrabold text-slate-800 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-sky-600" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
            ग्राहकों को दिखाएँ (चालू)
          </label>

          <button type="submit" disabled={saving || uploading} className="w-full py-2.5 rounded-xl bg-sky-600 text-white text-sm font-extrabold disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} सहेजें
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-slate-500">लोड हो रहा है…</p>
      ) : products.length === 0 ? (
        <p className="text-xs text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-200">कैटलॉग में अभी कोई प्रोडक्ट नहीं है।</p>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => (
            <li key={p.id} className={`p-2.5 rounded-xl border flex items-center gap-3 ${p.active ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-80'}`}>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <Snowflake className="w-5 h-5 text-sky-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900 truncate">{p.hindiName}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {categoryLabel(p.category)} · {followsGlobalRates(p) ? 'सामान्य रेट' : `₹${p.ratePerKg + p.thermocolPerKg}/kg`} · {p.active ? 'ग्राहकों को दिखता है' : 'छिपा हुआ'}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => handleToggle(p)} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer" aria-label={p.active ? 'बंद करें' : 'चालू करें'}>
                  {p.active ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                </button>
                <button type="button" onClick={() => startEdit(p)} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer" aria-label="एडिट करें">
                  <Pencil className="w-4 h-4 text-sky-600" />
                </button>
                <button type="button" onClick={() => handleDelete(p)} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer" aria-label="हटाएँ">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

const ThemePanel: React.FC<{ flash: (k: 'ok' | 'err', t: string) => void }> = ({ flash }) => {
  const { themeId, previewTheme } = useTheme();
  const [savingId, setSavingId] = useState<ThemeId | null>(null);

  const choose = async (id: ThemeId) => {
    previewTheme(id);
    try {
      setSavingId(id);
      await setDoc(doc(db, 'settings', 'theme'), {
        themeId: id,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || '',
      });
      flash('ok', 'थीम सेव हो गई। ग्राहक, स्टाफ और ओनर सबको अगली बार ऐप खुलने पर (या लाइव) यही दिखेगी।');
    } catch (err: any) {
      previewTheme(themeId);
      flash('err', 'थीम सेव नहीं हो सकी: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 leading-relaxed">
        चुनते ही थीम सबके लिए सेव हो जाती है। पुरानी स्क्रीनों (ओनर/स्टाफ डैशबोर्ड) में मुख्य रंग बदलता है; डार्क थीम पुरानी स्क्रीनों में आंशिक रूप से लागू होती है।
      </p>
      <ul className="grid grid-cols-2 gap-2.5">
        {THEMES.map((t) => {
          const selected = themeId === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => choose(t.id)}
                aria-pressed={selected}
                className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 cursor-pointer ${selected ? 'border-sky-500 bg-sky-50' : 'border-slate-200'}`}
              >
                <span className="w-10 h-10 rounded-full border border-black/10 shrink-0 flex items-center justify-center" style={{ background: t.swatch }}>
                  {savingId === t.id ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : selected ? <Check className="w-5 h-5 text-white" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900">{t.hindi}</span>
                  <span className="block text-[11px] text-slate-500">{t.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-slate-500 flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> अभी चालू: {THEMES.find((t) => t.id === themeId)?.hindi}</p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Home: lucky winner + promo banners                                  */
/* ------------------------------------------------------------------ */

const HomePanel: React.FC<{ flash: (k: 'ok' | 'err', t: string) => void }> = ({ flash }) => {
  const [winner, setWinner] = useState<LuckyWinner>({ active: false, name: '', city: '', dateLabel: 'आज' });
  const [banners, setBanners] = useState<PromoBanner[]>(DEFAULT_BANNERS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [w, h] = await Promise.all([getDoc(doc(db, 'settings', 'luckyWinner')), getDoc(doc(db, 'settings', 'home'))]);
        if (!alive) return;
        if (w.exists()) setWinner({ active: false, name: '', city: '', ...(w.data() as LuckyWinner) });
        if (h.exists() && Array.isArray(h.data().banners) && h.data().banners.length) setBanners(h.data().banners);
      } catch (err: any) {
        flash('err', 'सेटिंग्स लोड नहीं हुईं: ' + err.message);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveWinner = async (next: LuckyWinner) => {
    try {
      await setDoc(doc(db, 'settings', 'luckyWinner'), {
        active: next.active,
        name: next.name.trim().slice(0, 40),
        city: next.city.trim().slice(0, 40),
        dateLabel: (next.dateLabel || '').trim().slice(0, 20),
        updatedAt: serverTimestamp(),
      });
      setWinner(next);
      flash('ok', next.active ? 'लकी विनर होम स्क्रीन पर दिखने लगा।' : 'लकी विनर कार्ड छिपा दिया गया।');
    } catch (err: any) {
      flash('err', 'लकी विनर सेव नहीं हुआ: ' + err.message);
    }
  };

  const saveBanners = async () => {
    const clean = banners
      .filter((b) => b.title.trim())
      .slice(0, 6)
      .map((b, i) => ({ id: b.id || `b${i + 1}`, title: b.title.trim().slice(0, 60), subtitle: b.subtitle.trim().slice(0, 90), action: b.action }));
    try {
      await setDoc(doc(db, 'settings', 'home'), { banners: clean, updatedAt: serverTimestamp() });
      setBanners(clean.length ? clean : DEFAULT_BANNERS);
      flash('ok', 'ऑफ़र बैनर सेव हो गए।');
    } catch (err: any) {
      flash('err', 'बैनर सेव नहीं हुए: ' + err.message);
    }
  };

  const resetBanners = async () => {
    try {
      await deleteDoc(doc(db, 'settings', 'home'));
      setBanners(DEFAULT_BANNERS);
      flash('ok', 'डिफ़ॉल्ट बैनर वापस लग गए।');
    } catch (err: any) {
      flash('err', 'रीसेट नहीं हुआ: ' + err.message);
    }
  };

  const updateBanner = (idx: number, patch: Partial<PromoBanner>) =>
    setBanners((list) => list.map((b, i) => (i === idx ? { ...b, ...patch } : b)));

  if (!loaded) return <p className="text-xs text-slate-500">लोड हो रहा है…</p>;

  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2"><Trophy className="w-4 h-4 text-sky-600" /> लकी विनर</h4>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          ग्राहकों को सिर्फ़ नाम, शहर और “खास गिफ्ट” लिखा दिखता है। गिफ्ट क्या है, यह आप अलग से विजेता को बताएँ। निजता के लिए पूरा नाम या फोन नंबर न डालें (सिर्फ़ पहला नाम काफ़ी है)।
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder="विजेता का नाम" value={winner.name} maxLength={40} onChange={(e) => setWinner({ ...winner, name: e.target.value })} />
          <input className={inputCls} placeholder="शहर" value={winner.city} maxLength={40} onChange={(e) => setWinner({ ...winner, city: e.target.value })} />
        </div>
        <input className={inputCls} placeholder="कब का (जैसे आज / 29 अक्टूबर)" value={winner.dateLabel || ''} maxLength={20} onChange={(e) => setWinner({ ...winner, dateLabel: e.target.value })} />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!winner.name.trim() || !winner.city.trim()}
            onClick={() => saveWinner({ ...winner, active: true })}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-extrabold disabled:opacity-50 cursor-pointer"
          >
            दिखाएँ
          </button>
          <button type="button" onClick={() => saveWinner({ ...winner, active: false })} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-extrabold cursor-pointer">
            छिपाएँ
          </button>
        </div>
        {winner.name.trim() && winner.city.trim() && (
          <div className="rounded-2xl p-2 bg-slate-100">
            <p className="text-[10px] text-slate-500 mb-1.5 px-1">पूर्वावलोकन</p>
            <div className="-mx-4"><LuckyWinnerCard winner={{ ...winner, active: true }} /></div>
          </div>
        )}
      </section>

      <section className="space-y-2.5">
        <h4 className="text-sm font-black text-slate-900">ऑफ़र बैनर (होम स्क्रीन कैरोसेल)</h4>
        <ul className="space-y-2.5">
          {banners.map((b, i) => (
            <li key={b.id + i} className="p-2.5 rounded-xl border border-slate-200 space-y-2">
              <input className={inputCls} placeholder="शीर्षक" value={b.title} maxLength={60} onChange={(e) => updateBanner(i, { title: e.target.value })} />
              <input className={inputCls} placeholder="छोटी लाइन" value={b.subtitle} maxLength={90} onChange={(e) => updateBanner(i, { subtitle: e.target.value })} />
              <div className="flex items-center gap-2">
                <select className={inputCls} value={b.action} onChange={(e) => updateBanner(i, { action: e.target.value as PromoAction })}>
                  {(Object.keys(ACTION_LABELS) as PromoAction[]).map((a) => (
                    <option key={a} value={a}>टैप पर: {ACTION_LABELS[a]}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setBanners((list) => list.filter((_, idx) => idx !== i))} className="w-10 h-10 shrink-0 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer" aria-label="बैनर हटाएँ">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {banners.length < 6 && (
            <button
              type="button"
              onClick={() => setBanners((list) => [...list, { id: `b${Date.now().toString(36)}`, title: '', subtitle: '', action: 'order' }])}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-extrabold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> बैनर जोड़ें
            </button>
          )}
          <button type="button" onClick={saveBanners} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-extrabold cursor-pointer">सेव करें</button>
          <button type="button" onClick={resetBanners} className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer">डिफ़ॉल्ट पर लौटें</button>
        </div>
      </section>
    </div>
  );
};

export default OwnerStorefrontManager;
