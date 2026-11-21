// Listens for URLs the OS hands the app from outside — specifically the
// .json files opened with "Open with DCB" (content:// or file:// URIs).
// dcb:// links are NOT handled here: Expo Router routes those to the
// /import screen, and handling them in both places would import the same
// build twice.
//
// Mounted once in the root layout, inside AppProviders so it can save
// imported builds. The cold-start URL is only handled once per app
// session (getInitialURL returns the same URL again if this effect ever
// re-runs when addBuild changes identity).
import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { handleIncomingUrl } from '@/linking/build-link';
import { useSavedBuilds } from '@/state/saved';

let initialUrlHandled = false;

export function DeepLinkHandler() {
  const { addBuild } = useSavedBuilds();

  useEffect(() => {
    const handle = async (url: string) => {
      const outcome = await handleIncomingUrl(url);
      if (outcome.status === 'imported') {
        const saved = addBuild(outcome.build);
        Alert.alert('Build imported', `“${saved.name}” by ${saved.author} was added to Builds.`, [
          { text: 'View Builds', onPress: () => router.push('/builds') },
          { text: 'OK', style: 'cancel' },
        ]);
      } else if (outcome.status === 'invalid') {
        Alert.alert('Could not import', 'That file is not a DCB build file.');
      }
      // 'ignored' (e.g. a dcb:// link the router is handling) — do nothing.
    };

    if (!initialUrlHandled) {
      initialUrlHandled = true;
      Linking.getInitialURL()
        .then((url) => {
          if (url) void handle(url);
        })
        .catch(() => {});
    }
    const subscription = Linking.addEventListener('url', ({ url }) => void handle(url));
    return () => subscription.remove();
  }, [addBuild]);

  return null;
}
