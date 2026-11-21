// Shared Settings modal state. The modal itself is rendered once at
// the root (see src/app/_layout.tsx) so any screen — and the side
// drawer — can open it. Before this the open/closed state lived
// per-screen inside ScreenShell, which meant the drawer (mounted at
// the root, outside every screen) could not open Settings at all.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface SettingsModalContextValue {
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const SettingsModalContext = createContext<SettingsModalContextValue>({
  settingsOpen: false,
  openSettings: () => {},
  closeSettings: () => {},
});

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const value = useMemo(
    () => ({ settingsOpen, openSettings, closeSettings }),
    [settingsOpen, openSettings, closeSettings],
  );
  return <SettingsModalContext.Provider value={value}>{children}</SettingsModalContext.Provider>;
}

export function useSettingsModal(): SettingsModalContextValue {
  return useContext(SettingsModalContext);
}
