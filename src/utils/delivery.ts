/**
 * Delivery mode, bus stop and packing helpers (pure functions, no Firebase).
 * Spark-only: everything here runs in the client; settings live in the
 * owner-written Firestore document settings/delivery.
 */
import { STOP_PALETTE } from '../theme/designTokens.ts';
import { istDateKey, dispatchParts } from './dispatchSchedule.ts';

export type DeliveryMode = 'BUS' | 'SHOP_PICKUP' | 'PORTER' | 'LOCAL';
export const DELIVERY_MODES: readonly DeliveryMode[] = ['BUS', 'SHOP_PICKUP', 'PORTER', 'LOCAL'];

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, { hi: string; en: string }> = {
  BUS: { hi: 'बस से (बस स्टॉप)', en: 'By bus (bus stop)' },
  SHOP_PICKUP: { hi: 'दुकान से पिकअप', en: 'Shop pickup' },
  PORTER: { hi: 'Porter', en: 'Porter' },
  LOCAL: { hi: 'लोकल डिलीवरी', en: 'Local delivery' },
};

/** Per-order delivery tags (Local box shows its Local delivery / Dukan pickup split). */
export const LOCAL_SUBTAG: Record<Exclude<DeliveryMode, 'BUS'>, string> = {
  PORTER: 'Porter',
  SHOP_PICKUP: 'Dukan pickup',
  LOCAL: 'Local delivery',
};

export interface BusStop { id: string; name: string; color: string; active: boolean }

export interface DeliverySettings {
  busStops: BusStop[];
  /** lower-cased district/city -> bus stop id */
  districtStopMap: Record<string, string>;
}

export const DEFAULT_BUS_STOPS: BusStop[] = [
  { id: 'alambagh', name: 'Alambagh', color: STOP_PALETTE[0].id, active: true },
  { id: 'kaiserbagh', name: 'Kaiserbagh', color: STOP_PALETTE[1].id, active: true },
];

/**
 * v1.0.71 (owner): packing boxes are Alambagh, Kaiserbagh, Porter and Local.
 * "Bus Stop 3" is retired. It may still be stored in Firestore settings/delivery
 * and on old orders, so it is never deleted: it is always read as inactive
 * (old orders show under "Bus Stop 3 (Inactive)", new orders cannot pick it).
 */
