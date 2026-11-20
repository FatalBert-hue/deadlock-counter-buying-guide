// Guide data — bundled copy first (works offline), then a versioned check
// against GitHub Pages on launch when online. A newer valid data.json is
// cached in AsyncStorage and used until a newer one arrives. Unknown
// hero/item names in any data set are dropped by the engine, never crash.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DATA_VERSION, guideData, type GuideData } from '@/data';

export const REMOTE_DATA_URL =
  'https://fatalbert-hue.github.io/deadlock-counter-buying-guide/app/assets/data/data.json';

const CACHE_KEY = 'counter-buy:data-cache:v1';

export type DataSource = 'bundled' | 'cached' | 'remote';

interface DataContextValue {
  data: GuideData;
  source: DataSource;
  checking: boolean;
  lastCheckAt: string | null;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue>({
  data: guideData,
  source: 'bundled',
  checking: false,
  lastCheckAt: null,
  refresh: async () => {},
});

export function isValidGuideData(value: unknown): value is GuideData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.version !== 'number' || typeof v.patch !== 'string') return false;
  if (!Array.isArray(v.heroes) || !Array.isArray(v.items)) return false;
  if (typeof v.counters !== 'object' || v.counters === null) return false;
  if (v.heroes.length === 0 || v.items.length === 0) return false;
  return v.heroes.every(
    (h) => h && typeof h === 'object' && typeof (h as Record<string, unknown>).name === 'string' && Array.isArray((h as Record<string, unknown>).tags),
  ) && v.items.every(
    (i) => i && typeof i === 'object' && typeof (i as Record<string, unknown>).name === 'string' && typeof (i as Record<string, unknown>).category === 'string',
  );
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<GuideData>(guideData);
  const [source, setSource] = useState<DataSource>('bundled');
  const [checking, setChecking] = useState(false);
  const [lastCheckAt, setLastCheckAt] = useState<string | null>(null);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      let res: Response;
      try {
        res = await fetch(REMOTE_DATA_URL, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) return;
      const remote = (await res.json()) as unknown;
      if (!isValidGuideData(remote)) return;
      setLastCheckAt(new Date().toISOString());
      if (remote.version > dataRef.current.version) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote));
        setData(remote);
        setSource('remote');
      }
    } catch {
      // Offline or unreachable — the bundled/cached copy stays in use.
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // A cached copy newer than the bundle wins immediately; the remote
    // check then runs in the background.
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const cached = JSON.parse(raw) as unknown;
        if (isValidGuideData(cached) && cached.version > DATA_VERSION) {
          setData(cached);
          setSource('cached');
        }
      })
      .catch(() => {})
      .finally(() => {
        void refresh();
      });
  }, [refresh]);

  const value = useMemo(
    () => ({ data, source, checking, lastCheckAt, refresh }),
    [data, source, checking, lastCheckAt, refresh],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useGuideData(): DataContextValue {
  return useContext(DataContext);
}
