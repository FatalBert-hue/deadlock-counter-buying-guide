import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppDrawer } from '@/components/app-drawer';
import { DeepLinkHandler } from '@/components/deep-link-handler';
import { AppProviders } from '@/state';
import { useAppScheme } from '@/state/settings';
import { wipeIfVersionChanged } from '@/state/version-wipe';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const scheme = useAppScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="quick-pick" />
        <Stack.Screen name="counter-sheet" />
        <Stack.Screen name="patch" />
        <Stack.Screen name="builds" />
        <Stack.Screen name="ai-chat" />
        <Stack.Screen name="import" />
        <Stack.Screen name="dcb/build" />
      </Stack>
      <DeepLinkHandler />
      <AppDrawer />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Gate the whole app on the version wipe: providers (saved builds,
  // favourites, settings, cached guide data) only mount after the wipe
  // has run, so no stale data from a previous version can flash on
  // screen first. While waiting, nothing renders and the native splash
  // stays up (preventAutoHideAsync above; the overlay that hides it only
  // mounts inside the providers). The wipe never rejects, so this always
  // resolves and the app always starts.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    wipeIfVersionChanged()
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  if (!ready) return null;
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}
