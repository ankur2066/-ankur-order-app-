import React from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { CUSTOMER_CONTACTS, contactDisplay, contactTelHref, contactWhatsAppHref } from '../../data/customerContacts';

/** v1.0.71: small "संपर्क करें" block at the very bottom of customer Home, above the bottom nav. */
export const CustomerContactFooter: React.FC = () => {
  const { language } = useLanguage();
  const hi = language === 'hi';
  return <footer className="ankur-contact-footer mt-4 mb-2 rounded-2xl border b-line c-card p-3" aria-labelledby="ankur-contact-title" data-no-translate>
    <h2 id="ankur-contact-title" className="text-sm font-extrabold t-main mb-2">{hi ? 'संपर्क करें' : 'Contact us'}</h2>
    <ul className="space-y-2">
      {CUSTOMER_CONTACTS.map((c) => {
        const label = hi ? c.labelHi : c.labelEn;
        return <li key={c.id} data-contact={c.id} className="flex items-center gap-2">
          <a href={contactTelHref(c.phone)} className="focus-ring flex-1 min-w-0 flex items-center gap-2 rounded-xl px-2 py-1.5"
            aria-label={`${label}: ${hi ? 'कॉल करें' : 'Call'} ${contactDisplay(c.phone)}`}>
            <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xs t-sub leading-tight">{label}</span>
              <span className="block text-sm font-extrabold t-main tabular-nums">{contactDisplay(c.phone)}</span>
            </span>
          </a>
          <a href={contactWhatsAppHref(c.phone)} target="_blank" rel="noopener noreferrer" className="focus-ring shrink-0 rounded-xl border b-line p-2"
            aria-label={`${label}: WhatsApp ${contactDisplay(c.phone)}`}>
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
          </a>
        </li>;
      })}
    </ul>
  </footer>;
};
