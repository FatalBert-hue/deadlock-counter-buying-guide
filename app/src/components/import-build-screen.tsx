// Shared import screen used by both import routes:
//   /import — the landing screen for dcb://import?data=... links
//   /dcb/build — the landing screen for the https App Link
//   https://fatalbert-hue.github.io/dcb/build?data=...
// Both routes carry the same `data` query param. The payload is decoded
// and validated through the same parseBuildFile() as file imports
// (unknown hero/item names dropped, never a crash), saved, and the author
// is shown so the receiver knows who made the build.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { base64UrlDecode } from '@/linking/build-link';
import { ScreenShell } from '@/components/screen-shell';
import { parseBuildFile, useSavedBuilds, type SavedBuild } from '@/state/saved';
import { useSettings } from '@/state/settings';

type ImportResult =
  | { status: 'done'; build: SavedBuild }
  | { status: 'failed' };

export default function ImportBuildScreen() {
  const { data } = useLocalSearchParams<{ data?: string }>();
  const { addBuild } = useSavedBuilds();
  const { palette, accent } = useSettings();

  // The link payload is parsed once, during render — it is pure
  // computation, not an effect. The only effect below saves the parsed
  // build into the (external) saved-builds store.
  const [result] = useState<ImportResult>(() => {
    try {
      if (typeof data !== 'string' || !data) return { status: 'failed' };
      const parsed = parseBuildFile(JSON.parse(base64UrlDecode(data)) as unknown);
      return parsed ? { status: 'done', build: parsed } : { status: 'failed' };
    } catch {
      return { status: 'failed' };
    }
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
          <Pressable
            onPress={() => router.push('/builds')}
            style={[styles.button, { backgroundColor: accent.color }]}
            accessibilityRole="button"
            accessibilityLabel="View Builds">
            <Text style={[styles.buttonText, { color: palette.bg }]}>View Builds</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={[styles.text, { color: palette.ink }]}>That link is not a DCB build.</Text>
          <Pressable
            onPress={() => router.push('/builds')}
            style={[styles.button, { backgroundColor: accent.color }]}
            accessibilityRole="button"
            accessibilityLabel="Go to Builds">
            <Text style={[styles.buttonText, { color: palette.bg }]}>Go to Builds</Text>
          </Pressable>
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
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
