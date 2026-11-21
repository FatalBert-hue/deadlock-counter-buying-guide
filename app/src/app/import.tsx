// /import — the landing screen for dcb://import?data=... links.
// Expo Router routes the link here; this screen decodes the payload,
// validates it through the same parseBuildFile() as file imports
// (unknown hero/item names dropped, never a crash), saves it, and shows
// the author so the receiver knows who made the build.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { base64UrlDecode } from '@/linking/build-link';
import { ScreenShell } from '@/components/screen-shell';
import { parseBuildFile, useSavedBuilds, type SavedBuild } from '@/state/saved';
import { useSettings } from '@/state/settings';

type Status = 'done' | 'failed';

type ImportResult =
  | { status: 'done'; build: SavedBuild }
  | { status: 'failed' };

export default function ImportScreen() {
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

  const status: Status = result.status === 'done' ? 'done' : 'failed';
  const label = result.status === 'done' ? `Imported “${result.build.name}” by ${result.build.author}.` : '';

  return (
    <ScreenShell title="Import build">
      {status === 'done' ? (
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
