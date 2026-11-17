import { ProductItem } from '../types';
import { RETAIL_RATE_PER_KG } from '../config/businessConfig';

export const DRY_ICE_RATE_PER_KG = RETAIL_RATE_PER_KG;
export const THERMOCOL_RATE_PER_KG = 10;
export const TOTAL_RATE_PER_KG = 60;

// Uttar Pradesh Districts (75 Districts) with Hindi and English names
export const UP_DISTRICTS: { id: string; name: string }[] = [
  { id: 'lucknow', name: 'लखनऊ (Lucknow)' },
  { id: 'kanpur_nagar', name: 'कानपुर नगर (Kanpur Nagar)' },
  { id: 'varanasi', name: 'वाराणसी (Varanasi)' },
  { id: 'prayagraj', name: 'प्रयागराज / इलाहाबाद (Prayagraj)' },
  { id: 'gorakhpur', name: 'गोरखपुर (Gorakhpur)' },
  { id: 'agra', name: 'आगरा (Agra)' },
  { id: 'meerut', name: 'मेरठ (Meerut)' },
  { id: 'ghaziabad', name: 'गाजियाबाद (Ghaziabad)' },
  { id: 'gautam_buddha_nagar', name: 'नोएडा / गौतम बुद्ध नगर (Noida)' },
  { id: 'bareilly', name: 'बरेली (Bareilly)' },
  { id: 'aligarh', name: 'अलीगढ़ (Aligarh)' },
  { id: 'moradabad', name: 'मुरादाबाद (Moradabad)' },
  { id: 'saharanpur', name: 'सहारनपुर (Saharanpur)' },
  { id: 'ayodhya', name: 'अयोध्या (Ayodhya)' },
  { id: 'jhansi', name: 'झांसी (Jhansi)' },
  { id: 'muzaffarnagar', name: 'मुजफ्फरनगर (Muzaffarnagar)' },
  { id: 'mathura', name: 'मथुरा (Mathura)' },
  { id: 'firozabad', name: 'फिरोजाबाद (Firozabad)' },
  { id: 'sitapur', name: 'सीतापुर (Sitapur)' },
  { id: 'hardoi', name: 'हरदोई (Hardoi)' },
  { id: 'lakhimpur_kheri', name: 'लखीमपुर खीरी (Lakhimpur Kheri)' },
  { id: 'barabanki', name: 'बाराबंकी (Barabanki)' },
  { id: 'raebareli', name: 'रायबरेली (Raebareli)' },
  { id: 'unnao', name: 'उन्नाव (Unnao)' },
  { id: 'sultanpur', name: 'सुल्तानपुर (Sultanpur)' },
  { id: 'amethi', name: 'अमेठी (Amethi)' },
  { id: 'ambedkar_nagar', name: 'अंबेडकर नगर (Ambedkar Nagar)' },
  { id: 'azamgarh', name: 'आजमगढ़ (Azamgarh)' },
  { id: 'mau', name: 'मऊ (Mau)' },
  { id: 'ballia', name: 'बलिया (Ballia)' },
  { id: 'jaunpur', name: 'जौनपुर (Jaunpur)' },
  { id: 'ghazipur', name: 'गाजीपुर (Ghazipur)' },
  { id: 'chandauli', name: 'चंदौली (Chandauli)' },
  { id: 'mirzapur', name: 'मिर्जापुर (Mirzapur)' },
  { id: 'sonbhadra', name: 'सोनभद्र (Sonbhadra)' },
  { id: 'bhadohi', name: 'भदोही (Bhadohi)' },
  { id: 'basti', name: 'बस्ती (Basti)' },
  { id: 'sant_kabir_nagar', name: 'संत कबीर नगर (Sant Kabir Nagar)' },
  { id: 'siddharthnagar', name: 'सिद्धार्थनगर (Siddharthnagar)' },
  { id: 'maharajganj', name: 'महराजगंज (Maharajganj)' },
  { id: 'kushinagar', name: 'कुशीनगर (Kushinagar)' },
  { id: 'deoria', name: 'देवरिया (Deoria)' },
  { id: 'gonda', name: 'गोंडा (Gonda)' },
  { id: 'bahraich', name: 'बहराइच (Bahraich)' },
  { id: 'shravasti', name: 'श्रावस्ती (Shravasti)' },
  { id: 'balrampur', name: 'बलरामपुर (Balrampur)' },
  { id: 'fatehpur', name: 'फतेहपुर (Fatehpur)' },
  { id: 'pratapgarh', name: 'प्रतापगढ़ (Pratapgarh)' },
  { id: 'kaushambi', name: 'कौशाम्बी (Kaushambi)' },
  { id: 'chitrakoot', name: 'चित्रकूट (Chitrakoot)' },
  { id: 'banda', name: 'बांदा (Banda)' },
  { id: 'hamirpur', name: 'हमीरपुर (Hamirpur)' },
  { id: 'mahoba', name: 'महोबा (Mahoba)' },
  { id: 'lalitpur', name: 'ललितपुर (Lalitpur)' },
  { id: 'jalaun', name: 'जालौन (Jalaun)' },
  { id: 'kanpur_dehat', name: 'कानपुर देहात (Kanpur Dehat)' },
  { id: 'auraiya', name: 'औरैया (Auraiya)' },
  { id: 'etawah', name: 'इटावा (Etawah)' },
  { id: 'mainpuri', name: 'मैनपुरी (Mainpuri)' },
  { id: 'farrukhabad', name: 'फर्रुखाबाद (Farrukhabad)' },
  { id: 'kannauj', name: 'कन्नौज (Kannauj)' },
  { id: 'etah', name: 'एटा (Etah)' },
  { id: 'kasganj', name: 'कासगंज (Kasganj)' },
  { id: 'hathras', name: 'हाथरस (Hathras)' },
  { id: 'budaun', name: 'बदायूँ (Budaun)' },
  { id: 'shahjahanpur', name: 'शाहजहांपुर (Shahjahanpur)' },
  { id: 'pilibhit', name: 'पीलीभीत (Pilibhit)' },
  { id: 'rampur', name: 'रामपुर (Rampur)' },
  { id: 'sambhal', name: 'संभल (Sambhal)' },
  { id: 'amroha', name: 'अमरोहा (Amroha)' },
  { id: 'bijnor', name: 'बिजनौर (Bijnor)' },
  { id: 'bulandshahr', name: 'बुलंदशहर (Bulandshahr)' },
  { id: 'hapur', name: 'हापुड़ (Hapur)' },
  { id: 'baghpat', name: 'बागपत (Baghpat)' },
  { id: 'shamli', name: 'शामली (Shamli)' },
];

