// Bundled offline data — the fallback copy of the guide data.
// Versioned so a future remote data.json can be compared against it
// (Phase 2: fetch from GitHub Pages on launch when online, cache it,
// fall back to this copy offline). No network, no accounts, no AI.
import raw from '@/assets/data/data.json';

export interface Hero {
  name: string;
  role: string;
  cls: string;
  tags: string[];
  note: string;
}

export interface Item {
  name: string;
  category: string;
  tier: number;
  cost: number;
  tags: string[];
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
