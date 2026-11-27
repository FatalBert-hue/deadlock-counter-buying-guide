// Bundled offline data — the fallback copy of the guide data.
// Versioned so a future remote data.json can be compared against it
// (Phase 2: fetch from GitHub Pages on launch when online, cache it,
// fall back to this copy offline). No network, no accounts, no AI.
import raw from '@/assets/data/data.json';

export interface Ability {
  name: string;
  /** Ability key "1"–"4" (4 is usually the ultimate). */
  key: string;
  /** In-game description of what the ability does. */
  desc: string;
  /** Tiered upgrade lines, T1–T3 in order (fewer if the wiki lists fewer). */
  tiers: string[];
  /** Direct wiki URL of the ability icon (fallback when no local file). */
  iconUrl: string;
}

export interface Hero {
  name: string;
  role: string;
  cls: string;
  tags: string[];
  note: string;
  /** The hero's 4 abilities, in key order. */
  abilities?: Ability[];
}

export interface Item {
  name: string;
  category: string;
  tier: number;
  cost: number;
  tags: string[];
  /** In-game description of what the item does (shop text). */
  desc?: string;
}

export interface CounterInfo {
  cat: string;
  tier: number;
  cost: number;
  deliver: string;
  desc: string;
}

export interface GuideData {
  version: number;
  patch: string;
  patchPosted: string;
  source: string;
  heroes: Hero[];
  items: Item[];
  counters: Record<string, CounterInfo>;
  upgrades: Record<string, string[]>;
  signature: Record<string, [string, number, string][]>;
  family: Record<string, string>;
  proKit: Record<string, [string, number, string][]>;
}

export const guideData = raw as unknown as GuideData;

export const DATA_VERSION = guideData.version;
export const DATA_PATCH = guideData.patch;
export const HERO_COUNT = guideData.heroes.length;
export const ITEM_COUNT = guideData.items.length;
