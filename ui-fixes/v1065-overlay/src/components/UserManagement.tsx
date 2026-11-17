import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  UserRole,
  UserProfile,
  StaffRequest,
  StaffPermissions,
  DEFAULT_STAFF_PERMISSIONS,
} from '../types';
import { Users, Trash2, CheckCircle2, Bell, BellOff, Shield, Truck, UserCheck, X, AlertTriangle } from 'lucide-react';

type AssignableRole = Exclude<UserRole, 'admin'>;

const PERMISSION_LABELS: { key: keyof StaffPermissions; label: string }[] = [
  { key: 'viewOrders', label: 'ऑर्डर देख सकता है' },
  { key: 'updateStatus', label: 'ऑर्डर का स्टेटस बदल सकता है' },
  { key: 'toggleProducts', label: 'प्रोडक्ट चालू/बंद कर सकता है' },
];

function effectivePermission(u: UserProfile, key: keyof StaffPermissions): boolean {
  const v = u.permissions?.[key];
  return typeof v === 'boolean' ? v : DEFAULT_STAFF_PERMISSIONS[key];
}

const PermissionChecks: React.FC<{
  value: StaffPermissions;
  onChange: (next: StaffPermissions) => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-col gap-1.5">
    {PERMISSION_LABELS.map(({ key, label }) => (
      <label key={key} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={value[key]}
          onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
          className="w-4 h-4 accent-sky-600"
        />
        {label}
      </label>
    ))}
  </div>
);

/**
 * OWNER-ONLY screen (rendered inside the Owner Dashboard, and every write here is
 * also owner-only in firestore.rules). The owner approves staff, assigns roles
 * and changes permissions. Nobody else can do any of this.
 */
