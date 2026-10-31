export const FIVE_MINUTES = 300000;

export function canUndoPickup({ isOwner, actorUid, completedBy, completedAt, nowMs }) {
  if (!actorUid || !Number.isFinite(nowMs)) return false;
  if (isOwner) return true;
  const completedAtMs = typeof completedAt === 'string' ? Date.parse(completedAt) : NaN;
  return completedBy === actorUid &&
    Number.isFinite(completedAtMs) &&
    nowMs >= completedAtMs &&
    nowMs - completedAtMs <= FIVE_MINUTES;
}

export function validatePickupAction({ orderId, action, reason }) {
  if (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{4,64}$/.test(orderId)) return 'Invalid order ID';
  if (action !== 'confirm' && action !== 'undo') return 'Invalid action';
  if (action === 'undo' && (typeof reason !== 'string' || !reason.trim() || reason.length > 500)) {
    return 'Undo reason required (1-500 chars)';
  }
  return null;
}
