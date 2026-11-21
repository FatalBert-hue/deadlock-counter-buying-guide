// Builds store — builds saved on this phone, stored locally in
// AsyncStorage. No accounts, no logins, nothing uploaded.
//
// Shared build file format (formatVersion 1) — a plain .json file the
// user sends however they like (message, email, drive, USB). The same
// file is readable by the phone app and by the future desktop app, in
// either direction, and older files still import fine:
//   { "format": "counter-buy-build", "formatVersion": 1, "app": "DCB",
//     "dataPatch": "Minor Update 11-04-2026", "name": "...",
//     "author": "Mikel", "savedAt": "<ISO date>",
//     "enemyHero": "Mina", "enemyItems": [...],
//     "youHero": "Abrams", "youItems": [...] }
// "author" is OPTIONAL on import: files written before it existed (or
// by an older app version) import with author "Unknown" instead of
// failing. Unknown hero/item names in an imported file are dropped,
// never a crash.
//
// Builds saved from Quick pick also carry an OPTIONAL "quickPick"
// record of the two item-type choices (they have no item-by-item
// lists): { "enemyType": "Weapon" | "Vitality" | "Spirit" | "",
// "youType": "..." }. It is ignored by anything that does not use it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DATA_PATCH, guideData } from '@/data';

export interface SavedBuild {
  id: string;
  name: string;
  author: string;
  savedAt: string;
  enemyHero: string | null;
  enemyItems: string[];
  youHero: string | null;
  youItems: string[];
  dataPatch: string;
  /** Quick pick only: the two item-type choices (no item lists). */
  quickPick?: { enemyType: string; youType: string };
}

/** The Full build screen's current draft, published here so the Builds
 *  tab can save it too (name + author inputs there). */
export interface CurrentBuild {
  enemyHero: string | null;
  enemyItems: string[];
  youHero: string | null;
  youItems: string[];
}

const EMPTY_CURRENT_BUILD: CurrentBuild = { enemyHero: null, enemyItems: [], youHero: null, youItems: [] };

const STORAGE_KEY = 'counter-buy:saved-builds:v1';
export const UNKNOWN_AUTHOR = 'Unknown';

/** Serialise a build to the shared file format. Always includes author. */
export function buildToFile(build: SavedBuild): Record<string, unknown> {
  return {
    format: 'counter-buy-build',
    formatVersion: 1,
    app: 'DCB',
    dataPatch: build.dataPatch,
    name: build.name,
    author: build.author,
    savedAt: build.savedAt,
    enemyHero: build.enemyHero,
    enemyItems: build.enemyItems,
    youHero: build.youHero,
    youItems: build.youItems,
    ...(build.quickPick ? { quickPick: build.quickPick } : {}),
  };
}

/** Parse a shared build file. Returns null when the file is not a
 *  Counter Buy build; author is optional (older files fall back to
 *  "Unknown"), unknown hero/item names are dropped, not fatal. */
export function parseBuildFile(value: unknown): SavedBuild | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.format !== 'counter-buy-build' || v.formatVersion !== 1) return null;
  const heroNames = new Set(guideData.heroes.map((h) => h.name));
  const itemNames = new Set(guideData.items.map((i) => i.name));
  const cleanItems = (list: unknown): string[] =>
    Array.isArray(list) ? list.filter((n): n is string => typeof n === 'string' && itemNames.has(n)) : [];
  const enemyHero = typeof v.enemyHero === 'string' && heroNames.has(v.enemyHero) ? v.enemyHero : null;
  const youHero = typeof v.youHero === 'string' && heroNames.has(v.youHero) ? v.youHero : null;
  const author = typeof v.author === 'string' && v.author.trim() ? v.author.trim() : UNKNOWN_AUTHOR;
  const qp = v.quickPick && typeof v.quickPick === 'object' ? (v.quickPick as Record<string, unknown>) : null;
  const quickPick =
    qp && typeof qp.enemyType === 'string' && typeof qp.youType === 'string'
      ? { enemyType: qp.enemyType, youType: qp.youType }
      : undefined;
  return {
    id: `imported-${Date.now()}`,
    name: typeof v.name === 'string' && v.name.trim() ? v.name.trim() : 'Imported build',
    author,
    savedAt: typeof v.savedAt === 'string' ? v.savedAt : new Date().toISOString(),
    enemyHero,
    enemyItems: cleanItems(v.enemyItems),
    youHero,
    youItems: cleanItems(v.youItems),
    dataPatch: typeof v.dataPatch === 'string' ? v.dataPatch : DATA_PATCH,
    ...(quickPick ? { quickPick } : {}),
  };
}

