// Saved builds — builds saved on this phone, stored locally in
// AsyncStorage. No accounts, no logins, nothing uploaded.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DATA_PATCH } from '@/data';

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