export const BUSINESS_PHONE = '8896332066';
export const BUSINESS_PHONE_DISPLAY = '+91 8896332066';
// Call and WhatsApp are different numbers: Call 95808 82066, WhatsApp 88963 32066.
export const BUSINESS_CALL_DISPLAY = '+91 95808 82066';
export const BUSINESS_WHATSAPP_DISPLAY = '+91 88963 32066';
export const BUSINESS_CALL_HREF = 'tel:+919580882066';
export const BUSINESS_WHATSAPP_BASE = 'https://wa.me/918896332066';

export interface DispatchSlot {
  id: string;
  label: string;
  timeWindow: string;
  disabled: boolean;
  disabledReason?: string;
}

// Calculate dispatch slots based on Indian Standard Time (IST = UTC + 5:30)
// Dispatch windows use the owner's requested clear hours in IST.
export function getDispatchSlots(): DispatchSlot[] {
  // Current time converted to IST (UTC + 5:30)
  const now = new Date();
  const currentHour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23',
  }).format(now));

  // "आज सुबह 12 AM–12 PM" window ends at 12:00 PM IST
  const todayMorningDisabled = currentHour >= 12;
  const todayEveningDisabled = currentHour >= 22;

  return [
    {
      id: 'today_morning',
      label: 'आज सुबह (6 AM–12 PM)',
      timeWindow: 'Subah (6 AM–12 PM)',
      disabled: todayMorningDisabled,
      disabledReason: todayMorningDisabled ? '12 PM के बाद सुबह का स्लॉट समाप्त है' : undefined,
    },
    {
      id: 'today_evening',
      label: 'आज शाम (12 PM–10 PM)',
      timeWindow: 'Shaam (12 PM–10 PM)',
      disabled: todayEveningDisabled,
      disabledReason: todayEveningDisabled ? '10 PM के बाद आज शाम का स्लॉट समाप्त है' : undefined,
    },
    {
      id: 'tomorrow_morning',
      label: 'कल सुबह (6 AM–12 PM)',
      timeWindow: 'Tomorrow morning (6 AM–12 PM)',
      disabled: false,
    },
    {
      id: 'tomorrow_evening',
      label: 'कल शाम (12 PM–10 PM)',
      timeWindow: 'Tomorrow evening (12 PM–10 PM)',
      disabled: false,
    },
  ];
}

// Owner-only product management default catalog
export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'dry_ice_standard',
    name: 'Dry Ice (Standard)',
    hindiName: 'ड्राई आइस',
    ratePerKg: DRY_ICE_RATE_PER_KG,
    thermocolPerKg: 10,
    active: true,
    category: 'dry_ice',
  },
  {
    id: 'dry_ice_pellets',
    name: 'Dry Ice Pellets (16mm)',
    hindiName: 'ड्राई आइस पेलेट्स',
    ratePerKg: DRY_ICE_RATE_PER_KG,
    thermocolPerKg: 10,
    active: true,
    category: 'pellets',
  },
  {
    id: 'dry_ice_blocks',
    name: 'Dry Ice Solid Blocks',
    hindiName: 'ड्राई आइस ब्लॉक',
    ratePerKg: DRY_ICE_RATE_PER_KG,
    thermocolPerKg: 10,
    active: true,
    category: 'blocks',
  },
];
