/**
 * Shared soft 3D design tokens and fixed status palette.
 * This is the ONE place for app colours, radius, raised/pressed shadows and
 * spacing. Components use the CSS variables applied from here (themes.ts) or
 * the exported constants below; scripts/check-theme-colors.mjs rejects new
 * inline hex colours elsewhere in src/.
 */
export const DESIGN_TOKENS = {
  light: { appBg: '#F4F5F7', card: '#FFFFFF', text: '#1C1E24', muted: '#50545D', line: '#E7E9ED', brand: '#315FDB', onBrand: '#FFFFFF' },
  dark: { appBg: '#14161C', card: '#1E2129', text: '#F4F5F7', muted: '#C3C7D0', line: '#343842', brand: '#7898FF', onBrand: '#14161C' },
  radius: { card: '22px', button: '999px', chip: '999px', inset: '16px' },
  shadow: {
    small: '0 2px 5px rgb(20 22 28 / 0.08)',
    large: '0 12px 28px rgb(20 22 28 / 0.08)',
    /** Soft 3D raised surface (cards, pill tabs at rest). */
    raised: '0 1px 0 rgb(255 255 255 / 0.9) inset, 0 2px 5px rgb(20 22 28 / 0.08), 0 10px 22px rgb(20 22 28 / 0.08)',
    /** Pressed state (active pill, pressed button). */
    pressed: 'inset 0 2px 6px rgb(20 22 28 / 0.16), inset 0 -1px 0 rgb(255 255 255 / 0.6)',
  },
  spacing: { card: '16px', gap: '14px', pill: '10px 18px' },
  /** Order status colours: one source for tiles, buttons and All Orders chips. */
  status: {
    total: { light: '#E9ECF2', dark: '#303540', ink: '#292D35' },
    pending: { light: '#FFF1C2', dark: '#503D12', ink: '#684900' },
    confirmed: { light: '#EFE7FF', dark: '#39265E', ink: '#4B258C' },
    packing: { light: '#DFEEFF', dark: '#173C66', ink: '#154E8A' },
    dispatch: { light: '#E8E8FF', dark: '#28285F', ink: '#34358A' },
    delivered: { light: '#DDF6E8', dark: '#17472D', ink: '#176239' },
  },
  /** Dark-theme chips use one light ink on the dark status backgrounds. */
  darkStatusInk: '#F4F5F7',
} as const;

/**
 * Owner-selectable bus stop colour tags. Each pair is checked for >= 4.5:1
 * contrast in src/utils/contrast.test.ts.
 */
export const STOP_PALETTE = [
  { id: 'teal', bg: '#D8F3EF', ink: '#0B5A50' },
  { id: 'orange', bg: '#FFE6D2', ink: '#8A3A00' },
  { id: 'violet', bg: '#ECE4FF', ink: '#4B258C' },
  { id: 'rose', bg: '#FFE0E8', ink: '#8C1D3F' },
  { id: 'lime', bg: '#E6F5CF', ink: '#3D5A0B' },
  { id: 'sky', bg: '#DCEFFF', ink: '#0E4C80' },
] as const;

export const GROUP_COLORS = {
  local: { bg: '#F1E9DC', ink: '#5A3E12' },
  unassigned: { bg: '#E9ECF2', ink: '#292D35' },
} as const;

/** Owner reports chart (recharts needs literal colours, so they live here). */
export const CHART_COLORS = { grid: '#F1F5F9', axisText: '#475569', axisLine: '#E2E8F0', bar: '#0284C7' } as const;

export type StopColorId = (typeof STOP_PALETTE)[number]['id'];

export function stopColor(id: string | undefined): { bg: string; ink: string } {
  if (id === 'local') return GROUP_COLORS.local;
  if (id === 'unassigned') return GROUP_COLORS.unassigned;
  return STOP_PALETTE.find((item) => item.id === id) || STOP_PALETTE[0];
}

/** Maps an order status to its status token key. */
export function statusTokenKey(status: string): keyof typeof DESIGN_TOKENS.status {
  switch (status) {
    case 'pending': return 'pending';
    case 'confirmed': return 'confirmed';
    case 'in_packing': return 'packing';
    case 'dispatched': return 'dispatch';
    case 'delivered': return 'delivered';
    default: return 'total';
  }
}
