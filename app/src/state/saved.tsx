// Saved builds — builds saved on this phone, stored locally in
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
}

const STORAGE_KEY = 'counter-buy:saved-builds:v1';
const LAST_AUTHOR_KEY = 'counter-buy:last-author:v1';
export const DEFAULT_AUTHOR = 'Mikel';
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
  /** Author used on the last saved build (persisted); prefilled next time. */
  lastAuthor: string;
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
  lastAuthor: DEFAULT_AUTHOR,
});

export function SavedBuildsProvider({ children }: { children: ReactNode }) {
  const [builds, setBuilds] = useState<SavedBuild[]>([]);
  const [loadRequest, setLoadRequest] = useState<{ build: SavedBuild; nonce: number } | null>(null);
  const [lastAuthor, setLastAuthor] = useState<string>(DEFAULT_AUTHOR);

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
    AsyncStorage.getItem(LAST_AUTHOR_KEY)
      .then((raw) => {
        if (raw && raw.trim()) setLastAuthor(raw.trim());
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: SavedBuild[]) => {
    setBuilds(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addBuild = useCallback(
    (build: Omit<SavedBuild, 'id' | 'savedAt' | 'dataPatch'>) => {
      const author = build.author.trim() || DEFAULT_AUTHOR;
      const full: SavedBuild = {
        ...build,
        author,
        id: `build-${Date.now()}`,
        savedAt: new Date().toISOString(),
        dataPatch: DATA_PATCH,
      };
      persist([full, ...builds]);
      setLastAuthor(author);
      AsyncStorage.setItem(LAST_AUTHOR_KEY, author).catch(() => {});
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
    () => ({ builds, addBuild, removeBuild, loadRequest, requestLoad, consumeLoadRequest, lastAuthor }),
    [builds, addBuild, removeBuild, loadRequest, requestLoad, consumeLoadRequest, lastAuthor],
  );
  return <SavedBuildsContext.Provider value={value}>{children}</SavedBuildsContext.Provider>;
}

export function useSavedBuilds(): SavedBuildsContextValue {
  return useContext(SavedBuildsContext);
}
