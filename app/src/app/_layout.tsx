import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppDrawer } from '@/components/app-drawer';
import { AppProviders } from '@/state';
import { useAppScheme } from '@/state/settings';

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
        <Stack.Screen name="saved" />
      </Stack>
      <AppDrawer />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}
