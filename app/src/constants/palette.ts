// App palette — matches the web guide's look. Dark and light stay dark and
// light; the accent colour is for the UI border only, never the main surface.
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
}

export const darkPalette: Palette = {
  bg: '#101318',
  bg2: '#171b22',
  panel: '#1b2029',
  panel2: '#222834',
  line: '#333b4a',
  ink: '#eef1f6',
  muted: '#a7b0bf',
  faint: '#79839a',
  amber: '#e0a83e',
  enemy: '#e4574d',
  you: '#3ec6b8',
  good: '#7bc47f',
  chip: '#262d3a',
  overlay: 'rgba(0,0,0,0.55)',
};

export const lightPalette: Palette = {
  bg: '#f2efe9',
  bg2: '#e9e5dc',
  panel: '#fffdf8',
  panel2: '#f6f2e8',
  line: '#d8d2c2',
  ink: '#1d2129',
  muted: '#5a6270',
  faint: '#8a8fa0',
  amber: '#b97f14',
  enemy: '#c23a30',
  you: '#0f7a6e',
  good: '#2e7d32',
  chip: '#efe9da',
  overlay: 'rgba(0,0,0,0.4)',
};

export interface Accent {
  id: string;
  label: string;
  color: string;
}

export const ACCENTS: Accent[] = [
  { id: 'gold', label: 'Gold', color: '#e0a83e' },
  { id: 'teal', label: 'Teal', color: '#3ec6b8' },
  { id: 'purple', label: 'Purple', color: '#c99ae0' },
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
