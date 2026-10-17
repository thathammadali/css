/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThemeSwatch } from '../types';

export const THEME_STORAGE_KEY = 'sems_theme_id';
export const THEME_UNLOCKED_STORAGE_KEY = 'sems_unlocked_themes_map';
export const THEME_MODE_STORAGE_KEY = 'sems_color_mode_preference';

/**
 * 5 Curated Designer Themes for SEMS
 * 1. Enterprise Midnight (SEMS Dark) - Deep slate & mint teal
 * 2. Campus Daylight (SEMS Light) - Academic slate & forest teal
 * 3. Royal Sapphire - Cobalt navy & cyan glow
 * 4. Botanical Emerald - Academic forest & spring green
 * 5. Oxford Crimson - Heritage university burgundy & rose
 */
export const THEME_SWATCHES: ThemeSwatch[] = [
  // 1. Enterprise Midnight (SEMS Dark)
  {
    id: 'enterprise-midnight',
    number: 1,
    name: 'Enterprise Midnight',
    vibe: 'restrained / institutional / enterprise dark',
    category: 'Institutional / Professional',
    swatchColors: ['#070B14', '#10192A', '#2DD4BF', '#F8FAFC'],
    primary: '#10192A',
    secondary: '#F8FAFC',
    background: '#070B14',
    unlocked: true,
    bgStart: '#070B14',
    bgEnd: '#0A101F',
    accent: '#2DD4BF',
    secondaryText: '#94A3B8',
    mode: 'dark',
    sidebarBg: '#090E1B',
    topbarBg: '#0B1120',
    sidebarBorder: '#1E2E48',
    topbarBorder: '#1E2E48',
  },
  // 2. Campus Daylight (SEMS Light)
  {
    id: 'campus-daylight',
    number: 2,
    name: 'Campus Daylight',
    vibe: 'clean / institutional / high-contrast light',
    category: 'Institutional / Professional',
    swatchColors: ['#E8EDF5', '#FFFFFF', '#0F766E', '#172B3A'],
    primary: '#172B3A',
    secondary: '#FFFFFF',
    background: '#E8EDF5',
    unlocked: true,
    bgStart: '#E8EDF5',
    bgEnd: '#DCE3EB',
    accent: '#0F766E',
    secondaryText: '#475569',
    mode: 'light',
    sidebarBg: '#FFFFFF',
    topbarBg: '#FFFFFF',
    sidebarBorder: '#CBD5E1',
    topbarBorder: '#CBD5E1',
  },
  // 3. Royal Sapphire & Navy
  {
    id: 'royal-sapphire',
    number: 3,
    name: 'Royal Sapphire',
    vibe: 'prestigious / academic cobalt / timeless',
    category: 'University / Modern UI',
    swatchColors: ['#061121', '#0D2242', '#38BDF8', '#F0F9FF'],
    primary: '#0D2242',
    secondary: '#F0F9FF',
    background: '#061121',
    unlocked: true,
    bgStart: '#061121',
    bgEnd: '#0A1C36',
    accent: '#38BDF8',
    secondaryText: '#BAE6FD',
    mode: 'dark',
    sidebarBg: '#08172E',
    topbarBg: '#0B1F3C',
    sidebarBorder: '#18365E',
    topbarBorder: '#18365E',
  },
  // 4. Botanical Emerald & Forest
  {
    id: 'botanical-emerald',
    number: 4,
    name: 'Botanical Emerald',
    vibe: 'academic / lush forest / balanced',
    category: 'Campus / Life Sciences',
    swatchColors: ['#051812', '#0A2B20', '#10B981', '#ECFDF5'],
    primary: '#0A2B20',
    secondary: '#ECFDF5',
    background: '#051812',
    unlocked: true,
    bgStart: '#051812',
    bgEnd: '#082119',
    accent: '#10B981',
    secondaryText: '#A7F3D0',
    mode: 'dark',
    sidebarBg: '#071F17',
    topbarBg: '#09271E',
    sidebarBorder: '#144534',
    topbarBorder: '#144534',
  },
  // 5. Oxford Crimson & Burgundy
  {
    id: 'oxford-crimson',
    number: 5,
    name: 'Oxford Crimson',
    vibe: 'heritage / ivy league / refined velvet',
    category: 'Editorial / Heritage',
    swatchColors: ['#14070A', '#290E14', '#FB7185', '#FFF1F2'],
    primary: '#290E14',
    secondary: '#FFF1F2',
    background: '#14070A',
    unlocked: true,
    bgStart: '#14070A',
    bgEnd: '#200A0F',
    accent: '#FB7185',
    secondaryText: '#FDA4AF',
    mode: 'dark',
    sidebarBg: '#1B080D',
    topbarBg: '#210B11',
    sidebarBorder: '#471520',
    topbarBorder: '#471520',
  },
];

