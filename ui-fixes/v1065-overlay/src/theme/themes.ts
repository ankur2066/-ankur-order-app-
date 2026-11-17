import { DESIGN_TOKENS, GROUP_COLORS, STOP_PALETTE } from './designTokens';
import type { ThemeId } from '../types';

/**
 * Owner-selectable themes.
 *
 * How it works: the app's existing screens use Tailwind's `sky-*` colours as
 * their accent. Tailwind v4 compiles those utilities to CSS variables
 * (`--color-sky-500` ...), so re-pointing that scale re-colours existing owner,
 * staff and customer screens without touching each component. New storefront
 * screens use the semantic `--brand*` variables directly.
 */

export interface ThemeDef {
  id: ThemeId;
  label: string;      // English
  hindi: string;      // Hindi label shown to owner
  swatch: string;     // preview colour
  isDark: boolean;
  themeColor: string; // browser/status bar colour
  vars: Record<string, string>;
}

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function accentScale(values: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  STEPS.forEach((step, i) => {
    out[`--color-sky-${step}`] = values[i];
  });
  return out;
}

const ORANGE = ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#FF7A00', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407'];
const EMERALD = ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'];
const BLUE = ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'];
const VIOLET = ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2e1065'];

const ICE = ['#EFFBFF', '#DDF6FF', '#B6EAF8', '#84D5EA', '#4DB9D7', '#158DB6', '#08749B', '#085D7D', '#104A67', '#103A54', '#0A2639'];

const LIGHT_SURFACES = {
  '--app-bg': '#F6F3EE',
  '--card-bg': '#FFFFFF',
  '--text-main': '#0F172A',
  '--text-sub': '#5B6577',
  '--line': '#E7E2DA',
};