export const RETIRED_STOP_IDS: readonly string[] = ['bus-stop-3'];
export function isRetiredStop(stopId: string | undefined | null): boolean {
  return typeof stopId === 'string' && RETIRED_STOP_IDS.includes(stopId);
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = { busStops: DEFAULT_BUS_STOPS, districtStopMap: {} };

export function isDeliveryMode(value: unknown): value is DeliveryMode {
  return typeof value === 'string' && (DELIVERY_MODES as readonly string[]).includes(value);
}

export function districtKey(value: string | undefined | null): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function slugStopId(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return slug.length >= 2 ? slug : `stop-${Date.now().toString(36)}`;
}

/** Accept whatever is stored in Firestore and return a safe settings object. */
export function normalizeDeliverySettings(raw: any): DeliverySettings {
  const paletteIds = STOP_PALETTE.map((item) => item.id) as string[];
  const stops = Array.isArray(raw?.busStops) ? raw.busStops : null;
  const busStops: BusStop[] = (stops && stops.length ? stops : DEFAULT_BUS_STOPS)
    .filter((stop: any) => stop && typeof stop.id === 'string' && typeof stop.name === 'string' && stop.name.trim())
    .slice(0, 30)
    .map((stop: any, index: number) => ({
      id: stop.id.slice(0, 64),
      name: stop.name.trim().slice(0, 60),
      color: paletteIds.includes(stop.color) ? stop.color : paletteIds[index % paletteIds.length],
      active: stop.active !== false && !isRetiredStop(stop.id),
    }));
  const map: Record<string, string> = {};
  const source = raw?.districtStopMap && typeof raw.districtStopMap === 'object' ? raw.districtStopMap : {};
  for (const [district, stopId] of Object.entries(source)) {
    if (typeof stopId === 'string' && districtKey(district)) map[districtKey(district)] = stopId;
  }
  return { busStops, districtStopMap: map };
}

export function activeStops(settings: DeliverySettings): BusStop[] {
  return settings.busStops.filter((stop) => stop.active);
}

export function findStop(settings: DeliverySettings, stopId?: string | null): BusStop | undefined {
  return stopId ? settings.busStops.find((stop) => stop.id === stopId) : undefined;
}

export interface CustomerDeliveryDefaults { defaultDeliveryMode?: string | null; defaultBusStopId?: string | null }

export type DeliveryResolution =
  | { source: 'customer' | 'district'; mode: DeliveryMode; busStopId?: string; warning?: undefined }
  | { source: 'ask'; mode?: undefined; busStopId?: undefined; warning?: 'inactive_default_stop' | 'unknown_default_stop'; staleStopId?: string };

/**
 * Priority: customer's saved default -> district mapping -> ask.
 * An inactive (or deleted) default stop is NEVER silently replaced: the result
 * is "ask" with a warning so the owner/customer has to choose.
 */
export function resolveDeliveryDefault(customer: CustomerDeliveryDefaults | null | undefined, district: string | undefined, settings: DeliverySettings): DeliveryResolution {
  if (customer && isDeliveryMode(customer.defaultDeliveryMode)) {
    if (customer.defaultDeliveryMode !== 'BUS') return { source: 'customer', mode: customer.defaultDeliveryMode };
    const stop = findStop(settings, customer.defaultBusStopId);
    if (stop?.active) return { source: 'customer', mode: 'BUS', busStopId: stop.id };
    return { source: 'ask', warning: stop ? 'inactive_default_stop' : 'unknown_default_stop', staleStopId: customer.defaultBusStopId || undefined };
  }
  const mapped = settings.districtStopMap[districtKey(district)];
  const stop = findStop(settings, mapped);
  if (stop?.active) return { source: 'district', mode: 'BUS', busStopId: stop.id };
  return { source: 'ask' };
}

/** Validates a chosen delivery for a NEW order: BUS needs an active stop. */
export function validateDeliveryChoice(mode: DeliveryMode | undefined, busStopId: string | undefined, settings: DeliverySettings): string | null {
  if (!mode) return 'Delivery mode chunein.';
  if (mode !== 'BUS') return null;
  const stop = findStop(settings, busStopId);
  if (!stop) return 'Bus stop chunein.';
  if (!stop.active) return 'Yeh bus stop abhi band (Inactive) hai. Dusra stop chunein.';
  return null;
}

export interface PackingOrder {
  orderId: string;
  customerName?: string;
  district?: string;
  city?: string;
  quantityKg?: number;
  deliveryMode?: string;
  busStopId?: string;
  packCount?: number;
  deliveryNote?: string;
  status?: string;
  packingStatus?: string;
  isTrash?: boolean;
  dispatchDate?: string;
  slot?: string;
  dispatchSlot?: string;
  dispatchTiming?: string;
  createdAt?: any;
}

export const LOCAL_GROUP = 'LOCAL';
/** v1.0.71: Porter orders get their own packing box. */
export const PORTER_GROUP = 'PORTER';
export const UNASSIGNED_GROUP = 'UNASSIGNED';

export interface PackingGroup<T extends PackingOrder = PackingOrder> {
  key: string;
  label: string;
  color: string;
  active: boolean;
  orders: T[];
  count: number;
  totalKg: number;
  subTags: Record<string, number>;
}

/**
 * Group key for one order: bus stop id, PORTER, LOCAL (local delivery and
 * godown/shop pickup), or UNASSIGNED (legacy orders without a mode).
 */
export function packingGroupKey(order: PackingOrder): string {
  if (order.deliveryMode === 'BUS') return order.busStopId || UNASSIGNED_GROUP;
  if (order.deliveryMode === 'PORTER') return PORTER_GROUP;
  if (isDeliveryMode(order.deliveryMode)) return LOCAL_GROUP;
  return UNASSIGNED_GROUP;
}

export function orderDispatchDate(order: PackingOrder): string | null {
  return dispatchParts(order as any).date;
}

const roundKg = (value: number) => Math.round(value * 100) / 100;

/**
 * Packing list for one IST date: one group per bus stop (active stops first,
 * inactive stops only when they still have orders), then Porter, then Local
 * (local delivery + godown pickup), then "Mode not set" for legacy orders. Cancelled/trashed orders are excluded.
 */
export function groupForPacking<T extends PackingOrder>(orders: T[], settings: DeliverySettings, dateKey: string = istDateKey()): PackingGroup<T>[] {
  const relevant = orders.filter((order) => !order.isTrash && order.status !== 'cancelled' && orderDispatchDate(order) === dateKey);
  const groups = new Map<string, PackingGroup<T>>();
  const make = (key: string, label: string, color: string, active: boolean) => {
    const group: PackingGroup<T> = { key, label, color, active, orders: [], count: 0, totalKg: 0, subTags: {} };
    groups.set(key, group);
    return group;
  };
  for (const stop of settings.busStops) if (stop.active) make(stop.id, stop.name, stop.color, true);
  make(PORTER_GROUP, 'Porter', 'local', true);
  make(LOCAL_GROUP, 'Local', 'local', true);
  for (const order of relevant) {
    const key = packingGroupKey(order);
    let group = groups.get(key);
    if (!group) {
      const stop = findStop(settings, key);
      group = stop ? make(stop.id, `${stop.name} (Inactive)`, stop.color, false) : make(UNASSIGNED_GROUP, 'Mode not set', 'unassigned', true);
    }
    group.orders.push(order);
    group.count += 1;
    group.totalKg = roundKg(group.totalKg + (Number(order.quantityKg) || 0));
    if (key === LOCAL_GROUP && isDeliveryMode(order.deliveryMode) && order.deliveryMode !== 'BUS') {
      const tag = LOCAL_SUBTAG[order.deliveryMode];
      group.subTags[tag] = (group.subTags[tag] || 0) + 1;
    }
  }
  const ordered = [...groups.values()];
  const rank = (group: PackingGroup<T>) => (group.key === PORTER_GROUP ? 2 : group.key === LOCAL_GROUP ? 3 : group.key === UNASSIGNED_GROUP ? 4 : group.active ? 0 : 1);
  return ordered
    .filter((group) => group.count > 0 || group.key === LOCAL_GROUP || group.key === PORTER_GROUP || group.active)
    .sort((a, b) => rank(a) - rank(b));
}

/** WhatsApp-ready packing text. Never includes rates, totals or payment fields. */
export function packingShareText(group: PackingGroup, dateKey: string): string {
  const lines = [`Ankur Dryice · Packing List · ${dateKey}`, `${group.label}: ${group.count} order · ${group.totalKg} KG`];
  group.orders.forEach((order, index) => {
    const tag = group.key === LOCAL_GROUP && isDeliveryMode(order.deliveryMode) && order.deliveryMode !== 'BUS' ? ` [${LOCAL_SUBTAG[order.deliveryMode]}]` : '';
    const packs = order.packCount ? ` · ${order.packCount} box` : '';
    const note = order.deliveryNote ? ` · ${order.deliveryNote}` : '';
    lines.push(`${index + 1}. ${order.customerName || 'Customer'} · ${order.district || order.city || '-'} · ${Number(order.quantityKg) || 0} KG${packs}${tag}${note}`);
  });
  return lines.join('\n');
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
