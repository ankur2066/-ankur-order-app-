import React, {useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {Share} from '@capacitor/share';
import type {User} from 'firebase/auth';
import {useLanguage} from '../../context/LanguageContext';
import {referralDetails, shareReferral, shareNativeReferral} from '../../utils/referralShare';

export function ReferralSharePanel({user}:{user:User|null}) {
  const {language}=useLanguage(), hi=language==='hi';
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const inFlight=React.useRef(false);
  if(!user) return <p role="status">{hi?'अपना रेफरल कोड पाने के लिए Profile से साइन इन करें।':'Sign in from Profile to get your referral code.'}</p>;
  const details=referralDetails(user.uid,hi);
  const messages={
    shared:hi?'शेयर पूरा हुआ।':'Shared successfully.',
    copied:hi?'लिंक और कोड कॉपी हो गए।':'Link and code copied.',
    cancelled:hi?'शेयर रद्द किया गया।':'Sharing cancelled.',
    manual:hi?'नीचे का संदेश चुनकर कॉपी करें।':'Select and copy the message below.'
  };
  const run=async(copyOnly:boolean)=>{
    if(inFlight.current)return;inFlight.current=true;setBusy(true);setNotice('');
    try {
      if(!copyOnly&&Capacitor.isNativePlatform()) {
        const result=await shareNativeReferral(details,data=>Share.share({...data,dialogTitle:hi?'रेफरल लिंक शेयर करें':'Share referral link'}));
        setNotice(messages[result]);return;
      }
      setNotice(messages[await shareReferral(details,{
      share:!copyOnly&&navigator.share?navigator.share.bind(navigator):undefined,
      clipboard:navigator.clipboard
    })]);} finally {inFlight.current=false;setBusy(false);}
  };
  return <section className="space-y-4" aria-label="Referral share">
    <p className="text-sm t-sub">{hi?'दोस्त को लिंक भेजें। वह बुकिंग करते समय आपका कोड बता सकता है। कोई ऑटोमैटिक इनाम या छूट नहीं जुड़ती।':'Send this link to a friend. They can mention your code when booking. No reward or discount is added automatically.'}</p>
    <label className="block text-sm font-bold">{hi?'आपका रेफरल कोड':'Your referral code'}<input readOnly className="w-full rounded-xl border b-line c-card p-3 mt-1" value={user.uid}/></label>
    <label className="block text-sm font-bold">{hi?'शेयर करने का संदेश':'Message to share'}<textarea readOnly rows={6} className="w-full rounded-xl border b-line c-card p-3 mt-1 text-sm" value={`${details.text}\n${details.url}`}/></label>
    <div className="grid grid-cols-2 gap-3">
      <button type="button" disabled={busy} className="min-h-11 rounded-xl c-brand p-3 font-bold disabled:opacity-50" onClick={()=>void run(false)}>{hi?'शेयर करें':'Share'}</button>
      <button type="button" disabled={busy} className="min-h-11 rounded-xl border b-line p-3 font-bold disabled:opacity-50" onClick={()=>void run(true)}>{hi?'कॉपी करें':'Copy'}</button>
    </div>
    <p role="status" aria-live="polite" className="text-sm">{notice}</p>
    <p className="text-xs t-sub">{hi?'संदेश में आपका रेफरल कोड शामिल है। आपका फोन नंबर या ऑर्डर विवरण नहीं भेजा जाता।':'The message includes your referral code. Your phone number and order details are not included.'}</p>
  </section>;
}
