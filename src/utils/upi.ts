import QRCode from 'qrcode';
import { BACKUP_UPI_ID, OTHER_UPI_ID, PRIMARY_UPI_ID, UPI_MERCHANT_NAME } from '../config/businessConfig.ts';

// Percent-encoding (not URLSearchParams' "+") so every UPI app shows "Ankur Dryice":
// upi://pay?pa=...&pn=Ankur%20Dryice&cu=INR&am=<total>&tn=Order%20<id>
function upiUri(payee: string, amount?: number, orderId?: string): string {
  const params: Array<[string, string]> = [['pa', payee], ['pn', UPI_MERCHANT_NAME], ['cu', 'INR']];
  if (Number.isFinite(amount) && (amount || 0) > 0) params.push(['am', Number(amount).toFixed(2)]);
  if (orderId) params.push(['tn', `Order ${orderId}`]);
  return `upi://pay?${params.map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%40/g, '@')}`).join('&')}`;
}

export const primaryUpiUri = (amount?: number, orderId?: string) => upiUri(PRIMARY_UPI_ID, amount, orderId);
export const backupUpiUri = (amount?: number, orderId?: string) => upiUri(BACKUP_UPI_ID, amount, orderId);
/** v1.0.75: second UPI (8896332066@paytm) for when payment on the primary UPI fails. */
export const otherUpiUri = (amount?: number, orderId?: string) => upiUri(OTHER_UPI_ID, amount, orderId);

export async function makePrimaryUpiQr(amount?: number, orderId?: string): Promise<string> {
  return QRCode.toDataURL(primaryUpiUri(amount, orderId), { errorCorrectionLevel: 'M', margin: 2, width: 256 });
}
