import {L,UI} from '../i18n/UiText';
import {useLanguage} from '../context/LanguageContext';
import React, { useMemo, useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { cycleLabel, expenseCycleKey, expenseDayLabel, groupExpensesByCycle } from '../utils/expenseCycles';

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: any;
}

// v1.0.77: staff open Expenses too; only the owner (canDelete) may delete an expense.
export const ExpensesView: React.FC<{ canDelete?: boolean }> = ({ canDelete = true }) => {
  const {language}=useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Transport');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const monthlyGroups = useMemo(() => groupExpensesByCycle(expenses), [expenses]);
  const currentCycle = expenseCycleKey(new Date());
  const currentTotal = monthlyGroups.find((group) => group.key === currentCycle)?.total || 0;

  useEffect(() => {
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
      setReading(false);
      setErrorMsg(null);
    }, () => {
      setReading(false);
      setErrorMsg('खर्च की सूची अभी लोड नहीं हो सकी। पुराना डेटा नहीं बदला है।');
    });
    return () => unsubscribe();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      await addDoc(collection(db, 'expenses'), {
        amount: Number(amount),
        category,
        description,
        date: serverTimestamp(),
      });
      setAmount('');
      setDescription('');
    } catch {
      setErrorMsg('खर्च सेव नहीं हो सका। दोबारा कोशिश करें।');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!canDelete) return;
    try {
      setErrorMsg(null);
      await deleteDoc(doc(db, 'expenses', id));
    } catch {
      setErrorMsg('खर्च हटाया नहीं जा सका।');
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
      <div>
        <h3 className="text-lg font-bold"><L id={"खर्च ट्रैकिंग (Expense Tracking)"}/></h3>
        <p className="text-xs text-slate-500"><L id={"मासिक हिसाब: हर महीने की 15 तारीख से अगले महीने की 14 तारीख तक"}/></p>
      </div>
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3" aria-live="polite">
        <div className="flex items-center gap-2 text-sm font-semibold text-sky-900"><Calendar className="h-4 w-4" /> <L id={"इस हिसाब चक्र का खर्च"}/></div>
        <div className="font-bold text-2xl text-sky-950">{reading ? <L id={"लोड हो रहा है…"}/> : `₹${currentTotal.toLocaleString('en-IN')}`}</div>
        <p className="text-xs text-sky-700">{currentCycle ? cycleLabel(currentCycle,language) : ''}</p>
      </div>
      {errorMsg && <p role="alert" className="text-xs text-rose-700 bg-rose-50 p-2 rounded">{<L text={errorMsg}/>}</p>}
      <form onSubmit={handleAddExpense} className="flex flex-col gap-2">
        <label className="sr-only" htmlFor="expense-amount"><L id={"खर्च राशि"}/></label>
        <UI as="input" id="expense-amount" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="राशि (Amount)" className="p-2 border rounded" required />
        <label className="sr-only" htmlFor="expense-category"><L id={"खर्च श्रेणी"}/></label>
        <select id="expense-category" value={category} onChange={e => setCategory(e.target.value)} className="p-2 border rounded">
          <option><L id={"Transport"}/></option>
          <option><L id={"Dry Ice Purchase"}/></option>
          <option><L id={"Other"}/></option>
        </select>
        <label className="sr-only" htmlFor="expense-description"><L id={"खर्च विवरण"}/></label>
        <UI as="input" id="expense-description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="विवरण (Description)" className="p-2 border rounded" />
        <button type="submit" className="bg-sky-600 text-white p-2 rounded flex items-center justify-center gap-2" disabled={loading}><Plus className="w-4 h-4" />{loading ? <L id={"सेव हो रहा है…"}/> : <L id={"खर्च जोड़ें"}/>}</button>
      </form>
      {reading ? (
        <p className="text-sm text-slate-500"><L id={"पुराने खर्च लोड हो रहे हैं…"}/></p>
      ) : monthlyGroups.length === 0 ? (
        <p className="text-sm text-slate-500"><L id={"अभी कोई खर्च दर्ज नहीं है।"}/></p>
      ) : (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-700"><L id={"महीनेवार खर्च"}/></h4>
          {monthlyGroups.map(group => (
            <section key={group.key} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 flex items-center justify-between gap-2 p-3 border-b border-slate-200">
                <h5 className="font-semibold text-xs sm:text-sm text-slate-800">{cycleLabel(group.key,language)}</h5>
                <span className="font-bold text-slate-900">₹{group.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {group.items.map(exp => (
                  <div key={exp.id} className="flex justify-between gap-2 items-center p-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm">₹{Number(exp.amount || 0).toLocaleString('en-IN')} · {exp.category || <L id={"Other"}/>}</p>
                      <p className="text-xs text-slate-500">{expenseDayLabel(exp.date,language)}{exp.description ? ` · ${exp.description}` : ''}</p>
                    </div>
                    {canDelete && <UI as="button" type="button" data-owner-delete onClick={() => handleDeleteExpense(exp.id)} aria-label="खर्च हटाएँ" className="text-rose-500 p-2"><Trash2 className="w-4 h-4" /></UI>}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};