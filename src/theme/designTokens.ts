/** Shared soft 3D design tokens and fixed status palette. */
export const DESIGN_TOKENS = {
  light: { appBg: '#F4F5F7', card: '#FFFFFF', text: '#1C1E24', muted: '#50545D', line: '#E7E9ED', brand: '#315FDB' },
  dark: { appBg: '#14161C', card: '#1E2129', text: '#F4F5F7', muted: '#C3C7D0', line: '#343842', brand: '#7898FF' },
  radius: { card: '22px', button: '999px', chip: '999px' },
  shadow: { small: '0 2px 5px rgb(20 22 28 / 0.08)', large: '0 12px 28px rgb(20 22 28 / 0.08)' },
  spacing: { card: '16px', gap: '14px' },
  status: {
    total: { light: '#E9ECF2', dark: '#303540', ink: '#292D35' },
    pending: { light: '#FFF1C2', dark: '#503D12', ink: '#684900' },
    confirmed: { light: '#EFE7FF', dark: '#39265E', ink: '#4B258C' },
    packing: { light: '#DFEEFF', dark: '#173C66', ink: '#154E8A' },
    dispatch: { light: '#E8E8FF', dark: '#28285F', ink: '#34358A' },
    delivered: { light: '#DDF6E8', dark: '#17472D', ink: '#176239' },
  },
} as const;
