/**
 * v1.0.71 (Ankur 2026-11-13): customer Home footer "संपर्क करें" numbers.
 * The ONLY place these numbers live; the footer reads them from here.
 */
export interface CustomerContact {
  id: 'packing' | 'delivery' | 'complaint';
  labelHi: string;
  labelEn: string;
  /** 10-digit Indian mobile, no +91. */
  phone: string;
}

export const CUSTOMER_CONTACTS: readonly CustomerContact[] = [
  { id: 'packing', labelHi: 'पैकिंग से जुड़ी बात — विकास गौतम', labelEn: 'Packing questions — Vikas Gautam', phone: '9151416323' },
  { id: 'delivery', labelHi: 'डिलीवरी से जुड़ी बात', labelEn: 'Delivery questions', phone: '9532844538' },
  { id: 'complaint', labelHi: 'शिकायत', labelEn: 'Complaints', phone: '8896332066' },
];

export const contactTelHref = (phone: string) => `tel:+91${phone}`;
export const contactWhatsAppHref = (phone: string) => `https://wa.me/91${phone}`;
/** "91514 16323" style, easy to read aloud. */
export const contactDisplay = (phone: string) => `${phone.slice(0, 5)} ${phone.slice(5)}`;
