// Saved builds — builds saved on this phone, stored locally.
// Share writes the build as a .json file and opens the native share
// sheet; Import opens a .json file (from a message, email, drive, or
// a computer) and adds it to the list. No accounts, no logins, nothing
// uploaded — the file is just passed along however the user likes.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { ScreenShell } from '@/components/screen-shell';
import { buildToFile, parseBuildFile, useSavedBuilds, type SavedBuild } from '@/state/saved';
import { useSettings } from '@/state/settings';

function fileNameFor(build: SavedBuild): string {
  const slug = build.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `dcb-build-${slug || 'build'}.json`;
}

export default function SavedBuildsScreen() {
  const { builds, removeBuild, requestLoad, addBuild } = useSavedBuilds();
  const { palette, accent } = useSettings();
  const [message, setMessage] = useState('');

  const shareBuild = async (build: SavedBuild) => {
    try {
      const file = new File(Paths.cache, fileNameFor(build));
      await file.write(JSON.stringify(buildToFile(build), null, 2));
      if (!(await Sharing.isAvailableAsync())) {
        setMessage('Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: `Share ${build.name}` });
    } catch {
      setMessage('Could not share that build.');
    }
  };

  const importBuild = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets.length) return;
      const text = await new File(result.assets[0].uri).text();
      const parsed = parseBuildFile(JSON.parse(text) as unknown);
      if (!parsed) {
        setMessage('That file is not a DCB build file.');
        return;
      }
      addBuild(parsed);
      setMessage(`Imported “${parsed.name}” by ${parsed.author}.`);
    } catch {
      setMessage('Could not read that file.');
    }
  };

  return (
    <ScreenShell title="Saved builds">
      <Pressable
        onPress={() => void importBuild()}
        style={[styles.button, { backgroundColor: accent.color }]}
        accessibilityRole="button"
        accessibilityLabel="Import a build file">
        <Text style={[styles.buttonText, { color: palette.bg }]}>Import a build file</Text>
      </Pressable>
      {message ? <Text style={[styles.message, { color: palette.muted }]}>{message}</Text> : null}

      {!builds.length ? (
        <View style={[styles.card, { backgroundColor: palette.panel }]}>
          <Text style={[styles.empty, { color: palette.muted }]}>
            No saved builds yet. Save one from Full build and it shows up here — as a JSON file the desktop app can
            read too.
          </Text>
        </View>
      ) : null}

      {builds.map((b) => (
        <View key={b.id} style={[styles.card, { backgroundColor: palette.panel }]}>
          <Text style={[styles.name, { color: palette.ink }]}>{b.name}</Text>
          <Text style={[styles.meta, { color: palette.muted }]}>by {b.author}</Text>
          <Text style={[styles.meta, { color: palette.muted }]}>
            vs {b.enemyHero ?? '—'}
            {b.youHero ? ` · you on ${b.youHero}` : ''}
          </Text>
          <Text style={[styles.meta, { color: palette.muted }]}>
            {b.enemyItems.length} enemy items · {b.youItems.length} your items ·{' '}
            {new Date(b.savedAt).toLocaleDateString()}
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => requestLoad(b)}
              style={[styles.action, { backgroundColor: accent.color }]}
              accessibilityRole="button"
              accessibilityLabel={`Load ${b.name} into Full build`}>
              <Text style={[styles.actionText, { color: palette.bg }]}>Load</Text>
            </Pressable>
            <Pressable
              onPress={() => void shareBuild(b)}
              style={[styles.action, { backgroundColor: palette.panel2 }]}
              accessibilityRole="button"
              accessibilityLabel={`Share ${b.name}`}>
              <Text style={[styles.actionText, { color: palette.ink }]}>Share</Text>
            </Pressable>
            <Pressable
              onPress={() => removeBuild(b.id)}
              style={[styles.action, { backgroundColor: palette.panel2 }]}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${b.name}`}>
              <Text style={[styles.actionText, { color: palette.ink }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  empty: {
    fontSize: 15,
    lineHeight: 21,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  action: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
