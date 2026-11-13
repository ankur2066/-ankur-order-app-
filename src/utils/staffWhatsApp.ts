/**
 * v1.0.71 staff "Customer ko WhatsApp" prefill text (pure, no Firebase).
 * The message follows the order's CURRENT status. It reads only fields that are
 * already in the staff projection (staffOrderViews): customerName, quantityKg,
 * status, packingStatus, deliveryMode. The bus stop name comes from the owner's
 * delivery settings the staff screen already loads. No phone, price or PIN is used.
 */
import { isDeliveryMode } from './delivery.ts';

export interface StaffWhatsAppOrder {
  customerName?: string;
  quantityKg?: number | string;
  status?: string;
  packingStatus?: string;
  deliveryMode?: string;
}

const greeting = (order: StaffWhatsAppOrder) => {
  const name = typeof order.customerName === 'string' ? order.customerName.trim() : '';
  return name ? `नमस्ते ${name} जी` : 'नमस्ते जी';
};
const kgOf = (order: StaffWhatsAppOrder) => Number(order.quantityKg) || 0;

/** ", बस से (Alambagh बस स्टॉप)" style detail for a dispatched order; '' when mode is unknown. */
export function dispatchDetail(deliveryMode?: string, stopName?: string): string {
  if (!isDeliveryMode(deliveryMode)) return '';
  const stop = typeof stopName === 'string' ? stopName.trim() : '';
  switch (deliveryMode) {
    case 'BUS': return stop ? `, बस से (${stop} बस स्टॉप)` : ', बस से';
    case 'PORTER': return ', Porter से';
    case 'LOCAL': return ', लोकल डिलीवरी से';
    case 'SHOP_PICKUP': return ', दुकान पिकअप के लिए';
    default: return '';
  }
}

/** The text before v1.0.71, kept for any status the app does not know. */
export function genericStaffWhatsAppText(order: StaffWhatsAppOrder): string {
  return `${greeting(order)}, Ankur Dryice से बात कर रहे हैं। आपके ${kgOf(order)} KG ड्राई आइस ऑर्डर के बारे में।`;
}

export function staffWhatsAppText(order: StaffWhatsAppOrder, stopName?: string): string {
  const lead = `${greeting(order)}, Ankur Dryice से। आपका ${kgOf(order)} KG ड्राई आइस ऑर्डर`;
  const packed = order.packingStatus === 'packed';
  switch (order.status) {
    case 'pending':
    case 'new':
      return `${lead} हमें मिल गया है, जल्द कन्फ़र्म करेंगे।`;
    case 'confirmed':
      return `${lead} कन्फ़र्म हो गया है।`;
    case 'in_packing':
      return packed ? `${lead} पैक हो गया है, जल्द रवाना होगा।` : `${lead} पैक हो रहा है।`;
    case 'packed':
      return `${lead} पैक हो गया है, जल्द रवाना होगा।`;
    case 'dispatched':
      return `${lead} रवाना हो गया है${dispatchDetail(order.deliveryMode, stopName)}।`;
    case 'delivered':
      return `${lead} डिलीवर हो गया है। धन्यवाद!`;
    case 'cancelled':
      return `${lead} रद्द कर दिया गया है।`;
    default:
      return genericStaffWhatsAppText(order);
  }
}
