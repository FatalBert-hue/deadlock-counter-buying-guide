// App palette — soft pastel look mimicking the reference Mikel gave us:
// pale lavender backgrounds, white cards with very large rounded corners,
// violet hero panels, teal + warm orange accents, soft diffuse shadows.
// Dark and light stay dark and light; the accent colour is for the UI
// border (and accent buttons) only, never the main surface.
// Dark theme is the same language translated to dark (Midnight Galaxy:
// deep purple base, lavender accents, silver text), not the light
// theme inverted.
//
// Second styling round (0.1.9): the ELEMENTS themselves now wear the
// reference's treatment — chunkier radii, soft shadows on pills and
// tiles, pastel-tinted chips, pill-shaped inputs, gradient hero panel
// and gradient primary buttons. Positions and sizes are unchanged;
// only radii, shadows, borders, fills, and gradients changed.
import type { ImageStyle, ViewStyle } from 'react-native';

export interface ChipTint {
  bg: string;
  ink: string;
}

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
  /** Pastel tints for threat chips, cycling teal / violet / amber like
      the reference's coloured pills. Ink on each is 4.5:1 or better. */
  chipTints: [ChipTint, ChipTint, ChipTint];
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
  /** Smaller, softer shadow for pills, buttons, and tiles. */
  pillShadowColor: string;
  pillShadowOpacity: number;
  pillShadowRadius: number;
  pillShadowOffsetY: number;
  pillElevation: number;
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
  chipTints: [
    { bg: '#134e4a', ink: '#5eead4' },
    { bg: '#332a5e', ink: '#c4b5fd' },
    { bg: '#451a03', ink: '#fcd34d' },
  ],
  overlay: 'rgba(0,0,0,0.6)',
  hero: '#6d5bd0',
  heroSoft: '#332a5e',
  onAccent: '#171226',
  radiusCard: 28,
  radiusTile: 16,
  shadowColor: '#000000',
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffsetY: 6,
  elevation: 4,
  pillShadowColor: '#000000',
  pillShadowOpacity: 0.3,
  pillShadowRadius: 8,
  pillShadowOffsetY: 3,
  pillElevation: 2,
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
  chipTints: [
    { bg: '#ccfbf1', ink: '#0f766e' },
    { bg: '#ede9fe', ink: '#6d28d9' },
    { bg: '#fef3c7', ink: '#b45309' },
  ],
  overlay: 'rgba(35,32,58,0.45)',
  hero: '#8b7cf6',
  heroSoft: '#ede9fe',
  onAccent: '#23203a',
  radiusCard: 28,
  radiusTile: 16,
  shadowColor: '#5b54a6',
  shadowOpacity: 0.16,
  shadowRadius: 16,
  shadowOffsetY: 6,
  elevation: 3,
  pillShadowColor: '#5b54a6',
  pillShadowOpacity: 0.12,
  pillShadowRadius: 8,
  pillShadowOffsetY: 3,
  pillElevation: 2,
};

/** Corner radii as static tokens, for StyleSheet.create (which can't see
    the live palette). Cards 28 / tiles 16 — the reference's very rounded
    cards and chunky tiles; pills stay 999 (fully round) where they
    already are. */
export const Radii = {
  card: 28,
  tile: 16,
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

/** Smaller, softer shadow for pills, buttons, and icon tiles — the
    reference's soft lift under small elements, not the card shadow.
    Typed as ImageStyle (not ViewStyle) so the same helper can be used
    on expo-image Images: ImageStyle's `overflow` is narrower than
    ViewStyle's, so a ViewStyle-typed shadow is rejected on Images,
    while an ImageStyle-typed shadow is assignable to both. */
export function pillShadow(p: Palette): ImageStyle {
  return {
    shadowColor: p.pillShadowColor,
    shadowOffset: { width: 0, height: p.pillShadowOffsetY },
    shadowOpacity: p.pillShadowOpacity,
    shadowRadius: p.pillShadowRadius,
    elevation: p.pillElevation,
  };
}

/** Lighten a #rrggbb colour toward white by `amount` (0–1). Used to
    build the second stop of the accent gradient on primary buttons, so
    the gradient keeps the user's chosen accent and the dark onAccent
    text stays readable on both stops. */
export function lighten(hex: string, amount: number): string {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const mix = (v: number) => Math.round(v + (255 - v) * amount);
  return `#${((mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).padStart(6, '0')}`;
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
