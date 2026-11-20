// Composes every app-level provider: settings, guide data, saved builds,
// and the side-menu drawer.
import type { ReactNode } from 'react';

import { DataProvider } from '@/state/data';
import { DrawerProvider } from '@/state/drawer';
import { FavoritesProvider } from '@/state/favorites';
import { SavedBuildsProvider } from '@/state/saved';
import { SettingsProvider } from '@/state/settings';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <DataProvider>
        <SavedBuildsProvider>
          <FavoritesProvider>
            <DrawerProvider>{children}</DrawerProvider>
          </FavoritesProvider>
        </SavedBuildsProvider>
      </DataProvider>
    </SettingsProvider>
  );
}