export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AssignableRole>('staff');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [newPerms, setNewPerms] = useState<StaffPermissions>({ ...DEFAULT_STAFF_PERMISSIONS });

  // Per-request approval choices (role + permissions) before the owner presses "मंज़ूर करें"
  const [approvalDraft, setApprovalDraft] = useState<Record<string, { role: AssignableRole; perms: StaffPermissions }>>({});

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setUsers(snapshot.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id })));
        setLoading(false);
      },
      (err) => {
        console.error('Error loading users:', err);
        setErrorMsg('यूज़र लोड नहीं हो सके: ' + err.message);
        setLoading(false);
      }
    );
    const unsubReq = onSnapshot(
      collection(db, 'staffRequests'),
      (snapshot) => {
        setRequests(snapshot.docs.map((d) => ({ ...(d.data() as StaffRequest), uid: d.id })));
      },
      (err) => console.error('Error loading staff requests:', err)
    );
    return () => {
      unsubUsers();
      unsubReq();
    };
  }, []);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const draftFor = (reqUid: string) =>
    approvalDraft[reqUid] || { role: 'staff' as AssignableRole, perms: { ...DEFAULT_STAFF_PERMISSIONS } };

  const handleApprove = async (req: StaffRequest) => {
    const draft = draftFor(req.uid);
    try {
      setErrorMsg(null);
      const batch = writeBatch(db);
      batch.set(
        doc(db, 'users', req.uid),
        {
          uid: req.uid,
          name: req.name || req.email.split('@')[0],
          email: req.email,
          role: draft.role,
          permissions: draft.perms,
          whatsappEnabled: true,
          approvedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      batch.delete(doc(db, 'staffRequests', req.uid));
      await batch.commit();
      flash(`${req.email} को ${draft.role === 'staff' ? 'स्टाफ' : 'डिलीवरी'} एक्सेस मिल गया।`);
    } catch (err: any) {
      setErrorMsg('मंज़ूरी में त्रुटि: ' + err.message);
    }
  };

  const handleReject = async (req: StaffRequest) => {
    if (!window.confirm(`${req.email} का अनुरोध हटाएँ?`)) return;
    try {
      await deleteDoc(doc(db, 'staffRequests', req.uid));
      flash('अनुरोध हटा दिया गया।');
    } catch (err: any) {
      setErrorMsg('अनुरोध हटाने में त्रुटि: ' + err.message);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid.trim()) {
      setErrorMsg('कृपया यूजर यूआईडी (UID) दर्ज करें।');
      return;
    }
    try {
      setErrorMsg(null);
      const cleanUid = uid.trim();
      await setDoc(
        doc(db, 'users', cleanUid),
        {
          uid: cleanUid,
          name: name.trim() || 'स्टाफ सदस्य',
          phone: phone.trim() || '',
          role,
          permissions: newPerms,
          whatsappEnabled,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      flash('स्टाफ सदस्य सफलतापूर्वक सहेजा गया!');
      setUid('');
      setName('');
      setPhone('');
    } catch (err: any) {
      setErrorMsg('यूज़र सहेजने में त्रुटि: ' + err.message);
    }
  };

  const handleTogglePermission = async (usr: UserProfile, key: keyof StaffPermissions, value: boolean) => {
    try {
      const current: StaffPermissions = {
        viewOrders: effectivePermission(usr, 'viewOrders'),
        updateStatus: effectivePermission(usr, 'updateStatus'),
        toggleProducts: effectivePermission(usr, 'toggleProducts'),
      };
      await updateDoc(doc(db, 'users', usr.uid), { permissions: { ...current, [key]: value } });
    } catch (err: any) {
      setErrorMsg('अनुमति बदलने में त्रुटि: ' + err.message);
    }
  };

  const handleChangeRole = async (usr: UserProfile, next: AssignableRole) => {
    try {
      await updateDoc(doc(db, 'users', usr.uid), { role: next });
    } catch (err: any) {
      setErrorMsg('रोल बदलने में त्रुटि: ' + err.message);
    }
  };

  const handleToggleWhatsapp = async (usr: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', usr.uid), { whatsappEnabled: usr.whatsappEnabled === false });
    } catch (err: any) {
      setErrorMsg('स्टेटस अपडेट करने में त्रुटि: ' + err.message);
    }
  };

  const handleCustomerType = async (usr: UserProfile, customerType: 'retail' | 'wholesale') => {
    try {
      await updateDoc(doc(db, 'users', usr.uid), { customerType, updatedAt: serverTimestamp() });
      flash(`${usr.name || usr.email || 'Customer'}: ${customerType}`);
    } catch (err: any) {
      setErrorMsg('ग्राहक प्रकार नहीं बदला जा सका: ' + err.message);
    }
  };

  // Revoke access but keep the person's customer profile fields.
  const handleRevoke = async (usr: UserProfile) => {
    if (!window.confirm(`${usr.name || usr.email || usr.uid} का एक्सेस हटाएँ? वह फिर सिर्फ़ ग्राहक की तरह ऐप इस्तेमाल कर पाएगा।`)) return;
    try {
      await updateDoc(doc(db, 'users', usr.uid), {
        role: deleteField(),
        permissions: deleteField(),
        whatsappEnabled: deleteField(),
      });
      flash('एक्सेस हटा दिया गया।');
    } catch (err: any) {
      setErrorMsg('एक्सेस हटाने में त्रुटि: ' + err.message);
    }
  };

  const team = users.filter((u) => u.role === 'staff' || u.role === 'delivery');
  const customers = users.filter((u) => !u.role || (u.role as string) === 'customer');
  const legacyAdminDocs = users.filter((u) => (u.role as string) === 'admin');

  return (
    <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
      <div className="pb-3 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-600" />
          स्टाफ मंज़ूरी, रोल और अनुमतियाँ
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          सिर्फ़ मालिक स्टाफ को मंज़ूर कर सकता है, रोल दे सकता है और अनुमतियाँ बदल सकता है। यह सर्वर के सिक्योरिटी रूल्स से भी लागू है।
        </p>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start justify-between gap-2">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} aria-label="बंद करें"><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMsg && (
        <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* ===== Pending requests ===== */}
      <section>
        <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-2">
          <UserCheck className="w-4 h-4 text-sky-600" />
          स्टाफ एक्सेस के अनुरोध ({requests.length})
        </h4>
        {requests.length === 0 ? (
          <p className="text-xs text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-200">
            कोई नया अनुरोध नहीं। स्टाफ को अपने Google अकाउंट से ऐप में लॉगिन करके “स्टाफ एक्सेस माँगें” दबाना होगा।
          </p>
        ) : (
          <ul className="space-y-3">
            {requests.map((req) => {
              const draft = draftFor(req.uid);
              return (
                <li key={req.uid} className="p-3 rounded-xl border border-amber-200 bg-amber-50 space-y-2.5">
                  <div>
                    <div className="text-sm font-black text-slate-900">{req.name || 'नाम नहीं दिया'}</div>
                    <div className="text-xs text-slate-600 break-all">{req.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">रोल:</span>
                    <select
                      value={draft.role}
                      onChange={(e) => setApprovalDraft((d) => ({ ...d, [req.uid]: { ...draft, role: e.target.value as AssignableRole } }))}
                      className="border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold"
                    >
                      <option value="staff">स्टाफ</option>
                      <option value="delivery">डिलीवरी बॉय</option>
                    </select>
                  </div>
                  <PermissionChecks
                    value={draft.perms}
                    onChange={(perms) => setApprovalDraft((d) => ({ ...d, [req.uid]: { ...draft, perms } }))}
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleApprove(req)} className="px-3.5 py-2 rounded-lg bg-sky-600 text-white text-xs font-extrabold cursor-pointer">
                      मंज़ूर करें
                    </button>
                    <button type="button" onClick={() => handleReject(req)} className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-extrabold cursor-pointer">
                      अस्वीकार करें
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h4 className="text-sm font-black text-slate-800 mb-2">ग्राहक प्रकार / Customer Type ({customers.length})</h4>
        <p className="text-xs text-slate-600 mb-2">नए ग्राहक Retail माने जाएँगे। Wholesale बदलने का अधिकार केवल मालिक को है।</p>
        <ul className="space-y-2">{customers.map((usr) => <li key={usr.uid} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
          <span className="min-w-0 text-sm font-semibold text-slate-800">{usr.name || usr.email || usr.uid}</span>
          <select aria-label={`${usr.name || usr.uid} customer type`} value={usr.customerType === 'wholesale' ? 'wholesale' : 'retail'} onChange={(e) => void handleCustomerType(usr, e.target.value as 'retail' | 'wholesale')} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900">
            <option value="retail">Retail</option><option value="wholesale">Wholesale</option>
          </select>
        </li>)}</ul>
      </section>

      {/* ===== Current team ===== */}
      <section>
        <h4 className="text-sm font-black text-slate-800 mb-2">मौजूदा टीम ({team.length})</h4>
        {loading ? (
          <p className="text-xs text-slate-500">लोड हो रहा है…</p>
        ) : team.length === 0 ? (
          <p className="text-xs text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-200">अभी कोई स्टाफ या डिलीवरी सदस्य नहीं है।</p>
        ) : (
          <ul className="space-y-3">
            {team.map((usr) => (
              <li key={usr.uid} className="p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      {usr.role === 'delivery' ? <Truck className="w-4 h-4 text-sky-600" /> : <Shield className="w-4 h-4 text-sky-600" />}
                      <span className="truncate">{usr.name || 'स्टाफ सदस्य'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 break-all">{usr.email || usr.uid}</div>
                  </div>
                  <select
                    value={usr.role as AssignableRole}
                    onChange={(e) => handleChangeRole(usr, e.target.value as AssignableRole)}
                    className="border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold shrink-0"
                    aria-label="रोल बदलें"
                  >
                    <option value="staff">स्टाफ</option>
                    <option value="delivery">डिलीवरी बॉय</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  {PERMISSION_LABELS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={effectivePermission(usr, key)}
                        onChange={(e) => handleTogglePermission(usr, key, e.target.checked)}
                        className="w-4 h-4 accent-sky-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleWhatsapp(usr)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {usr.whatsappEnabled === false ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                    WhatsApp सूचना {usr.whatsappEnabled === false ? 'बंद' : 'चालू'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevoke(usr)}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> एक्सेस हटाएँ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {legacyAdminDocs.length > 0 && (
        <section className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          <h4 className="text-sm font-black text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> पुराने “admin” रोल वाले अकाउंट
          </h4>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            इन दस्तावेज़ों में पुराना admin रोल लिखा है। नए सिक्योरिटी रूल्स में सिर्फ़ मालिक का verified Google अकाउंट ही ओनर है, इसलिए इनसे कोई विशेष अधिकार नहीं मिलता।
          </p>
          <ul className="mt-2 space-y-1.5">
            {legacyAdminDocs.map((u) => (
              <li key={u.uid} className="flex items-center justify-between gap-2 text-xs text-slate-700">
                <span className="truncate">{u.name || u.email || u.uid}</span>
                <button type="button" onClick={() => handleRevoke(u)} className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 font-bold cursor-pointer">
                  रोल हटाएँ
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ===== Manual add by UID (existing flow, kept) ===== */}
      <section>
        <h4 className="text-sm font-black text-slate-800 mb-2">UID से सीधे जोड़ें</h4>
        <form onSubmit={handleSaveUser} className="space-y-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="यूज़र UID (Firebase Auth)" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="नाम" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="फोन" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value as AssignableRole)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold">
            <option value="staff">स्टाफ</option>
            <option value="delivery">डिलीवरी बॉय</option>
          </select>
          <PermissionChecks value={newPerms} onChange={setNewPerms} />
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={whatsappEnabled} onChange={(e) => setWhatsappEnabled(e.target.checked)} className="w-4 h-4 accent-sky-600" />
            WhatsApp सूचनाएँ चालू
          </label>
          <button type="submit" className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-extrabold cursor-pointer">सहेजें</button>
        </form>
      </section>
    </div>
  );
};

export default UserManagement;
