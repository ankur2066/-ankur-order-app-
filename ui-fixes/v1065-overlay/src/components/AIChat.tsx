import {UI} from '../i18n/UiText';
import React, { useState } from 'react';
import { Loader2, Mic, Send, Volume2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { answerOrderQuestion, type ChatOrder } from '../utils/orderChatAnswer';
import { authHeaders, getApiBase } from '../utils/apiBase';

type SpeechCtor = new () => {lang:string;interimResults:boolean;maxAlternatives:number;onresult:((e:any)=>void)|null;onerror:(()=>void)|null;onend:(()=>void)|null;start:()=>void};
const speechRecognition = (): SpeechCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as SpeechCtor | null;
};
const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof (window as any).SpeechSynthesisUtterance === 'function';

export const AIChat: React.FC<{ context: string; orders?: ChatOrder[]; today?: string }> = ({ context, orders = [], today }) => {
  const { language } = useLanguage();
  const [listening, setListening] = useState(false);
  const speak = (text: string) => {
    if (!canSpeak()) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[•·]/g, ','));
      u.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      window.speechSynthesis.speak(u);
    } catch { /* speech is optional */ }
  };
  const listen = () => {
    const Ctor = speechRecognition();
    if (!Ctor || listening) return;
    try {
      const r = new Ctor();
      r.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e: any) => { const text = e?.results?.[0]?.[0]?.transcript; if (typeof text === 'string') setInput(text); };
      r.onerror = () => setListening(false);
      r.onend = () => setListening(false);
      setListening(true); r.start();
    } catch { setListening(false); }
  };
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'नमस्ते! मैं आपकी ऑर्डर डिटेल्स का विश्लेषण कर सकता हूँ। आप क्या जानना चाहेंगे?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      // Common order questions are answered right here from the loaded orders.
      const day = today || new Date(Date.now() + 19800000).toISOString().slice(0, 10);
      const local = answerOrderQuestion(userMessage, orders, day, language);
      if (local) { setMessages(prev => [...prev, { role: 'ai', text: local }]); return; }
      const base = getApiBase();
      if (base === null) {
        setMessages(prev => [...prev, { role: 'ai', text: language === 'hi'
          ? 'यह सवाल समझ नहीं आया। ऐसे पूछें: "आज और कल के ऑर्डर कितने हैं", "परसों का डिस्पैच", "12/11 के ऑर्डर", "राम का हिसाब" या मोबाइल के आखिरी 4 अंक।'
          : 'I could not read that question. Try: "orders today and tomorrow", "dispatch day after tomorrow", "orders on 12/11", a customer name, or the last 4 digits of a mobile.' }]);
        return;
      }
      const response = await fetch(`${base}/api/gemini/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ message: userMessage, context }),
      });
      if (response.status === 401 || response.status === 403) {
        setMessages(prev => [...prev, { role: 'ai', text: 'यह सुविधा सिर्फ़ मालिक के लॉगिन से चलती है।' }]);
        return;
      }
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response || 'क्षमा करें, मैं अभी जवाब देने में असमर्थ हूँ।' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'सर्वर त्रुटि। कृपया पुनः प्रयास करें।' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px] border border-slate-200 rounded-2xl bg-slate-50 p-3 sm:p-4 shadow-xs">
      <div className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`p-3 rounded-2xl text-xs sm:text-sm max-w-[85%] leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-sky-500 text-white ml-auto shadow-2xs rounded-br-xs' 
                : 'bg-white border border-slate-200 text-slate-800 shadow-2xs rounded-bl-xs'
            }`}
          >
            {msg.text}
            {msg.role === 'ai' && i > 0 && canSpeak() && (
              <button type="button" onClick={() => speak(msg.text)} className="ml-2 inline-flex align-middle t-sub" aria-label={language === 'hi' ? 'जवाब सुनें' : 'Listen to reply'}>
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="p-3 text-slate-500 bg-white border border-slate-200 rounded-2xl max-w-[80px] flex items-center justify-center">
            <Loader2 className="animate-spin w-4 h-4 text-sky-600" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
        <UI as="input" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="ऑर्डर्स के बारे में कुछ भी पूछें (उदा. आज कुल कितनी बुकिंग हुई?)..."
        />
        {speechRecognition() && (
          <button type="button" onClick={listen} disabled={listening} aria-label={language === 'hi' ? 'बोलकर पूछें' : 'Ask by voice'}
            className="p-2.5 border border-slate-300 rounded-xl cursor-pointer shrink-0 disabled:opacity-50">
            <Mic className={`w-4 h-4 ${listening ? 'text-sky-600 animate-pulse' : 'text-slate-700'}`} />
          </button>
        )}
        <button 
          onClick={sendMessage} 
          disabled={loading || !input.trim()}
          className="p-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl cursor-pointer transition-colors shadow-2xs shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
