// Shared import screen used by both import routes:
//   /import — the landing screen for dcb://import?data=... links
//   /dcb/build — the landing screen for the https App Link
//   https://fatalbert-hue.github.io/dcb/build?data=...
// Both routes carry the same `data` query param. The payload is decoded
// and validated through the same parseBuildFile() as file imports
// (unknown hero/item names dropped, never a crash), saved, and the author
// is shown so the receiver knows who made the build.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AccentButton } from '@/components/accent-button';
import { parseImportPayload } from '@/linking/build-link';
import { ScreenShell } from '@/components/screen-shell';
import { useSavedBuilds, type SavedBuild } from '@/state/saved';
import { useSettings } from '@/state/settings';

type ImportResult =
  | { status: 'done'; build: SavedBuild }
  | { status: 'failed' };

export default function ImportBuildScreen() {
  const { data } = useLocalSearchParams<{ data?: string }>();
  const { addBuild } = useSavedBuilds();
  const { palette } = useSettings();

  // The link payload is parsed once, during render — it is pure
  // computation, not an effect. The only effect below saves the parsed
  // build into the (external) saved-builds store.
  // parseImportPayload handles BOTH payload shapes — the compact "c1."
  // payload the app now shares, and the old full-JSON payload — so a
  // link tapped in Messages imports instead of showing "not a DCB build".
  const [result] = useState<ImportResult>(() => {
    if (typeof data !== 'string' || !data) return { status: 'failed' };
    const parsed = parseImportPayload(data);
    return parsed ? { status: 'done', build: parsed } : { status: 'failed' };
  });
  const savedRef = useRef(false);

  useEffect(() => {
    if (result.status === 'done' && !savedRef.current) {
      savedRef.current = true;
      addBuild(result.build);
    }
  }, [result, addBuild]);

  const label = result.status === 'done' ? `Imported “${result.build.name}” by ${result.build.author}.` : '';

  return (
    <ScreenShell title="Import build">
      {result.status === 'done' ? (
        <View style={styles.body}>
          <Text style={[styles.text, { color: palette.ink }]}>{label}</Text>
          <AccentButton label="View Builds" onPress={() => router.push('/builds')} accessibilityLabel="View Builds" />
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={[styles.text, { color: palette.ink }]}>That link is not a DCB build.</Text>
          <AccentButton label="Go to Builds" onPress={() => router.push('/builds')} accessibilityLabel="Go to Builds" />
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
});
