import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppDrawer } from '@/components/app-drawer';
import AppTabs from '@/components/app-tabs';
import { AppProviders } from '@/state';
import { useAppScheme } from '@/state/settings';

SplashScreen.preventAutoHideAsync();

function RootTabs() {
  const scheme = useAppScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
      <AppDrawer />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootTabs />
    </AppProviders>
  );
}