interface SavedBuildsContextValue {
  builds: SavedBuild[];
  addBuild: (build: Omit<SavedBuild, 'id' | 'savedAt' | 'dataPatch'>) => SavedBuild;
  removeBuild: (id: string) => void;
  /** The build the Full build screen should load next (consumed on focus). */
  loadRequest: { build: SavedBuild; nonce: number } | null;
  requestLoad: (build: SavedBuild) => void;
  consumeLoadRequest: () => void;
  /** The Full build screen's current draft, for saving from the Builds tab. */
  currentBuild: CurrentBuild;
  setCurrentBuild: (build: CurrentBuild) => void;
}

const SavedBuildsContext = createContext<SavedBuildsContextValue>({
  builds: [],
  addBuild: () => {
    throw new Error('SavedBuildsProvider missing');
  },
  removeBuild: () => {},
  loadRequest: null,
  requestLoad: () => {},
  consumeLoadRequest: () => {},
  currentBuild: EMPTY_CURRENT_BUILD,
  setCurrentBuild: () => {},
});

export function SavedBuildsProvider({ children }: { children: ReactNode }) {
  const [builds, setBuilds] = useState<SavedBuild[]>([]);
  const [loadRequest, setLoadRequest] = useState<{ build: SavedBuild; nonce: number } | null>(null);
  const [currentBuild, setCurrentBuildState] = useState<CurrentBuild>(EMPTY_CURRENT_BUILD);

  const setCurrentBuild = useCallback((build: CurrentBuild) => {
    setCurrentBuildState((prev) =>
      prev.enemyHero === build.enemyHero &&
      prev.youHero === build.youHero &&
      prev.enemyItems.length === build.enemyItems.length &&
      prev.enemyItems.every((n, i) => n === build.enemyItems[i]) &&
      prev.youItems.length === build.youItems.length &&
      prev.youItems.every((n, i) => n === build.youItems[i])
        ? prev
        : build,
    );
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          // Backwards compatible: builds saved before "author" existed
          // get author "Unknown" instead of breaking.
          setBuilds(
            parsed
              .filter((b) => b && typeof b === 'object')
              .map((b) => {
                const build = b as Partial<SavedBuild>;
                return {
                  ...build,
                  author:
                    typeof build.author === 'string' && build.author.trim()
                      ? build.author.trim()
                      : UNKNOWN_AUTHOR,
                } as SavedBuild;
              }),
          );
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: SavedBuild[]) => {
    setBuilds(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addBuild = useCallback(
    (build: Omit<SavedBuild, 'id' | 'savedAt' | 'dataPatch'>) => {
      // Author starts blank every time — no default, nothing remembered.
      // A build saved with no author shows as "Unknown".
      const author = build.author.trim() || UNKNOWN_AUTHOR;
      const full: SavedBuild = {
        ...build,
        author,
        id: `build-${Date.now()}`,
        savedAt: new Date().toISOString(),
        dataPatch: DATA_PATCH,
      };
      persist([full, ...builds]);
      return full;
    },
    [builds, persist],
  );

  const removeBuild = useCallback(
    (id: string) => {
      persist(builds.filter((b) => b.id !== id));
    },
    [builds, persist],
  );

  const requestLoad = useCallback((build: SavedBuild) => {
    setLoadRequest({ build, nonce: Date.now() });
  }, []);

  const consumeLoadRequest = useCallback(() => setLoadRequest(null), []);

  const value = useMemo(
    () => ({ builds, addBuild, removeBuild, loadRequest, requestLoad, consumeLoadRequest, currentBuild, setCurrentBuild }),
    [builds, addBuild, removeBuild, loadRequest, requestLoad, consumeLoadRequest, currentBuild, setCurrentBuild],
  );
  return <SavedBuildsContext.Provider value={value}>{children}</SavedBuildsContext.Provider>;
}

export function useSavedBuilds(): SavedBuildsContextValue {
  return useContext(SavedBuildsContext);
}