export const DEFAULT_THEME_ID = 'enterprise-midnight';

export function hexToRgb(hex: string): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

export function getInitialTheme(): ThemeSwatch {
  const defaultTheme = THEME_SWATCHES.find((t) => t.id === DEFAULT_THEME_ID) || THEME_SWATCHES[0];
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      const match = THEME_SWATCHES.find((t) => t.id === saved && t.unlocked);
      if (match) return match;
    }
  } catch {
    // LocalStorage fallback
  }
  return defaultTheme;
}

export function applyThemeToDocument(theme: ThemeSwatch): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isLight = theme.mode === 'light';

  if (isLight) {
    root.classList.remove('dark');
    root.classList.add('light-theme');
    root.setAttribute('data-theme', 'light');
    root.setAttribute('data-theme-id', theme.id);
    root.style.colorScheme = 'light';

    // Official SEMS Light Mode Design Tokens
    const bgStart = theme.bgStart || '#E8EDF5';
    const bgEnd = theme.bgEnd || '#DCE3EB';
    root.style.setProperty('--app-bg', bgStart);
    root.style.setProperty('--panel-bg', '#FFFFFF');
    root.style.setProperty('--panel-bg-translucent', 'rgba(255, 255, 255, 0.98)');
    root.style.setProperty('--panel-border', '#CBD5E1');
    root.style.setProperty('--panel-border-subtle', '#E2E8F0');
    root.style.setProperty('--text-primary', '#0F172A');
    root.style.setProperty('--text-secondary', '#475569');
    root.style.setProperty('--text-muted', '#64748B');
    root.style.setProperty('--primary-accent', theme.accent || '#0F766E');
    root.style.setProperty('--primary-accent-hover', '#115E59');
    root.style.setProperty('--primary-accent-rgb', hexToRgb(theme.accent || '#0F766E'));
    root.style.setProperty('--primary-accent-subtle', 'rgba(15, 118, 110, 0.08)');
    root.style.setProperty('--card-shadow', '0 2px 4px -1px rgba(15, 23, 42, 0.06), 0 8px 24px -4px rgba(15, 23, 42, 0.10), 0 0 0 1px rgba(15, 23, 42, 0.05)');

    root.style.setProperty('--sidebar-bg', theme.sidebarBg || '#FFFFFF');
    root.style.setProperty('--topbar-bg', theme.topbarBg || '#FFFFFF');
    root.style.setProperty('--sidebar-border', theme.sidebarBorder || '#CBD5E1');
    root.style.setProperty('--topbar-border', theme.topbarBorder || '#CBD5E1');

    root.style.setProperty('--bg-start', bgStart);
    root.style.setProperty('--bg-end', bgEnd);
    root.style.setProperty('--theme-primary', theme.primary || '#172B3A');
    root.style.setProperty('--theme-secondary', '#475569');
    root.style.setProperty('--theme-background', bgStart);

    const accentRgb = hexToRgb(theme.accent || '#0F766E');
    const textSecRgb = hexToRgb('#475569');
    const bgStartRgb = hexToRgb(bgStart);
    const bgEndRgb = hexToRgb(bgEnd);

    root.style.setProperty('--bg-start-rgb', bgStartRgb);
    root.style.setProperty('--bg-end-rgb', bgEndRgb);
    root.style.setProperty('--text-secondary-rgb', textSecRgb);

    root.style.setProperty('--accent-10', `rgba(${accentRgb}, 0.10)`);
    root.style.setProperty('--accent-15', `rgba(${accentRgb}, 0.15)`);
    root.style.setProperty('--accent-20', `rgba(${accentRgb}, 0.20)`);
    root.style.setProperty('--accent-25', `rgba(${accentRgb}, 0.25)`);
    root.style.setProperty('--accent-30', `rgba(${accentRgb}, 0.30)`);
    root.style.setProperty('--accent-40', `rgba(${accentRgb}, 0.40)`);
    root.style.setProperty('--accent-50', `rgba(${accentRgb}, 0.50)`);
    root.style.setProperty('--text-sec-60', 'rgba(71, 85, 105, 0.7)');
    root.style.setProperty('--text-sec-70', 'rgba(71, 85, 105, 0.85)');
    root.style.setProperty('--text-sec-80', 'rgba(71, 85, 105, 0.95)');
    root.style.setProperty('--bg-start-80', 'rgba(255, 255, 255, 0.95)');
    root.style.setProperty('--bg-end-90', 'rgba(255, 255, 255, 0.98)');
    root.style.setProperty('--glass-bg', '#FFFFFF');
    root.style.setProperty('--glass-border', '#CBD5E1');
    root.style.setProperty('--glass-shadow', '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)');
    root.style.setProperty('--glass-blur', 'blur(16px)');
  } else {
    root.classList.remove('light-theme');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.setAttribute('data-theme-id', theme.id);
    root.style.colorScheme = 'dark';

    // Official SEMS Dark Mode Design Tokens
    const bgStart = theme.bgStart || '#070B14';
    const bgEnd = theme.bgEnd || '#0A101F';
    const panelBg = theme.primary || '#10192A';
    const panelBorder = theme.sidebarBorder || '#1E2E48';

    root.style.setProperty('--app-bg', bgStart);
    root.style.setProperty('--panel-bg', panelBg);
    root.style.setProperty('--panel-bg-translucent', 'rgba(16, 25, 42, 0.88)');
    root.style.setProperty('--panel-border', panelBorder);
    root.style.setProperty('--panel-border-subtle', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--text-primary', '#F8FAFC');
    root.style.setProperty('--text-secondary', '#94A3B8');
    root.style.setProperty('--text-muted', '#64748B');
    root.style.setProperty('--primary-accent', theme.accent || '#2DD4BF');
    root.style.setProperty('--primary-accent-hover', '#14B8A6');
    root.style.setProperty('--primary-accent-rgb', hexToRgb(theme.accent || '#2DD4BF'));
    root.style.setProperty('--primary-accent-subtle', `rgba(${hexToRgb(theme.accent || '#2DD4BF')}, 0.15)`);
    root.style.setProperty('--card-shadow', '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)');
    root.style.setProperty('--glass-bg', panelBg);
    root.style.setProperty('--glass-border', panelBorder);
    root.style.setProperty('--glass-shadow', '0 8px 30px -4px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.06)');
    root.style.setProperty('--glass-blur', 'blur(16px)');

    root.style.setProperty('--sidebar-bg', theme.sidebarBg || '#090E1B');
    root.style.setProperty('--topbar-bg', theme.topbarBg || '#0B1120');
    root.style.setProperty('--sidebar-border', panelBorder);
    root.style.setProperty('--topbar-border', panelBorder);

    root.style.setProperty('--bg-start', theme.bgStart);
    root.style.setProperty('--bg-end', theme.bgEnd);
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-background', theme.background);

    const accentRgb = hexToRgb(theme.accent);
    const textSecRgb = hexToRgb(theme.secondaryText);
    const bgStartRgb = hexToRgb(theme.bgStart);
    const bgEndRgb = hexToRgb(theme.bgEnd);

    root.style.setProperty('--text-secondary-rgb', textSecRgb);
    root.style.setProperty('--bg-start-rgb', bgStartRgb);
    root.style.setProperty('--bg-end-rgb', bgEndRgb);

    root.style.setProperty('--accent-10', `rgba(${accentRgb}, 0.10)`);
    root.style.setProperty('--accent-15', `rgba(${accentRgb}, 0.15)`);
    root.style.setProperty('--accent-20', `rgba(${accentRgb}, 0.20)`);
    root.style.setProperty('--accent-25', `rgba(${accentRgb}, 0.25)`);
    root.style.setProperty('--accent-30', `rgba(${accentRgb}, 0.30)`);
    root.style.setProperty('--accent-40', `rgba(${accentRgb}, 0.40)`);
    root.style.setProperty('--accent-50', `rgba(${accentRgb}, 0.50)`);
    root.style.setProperty('--text-sec-60', `rgba(${textSecRgb}, 0.65)`);
    root.style.setProperty('--text-sec-70', `rgba(${textSecRgb}, 0.78)`);
    root.style.setProperty('--text-sec-80', `rgba(${textSecRgb}, 0.88)`);
    root.style.setProperty('--bg-start-80', `rgba(${bgStartRgb}, 0.85)`);
    root.style.setProperty('--bg-end-90', `rgba(${bgEndRgb}, 0.92)`);
  }
}
