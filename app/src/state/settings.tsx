// Settings — dark/light theme, border accent colour, item icon size,
// show/hide souls budget. Persisted locally in AsyncStorage; no accounts,
// no uploads. The accent is for the UI border only: dark stays dark and
// light stays light underneath it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { ACCENTS, darkPalette, lightPalette, type Accent, type IconSize, type Palette, type ThemeMode } from '@/constants/palette';

export interface Settings {
  themeMode: ThemeMode;
  accentId: string;
  iconSize: IconSize;
  showSouls: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  themeMode: 'system',
  accentId: 'gold',
  iconSize: 'medium',
  showSouls: true,
};

const STORAGE_KEY = 'counter-buy:settings:v1';

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  /** 'dark' | 'light' after resolving 'system' against the device. */
  scheme: 'dark' | 'light';
  palette: Palette;
  accent: Accent;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
  scheme: 'dark',
  palette: darkPalette,
  accent: ACCENTS[0],
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const systemScheme = useSystemColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings((prev) => ({ ...prev, ...parsed }));
      })
      .catch(() => {});
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const scheme: 'dark' | 'light' =
    settings.themeMode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : settings.themeMode;
  const palette = scheme === 'dark' ? darkPalette : lightPalette;
  const accent = ACCENTS.find((a) => a.id === settings.accentId) ?? ACCENTS[0];

  const value = useMemo(
    () => ({ settings, update, scheme, palette, accent }),
    [settings, update, scheme, palette, accent],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}

/** Resolved colour scheme for the whole app (theme override aware). */
export function useAppScheme(): 'dark' | 'light' {
  return useSettings().scheme;
}
