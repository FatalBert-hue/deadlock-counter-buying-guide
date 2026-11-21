// Composes every app-level provider: settings, guide data, saved builds,
// and the side-menu drawer.
import type { ReactNode } from 'react';

import { AIProvider } from '@/state/ai';
import { DataProvider } from '@/state/data';
import { DrawerProvider } from '@/state/drawer';
import { FavoritesProvider } from '@/state/favorites';
import { SavedBuildsProvider } from '@/state/saved';
import { SettingsModalProvider } from '@/state/settings-modal';
import { SettingsProvider } from '@/state/settings';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <AIProvider>
        <DataProvider>
          <SavedBuildsProvider>
            <FavoritesProvider>
              <DrawerProvider>
                <SettingsModalProvider>{children}</SettingsModalProvider>
              </DrawerProvider>
            </FavoritesProvider>
          </SavedBuildsProvider>
        </DataProvider>
      </AIProvider>
    </SettingsProvider>
  );
}