export const THEMES: ThemeDef[] = [
  {
    id: 'soft-3d', label: 'Soft 3D', hindi: 'सॉफ्ट 3D', swatch: '#F4F5F7', isDark: false, themeColor: '#F4F5F7',
    vars: {
      ...accentScale(BLUE), '--app-bg': DESIGN_TOKENS.light.appBg, '--card-bg': DESIGN_TOKENS.light.card, '--text-main': DESIGN_TOKENS.light.text, '--text-sub': DESIGN_TOKENS.light.muted, '--line': DESIGN_TOKENS.light.line,
      '--brand': '#315FDB', '--brand-deep': '#2448A8', '--brand-soft': '#E7EEFF', '--brand-ink': '#17346F', '--on-brand': '#FFFFFF', '--hero-1': '#315FDB', '--hero-2': '#14264F',
      '--radius-card': DESIGN_TOKENS.radius.card, '--radius-button': DESIGN_TOKENS.radius.button, '--shadow-small': DESIGN_TOKENS.shadow.small, '--shadow-large': DESIGN_TOKENS.shadow.large, '--space-card': DESIGN_TOKENS.spacing.card, '--space-gap': DESIGN_TOKENS.spacing.gap,
      ...Object.entries(DESIGN_TOKENS.status).reduce((vars, [key, item]) => Object.assign(vars, { [`--status-${key}-bg`]: item.light, [`--status-${key}-ink`]: item.ink }), {}),
      '--sheet-backdrop': 'rgb(10 12 18 / .42)', '--feature-row-bg': '#FFFFFF', '--feature-row-ink': '#1C1E24', '--tool-track': '#E9EBEF', '--switch-track-off': '#767B85', '--switch-thumb': '#FFFFFF',
    },
  },
  {
    id: 'saffron',
    label: 'Bhagwa Saffron',
    hindi: 'भगवा केसरी',
    swatch: '#FF7A00',
    isDark: false,
    themeColor: '#FF7A00',
    vars: {
      ...accentScale(ORANGE),
      ...LIGHT_SURFACES,
      '--brand': '#FF7A00',
      '--brand-deep': '#C2410C',
      '--brand-soft': '#FFF1E0',
      '--brand-ink': '#7C2D12',
      '--on-brand': '#FFFFFF',
      '--hero-1': '#5C2600',
      '--hero-2': '#241006',
    },
  },
  {
    id: 'emerald',
    label: 'Emerald Green',
    hindi: 'एमरल्ड हरा',
    swatch: '#059669',
    isDark: false,
    themeColor: '#059669',
    vars: {
      ...accentScale(EMERALD),
      ...LIGHT_SURFACES,
      '--brand': '#059669',
      '--brand-deep': '#047857',
      '--brand-soft': '#E3F6EE',
      '--brand-ink': '#064E3B',
      '--on-brand': '#FFFFFF',
      '--hero-1': '#065F46',
      '--hero-2': '#022C22',
    },
  },
  {
    id: 'royal-blue',
    label: 'Royal Blue',
    hindi: 'रॉयल नीला',
    swatch: '#1D4ED8',
    isDark: false,
    themeColor: '#1D4ED8',
    vars: {
      ...accentScale(BLUE),
      ...LIGHT_SURFACES,
      '--brand': '#1D4ED8',
      '--brand-deep': '#1E40AF',
      '--brand-soft': '#E6EDFF',
      '--brand-ink': '#172554',
      '--on-brand': '#FFFFFF',
      '--hero-1': '#1E3A8A',
      '--hero-2': '#0B1B4D',
    },
  },
  {
    id: 'purple',
    label: 'Purple',
    hindi: 'बैंगनी',
    swatch: '#7C3AED',
    isDark: false,
    themeColor: '#7C3AED',
    vars: {
      ...accentScale(VIOLET),
      ...LIGHT_SURFACES,
      '--brand': '#7C3AED',
      '--brand-deep': '#6D28D9',
      '--brand-soft': '#F0E9FF',
      '--brand-ink': '#3B0764',
      '--on-brand': '#FFFFFF',
      '--hero-1': '#4C1D95',
      '--hero-2': '#1E0A3C',
    },
  },
  {
    id: 'ice-blue',
    label: 'Ice Blue Professional',
    hindi: 'आइस ब्लू',
    swatch: '#08749B',
    isDark: false,
    themeColor: '#08749B',
    vars: {
      ...accentScale(ICE),
      '--app-bg': '#F4FAFD',
      '--card-bg': '#FFFFFF',
      '--text-main': '#142C3D',
      '--text-sub': '#486274',
      '--line': '#D5E6ED',
      '--brand': '#08749B',
      '--brand-deep': '#085D7D',
      '--brand-soft': '#E5F6FC',
      '--brand-ink': '#104A67',
      '--on-brand': '#FFFFFF',
      '--hero-1': '#176F92',
      '--hero-2': '#10344C',
    },
  },
  {
    id: 'dark',
    label: 'Dark',
    hindi: 'डार्क',
    swatch: '#111827',
    isDark: true,
    themeColor: '#0B1020',
    vars: {
      ...accentScale(ORANGE),
      '--app-bg': '#14161C',
      '--card-bg': '#1E2129',
      '--text-main': '#F4F5F7',
      '--text-sub': '#C3C7D0',
      '--line': '#343842',
      '--radius-card': DESIGN_TOKENS.radius.card, '--radius-button': DESIGN_TOKENS.radius.button, '--shadow-small': '0 2px 5px rgb(0 0 0 / 0.28)', '--shadow-large': '0 12px 28px rgb(0 0 0 / 0.25)', '--space-card': DESIGN_TOKENS.spacing.card, '--space-gap': DESIGN_TOKENS.spacing.gap,
      ...Object.entries(DESIGN_TOKENS.status).reduce((vars, [key, item]) => Object.assign(vars, { [`--status-${key}-bg`]: item.dark, [`--status-${key}-ink`]: '#F4F5F7' }), {}),
      '--sheet-backdrop': 'rgb(0 0 0 / .62)', '--feature-row-bg': '#292D36', '--feature-row-ink': '#F4F5F7', '--tool-track': '#282C35', '--switch-track-off': '#767B85', '--switch-thumb': '#FFFFFF',
      '--brand': '#FF7A00',
      '--brand-deep': '#FB923C',
      '--brand-soft': '#2B1B0C',
      '--brand-ink': '#FFD7B0',
      '--on-brand': '#FFFFFF',
      '--hero-1': '#111A33',
      '--hero-2': '#050816',
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'soft-3d';
const CACHE_KEY = 'ankur_theme_v1';

export function getTheme(id: string | undefined | null): ThemeDef {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function applyTheme(id: string | undefined | null): ThemeDef {
  const theme = getTheme(id);
  if (typeof document === 'undefined') return theme;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => root.style.setProperty(key, value));
  Object.entries(DESIGN_TOKENS.status).forEach(([key, value]) => {
    root.style.setProperty(`--status-${key}-bg`, theme.isDark ? value.dark : value.light);
    root.style.setProperty(`--status-${key}-ink`, theme.isDark ? '#F4F5F7' : value.ink);
  });
  root.style.setProperty('--radius-card', theme.vars['--radius-card'] || DESIGN_TOKENS.radius.card);
  root.style.setProperty('--radius-button', theme.vars['--radius-button'] || DESIGN_TOKENS.radius.button);
  root.style.setProperty('--shadow-small', theme.vars['--shadow-small'] || DESIGN_TOKENS.shadow.small);
  root.style.setProperty('--shadow-large', theme.vars['--shadow-large'] || DESIGN_TOKENS.shadow.large);
  root.style.setProperty('--space-card', theme.vars['--space-card'] || DESIGN_TOKENS.spacing.card);
  root.style.setProperty('--space-gap', theme.vars['--space-gap'] || DESIGN_TOKENS.spacing.gap);
  root.style.setProperty('--radius-inset', DESIGN_TOKENS.radius.inset);
  root.style.setProperty('--shadow-raised', theme.isDark ? '0 2px 6px rgb(0 0 0 / 0.32), 0 10px 22px rgb(0 0 0 / 0.26)' : DESIGN_TOKENS.shadow.raised);
  root.style.setProperty('--shadow-pressed', theme.isDark ? 'inset 0 2px 6px rgb(0 0 0 / 0.45)' : DESIGN_TOKENS.shadow.pressed);
  root.style.setProperty('--space-pill', DESIGN_TOKENS.spacing.pill);
  // Bus stop colour tags keep the light chip palette in both themes (ink pairs are contrast-tested).
  STOP_PALETTE.forEach((item) => { root.style.setProperty(`--stop-${item.id}-bg`, item.bg); root.style.setProperty(`--stop-${item.id}-ink`, item.ink); });
  Object.entries(GROUP_COLORS).forEach(([key, item]) => { root.style.setProperty(`--stop-${key}-bg`, item.bg); root.style.setProperty(`--stop-${key}-ink`, item.ink); });
  root.setAttribute('data-theme', theme.id);
  root.style.colorScheme = theme.isDark ? 'dark' : 'light';
  try {
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = theme.themeColor;
    localStorage.setItem(CACHE_KEY, theme.id);
  } catch {
    /* storage can be unavailable; theme still applied for this session */
  }
  return theme;
}

/** Applies the last theme seen on this device (before Firestore answers) to avoid a colour flash. */
export function applyCachedTheme(): void {
  let cached: string | null = null;
  try {
    cached = localStorage.getItem(CACHE_KEY);
  } catch {
    cached = null;
  }
  applyTheme(cached || DEFAULT_THEME_ID);
}
