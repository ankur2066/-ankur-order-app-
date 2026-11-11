/**
 * Owner -> customer WhatsApp text, chosen by the order's current status.
 * Pure function (no Firebase). Bus details are typed by the owner at send
 * time and are NOT saved to Firestore (no rules change needed).
 */
import type { Order } from '../types';

export interface BusInfo { busNumber?: string; conductorPhone?: string; slipNo?: string }

const MODE_HI: Record<string, string> = {
  BUS: 'बस से',
  SHOP_PICKUP: 'दुकान से पिकअप',
  PORTER: 'Porter से',
  LOCAL: 'लोकल डिलीवरी से',
};

export function customerStatusMessage(order: Order, qty: string, stopName?: string, bus?: BusInfo): string {
  const id = order.orderId;
  const head = `नमस्ते ${order.customerName} जी,\nअंकुर ड्राई आइस एंड इवेंट्स`;
  const ref = `ऑर्डर #${id} (${qty})`;
  const track = order.trackingPin ? `\nट्रैकिंग: ऑर्डर ID ${id}, PIN ${order.trackingPin}` : '';
  const mode = order.deliveryMode ? MODE_HI[order.deliveryMode] || '' : '';
  const stop = order.deliveryMode === 'BUS' && stopName ? ` (बस स्टॉप: ${stopName})` : '';
  let body: string;
  switch (order.status) {
    case 'confirmed':
      body = `✅ आपका ${ref} कन्फर्म हो गया है।${order.dispatchTiming ? `\nडिस्पैच: ${order.dispatchTiming}` : ''}`;
      break;
    case 'in_packing':
      body = `📦 आपका ${ref} पैक हो रहा है।${mode ? `\nडिलीवरी: ${mode}${stop}` : ''}`;
      break;
    case 'dispatched': {
      const lines = [`🚚 आपका ${ref} डिस्पैच हो गया है${mode ? ` (${mode}${stop})` : ''}।`];
      if (bus?.busNumber) lines.push(`बस नंबर: ${bus.busNumber}`);
      if (bus?.conductorPhone) lines.push(`कंडक्टर/ड्राइवर मोबाइल: ${bus.conductorPhone}`);
      if (bus?.slipNo) lines.push(`पर्ची नंबर: ${bus.slipNo}`);
      if (order.deliveryMode === 'BUS') lines.push('बस पर्ची की फोटो इसी चैट में भेज रहे हैं।');
      body = lines.join('\n');
      break;
    }
    case 'delivered':
      body = `🎉 आपका ${ref} डिलीवर हो गया है। धन्यवाद! दोबारा ज़रूरत हो तो बताइए।`;
      break;
    case 'cancelled':
      body = `आपका ${ref} रद्द कर दिया गया है। कोई सवाल हो तो कॉल करें।`;
      break;
    default:
      body = `आपका ${ref} हमें मिल गया है, जल्द कन्फर्म करेंगे।`;
  }
  return `${head}\n\n${body}${track}\n\n📞 95808 82066`;
}
