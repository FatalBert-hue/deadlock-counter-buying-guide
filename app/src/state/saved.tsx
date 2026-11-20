// Saved builds — the shared JSON file both the mobile app and the desktop
// app can read. Stored locally in AsyncStorage; export writes a .json file
// and opens the system share sheet, import reads a .json file the user
// picks. No accounts, no logins, nothing uploaded.
//
// File format (formatVersion 1):
//   { "format": "counter-buy-build", "formatVersion": 1, "app": "Counter Buy",
//     "dataPatch": "Minor Update 11-04-2026", "name": "...",
//     "savedAt": "<ISO date>", "enemyHero": "Mina", "enemyItems": [...],
//     "youHero": "Abrams", "youItems": [...] }
// Unknown hero/item names in an imported file are dropped, never crash.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DATA_PATCH, guideData } from '@/data';

export interface SavedBuild {
  id: string;
  name: string;
  savedAt: string;
  enemyHero: string | null;
  enemyItems: string[];
  youHero: string | null;
  youItems: string[];
  dataPatch: string;
}

const STORAGE_KEY = 'counter-buy:saved-builds:v1';

export function buildToFile(build: SavedBuild): Record<string, unknown> {
  return {
    format: 'counter-buy-build',
    formatVersion: 1,
    app: 'Counter Buy',
    dataPatch: build.dataPatch,
    name: build.name,
    savedAt: build.savedAt,
    enemyHero: build.enemyHero,
    enemyItems: build.enemyItems,
    youHero: build.youHero,
    youItems: build.youItems,
  };
}

/** Parse an imported build file. Returns null when the file is not a
 *  Counter Buy build; unknown hero/item names are dropped, not fatal. */
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
  return {
    id: `imported-${Date.now()}`,
    name: typeof v.name === 'string' && v.name.trim() ? v.name.trim() : 'Imported build',
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
});

export function SavedBuildsProvider({ children }: { children: ReactNode }) {
  const [builds, setBuilds] = useState<SavedBuild[]>([]);
  const [loadRequest, setLoadRequest] = useState<{ build: SavedBuild; nonce: number } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) setBuilds(parsed.filter((b) => b && typeof b === 'object'));
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: SavedBuild[]) => {
    setBuilds(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addBuild = useCallback(
    (build: Omit<SavedBuild, 'id' | 'savedAt' | 'dataPatch'>) => {
      const full: SavedBuild = {
        ...build,
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
    () => ({ builds, addBuild, removeBuild, loadRequest, requestLoad, consumeLoadRequest }),
    [builds, addBuild, removeBuild, loadRequest, requestLoad, consumeLoadRequest],
  );
  return <SavedBuildsContext.Provider value={value}>{children}</SavedBuildsContext.Provider>;
}

export function useSavedBuilds(): SavedBuildsContextValue {
  return useContext(SavedBuildsContext);
}
