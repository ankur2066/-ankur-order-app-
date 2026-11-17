/**
 * Staff-safe order projection (staffOrderViews/{orderId}).
 * Staff never receive rate, price, total, payment status, UPI, payment proof,
 * raw phone, tracking PIN or reports. Exception (Ankur, 12 Nov 2026): waPhone,
 * the 10-digit mobile used only for the staff WhatsApp button. Firestore rules enforce the key list.
 */
import { isDeliveryMode } from './delivery.ts';
import { normalizeBusNumber } from './busDispatch.ts';

export const STAFF_VIEW_FIELDS = [
  'orderId', 'sourceCollection', 'customerName', 'city', 'district', 'productName',
  'dispatchTiming', 'dispatchDate', 'slot', 'status', 'quantityKg', 'createdAt', 'updatedAt', 'isTrash',
  'deliveryMode', 'busStopId', 'packCount', 'deliveryNote',
  // v1.0.68 (Ankur, 12 Nov 2026): 10-digit number used ONLY for the staff
  // "Customer ko WhatsApp" button; never rendered as text. Written by the owner client.
  'waPhone',
  // v1.0.72: bus number (not sensitive) for the staff WhatsApp text. Owner-written.
  'busNumber',
  // staff-writable status fields
  'packingStatus', 'statusSyncPending', 'statusUpdatedBy',
] as const;

export const STAFF_FORBIDDEN_FIELDS = [
  'customerPhone', 'address', 'trackingPin', 'trackingToken', 'userId',
  'dryIcePricePerKg', 'dryIceSubtotal', 'thermocolPricePerKg', 'thermocolSubtotal', 'transportPrice',
  'totalAmount', 'calculatedTotal', 'customerTotal', 'amountChanged', 'amountChangeReason', 'customerType',
  'paymentStatus', 'paymentMethod', 'paymentNotes', 'verifiedReceivedAmount', 'price', 'rate', 'upiId', 'paymentProof',
] as const;

/** Status values a staff member may set, and only through these buttons. */
export type StaffAction = 'packing_done' | 'dispatched' | 'handed_over';
export const STAFF_STATUSES = ['in_packing', 'dispatched', 'delivered'] as const;

export interface StaffSourceOrder {
  orderId: string; customerName?: string; city?: string; district?: string; productName?: string;
  dispatchTiming?: string; dispatchDate?: string; slot?: string; status?: string; quantityKg?: number;
  isTrash?: boolean; createdAt?: any; updatedAt?: any; deliveryMode?: string; busStopId?: string;
  packCount?: number; deliveryNote?: string; busNumber?: string; [key: string]: unknown;
}

/** Last 10 digits of an Indian mobile, or '' when it is not a valid mobile. */
export function staffWhatsappPhone(phone: unknown): string {
  const digits = typeof phone === 'string' ? phone.replace(/[^0-9]/g, '').slice(-10) : '';
  return /^[6-9][0-9]{9}$/.test(digits) ? digits : '';
}

/** Builds the projection the owner client writes. Unknown/private keys are dropped. */
export function toStaffOrderView(order: StaffSourceOrder): Record<string, unknown> {
  const view: Record<string, unknown> = {
    orderId: order.orderId,
    sourceCollection: 'orders',
    customerName: order.customerName || '',
    city: order.city || order.district || '',
    district: order.district || order.city || '',
    productName: order.productName || 'Dry Ice',
    dispatchTiming: order.dispatchTiming || '',
    status: order.status || 'pending',
    quantityKg: Number(order.quantityKg) || 0,
    isTrash: !!order.isTrash,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
  if (order.dispatchDate) view.dispatchDate = order.dispatchDate;
  if (order.slot) view.slot = order.slot;
  if (isDeliveryMode(order.deliveryMode)) {
    view.deliveryMode = order.deliveryMode;
    if (order.deliveryMode === 'BUS' && order.busStopId) view.busStopId = order.busStopId;
    const busNumber = order.deliveryMode === 'BUS' ? normalizeBusNumber(order.busNumber) : '';
    if (busNumber) view.busNumber = busNumber;
  }
  if (typeof order.packCount === 'number' && order.packCount > 0) view.packCount = Math.round(order.packCount);
  if (typeof order.deliveryNote === 'string' && order.deliveryNote.trim()) view.deliveryNote = order.deliveryNote.trim().slice(0, 200);
  const waPhone = staffWhatsappPhone(order.customerPhone);
  if (waPhone) view.waPhone = waPhone;
  return view;
}

/** Fields the owner client re-syncs when an order's delivery details change. */
export const DELIVERY_SYNC_FIELDS = ['deliveryMode', 'busStopId', 'packCount', 'deliveryNote', 'dispatchDate', 'slot', 'quantityKg', 'customerName', 'district', 'city', 'waPhone', 'busNumber'] as const;

export function projectionDrift(view: Record<string, unknown> | undefined, order: StaffSourceOrder): Record<string, unknown> | null {
  const next = toStaffOrderView(order);
  if (!view) return next;
  const patch: Record<string, unknown> = {};
  for (const key of DELIVERY_SYNC_FIELDS) if ((next[key] ?? null) !== (view[key] ?? null) && next[key] !== undefined) patch[key] = next[key];
  // v1.0.72: a cleared bus number is cleared for staff too (null = no bus number).
  if (next.busNumber === undefined && typeof view.busNumber === 'string' && view.busNumber) patch.busNumber = null;
  return Object.keys(patch).length ? patch : null;
}

/**
 * Spark-only staff update (no Cloud Function): staff write the status to the
 * private order (rules allow only status + updatedAt) and to the projection
 * (rules allow only these keys). statusSyncPending tells the owner client to
 * copy the status to the public tracking doc, which staff cannot address.
 */
export function staffStatusUpdate(action: StaffAction, uid: string): { order: { status: string }; view: Record<string, unknown> } {
  const status = action === 'packing_done' ? 'in_packing' : action === 'dispatched' ? 'dispatched' : 'delivered';
  const view: Record<string, unknown> = { status, statusSyncPending: true, statusUpdatedBy: uid };
  if (action === 'packing_done') view.packingStatus = 'packed';
  return { order: { status }, view };
}

export function hasForbiddenStaffField(record: Record<string, unknown>): string[] {
  return STAFF_FORBIDDEN_FIELDS.filter((field) => field in record);
}
