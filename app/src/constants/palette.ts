// App palette — soft pastel look mimicking the reference Mikel gave us:
// pale lavender backgrounds, white cards with very large rounded corners,
// violet hero panels, teal + warm orange accents, soft diffuse shadows.
// Dark and light stay dark and light; the accent colour is for the UI
// border (and accent buttons) only, never the main surface.
// Dark theme is the same language translated to dark (Midnight Galaxy:
// deep purple base, lavender accents, silver text), not the light
// theme inverted.
import type { ViewStyle } from 'react-native';

export interface Palette {
  bg: string;
  bg2: string;
  panel: string;
  panel2: string;
  line: string;
  ink: string;
  muted: string;
  faint: string;
  amber: string;
  enemy: string;
  you: string;
  good: string;
  chip: string;
  /** Scrim behind modals/drawers. */
  overlay: string;
  /** Violet hero colour — the bold violet moment (top pick card tint). */
  hero: string;
  /** Soft violet tint surface for the top pick card. */
  heroSoft: string;
  /** Text colour on top of an accent-coloured button. Dark ink on the
      accent in both themes — pale text on gold was ~1.9:1, unreadable. */
  onAccent: string;
  /** Corner radii (also see Radii below). */
  radiusCard: number;
  radiusTile: number;
  /** Soft diffuse shadow, violet-tinted in light mode. */
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffsetY: number;
  elevation: number;
}

export const darkPalette: Palette = {
  bg: '#171226',
  bg2: '#1e1830',
  panel: '#251d3d',
  panel2: '#2d2450',
  line: '#3e3568',
  ink: '#edeaf7',
  muted: '#b3abc9',
  faint: '#857ca6',
  amber: '#e8a93e',
  enemy: '#f26d5f',
  you: '#2dd4bf',
  good: '#7bc47f',
  chip: '#2d2450',
  overlay: 'rgba(0,0,0,0.6)',
  hero: '#6d5bd0',
  heroSoft: '#332a5e',
  onAccent: '#171226',
  radiusCard: 24,
  radiusTile: 14,
  shadowColor: '#000000',
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffsetY: 4,
  elevation: 4,
};

export const lightPalette: Palette = {
  bg: '#e9eafb',
  bg2: '#dfe1f7',
  panel: '#ffffff',
  panel2: '#f2f3fd',
  line: '#d6d7f2',
  ink: '#23203a',
  muted: '#5c5878',
  faint: '#77718f',
  amber: '#d97706',
  enemy: '#d64541',
  you: '#0f766e',
  good: '#2e7d32',
  chip: '#e4e6fa',
  overlay: 'rgba(35,32,58,0.45)',
  hero: '#8b7cf6',
  heroSoft: '#ede9fe',
  onAccent: '#23203a',
  radiusCard: 24,
  radiusTile: 14,
  shadowColor: '#5b54a6',
  shadowOpacity: 0.14,
  shadowRadius: 12,
  shadowOffsetY: 4,
  elevation: 3,
};

/** Corner radii as static tokens, for StyleSheet.create (which can't see
    the live palette). Cards 24 / tiles 14 — the reference's very rounded
    cards; pills stay 999 (fully round) where they already are. */
export const Radii = {
  card: 24,
  tile: 14,
} as const;

/** Soft diffuse shadow for cards and panels, from the live palette.
    iOS shadow props + Android elevation in one place. */
export function cardShadow(p: Palette): ViewStyle {
  return {
    shadowColor: p.shadowColor,
    shadowOffset: { width: 0, height: p.shadowOffsetY },
    shadowOpacity: p.shadowOpacity,
    shadowRadius: p.shadowRadius,
    elevation: p.elevation,
  };
}

export interface Accent {
  id: string;
  label: string;
  color: string;
}

export const ACCENTS: Accent[] = [
  { id: 'gold', label: 'Gold', color: '#e0a83e' },
  { id: 'teal', label: 'Teal', color: '#3ec6b8' },
  { id: 'purple', label: 'Purple', color: '#a78bfa' },
  { id: 'red', label: 'Red', color: '#e4574d' },
  { id: 'green', label: 'Green', color: '#7bc47f' },
];

export type IconSize = 'small' | 'medium' | 'large';

export const ICON_SIZES: Record<IconSize, number> = {
  small: 36,
  medium: 52,
  large: 68,
};

export type ThemeMode = 'system' | 'dark' | 'light';
