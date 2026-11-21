// Builds — the hub for saving, sharing, and importing builds.
// Everything about a build lives here: the saved list, Download as a .json
// file, Share as an https App Link (plain text, so it goes through phone
// Messages), Import a .json file, and a save box for the current Full
// build draft (name + author). No accounts, no logins, nothing uploaded
// — a build is just passed along however the user likes.
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';

import { cardShadow, Radii } from '@/constants/palette';
import { buildImportLink } from '@/linking/build-link';
import { ScreenShell } from '@/components/screen-shell';
import { heroImage, itemImage } from '@/data/images';
import { buildToFile, parseBuildFile, useSavedBuilds, type SavedBuild } from '@/state/saved';
import { useSettings } from '@/state/settings';

function fileNameFor(build: SavedBuild): string {
  const slug = build.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `dcb-build-${slug || 'build'}.json`;
}

function typeLabel(type: string): string {
  return type === 'Weapon' ? 'Gun' : type === 'Vitality' ? 'Health' : type === 'Spirit' ? 'Spirit' : 'Not sure';
}

export default function BuildsScreen() {
  const { builds, removeBuild, requestLoad, addBuild, currentBuild } = useSavedBuilds();
  const { palette, accent } = useSettings();
  const [message, setMessage] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saveAuthor, setSaveAuthor] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const saveCurrent = () => {
    if (!currentBuild.enemyHero) {
      setSaveMessage('Pick an enemy hero in Full build first.');
      return;
    }
    addBuild({
      name: saveName.trim() || `vs ${currentBuild.enemyHero}`,
      author: saveAuthor,
      enemyHero: currentBuild.enemyHero,
      enemyItems: currentBuild.enemyItems,
      youHero: currentBuild.youHero,
      youItems: currentBuild.youItems,
    });
    setSaveName('');
    setSaveAuthor('');
    setSaveMessage('Saved.');
  };

  // Load the build into Full build AND go there, so the heroes and
  // items show immediately. requestLoad only stages the build in the
  // store — Full build applies it when it gains focus, so without this
  // navigation the user would stay on this tab and see nothing change.
  const loadBuild = (build: SavedBuild) => {
    requestLoad(build);
    router.push('/');
  };

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

  const shareBuildAsLink = async (build: SavedBuild) => {
    try {
      await Share.share({
        message: `DCB build: ${build.name} by ${build.author}\n${buildImportLink(build)}`,
      });
    } catch {
      setMessage('Could not share that link.');
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
    <ScreenShell title="Builds">
      <View style={[styles.saveBox, cardShadow(palette), { backgroundColor: palette.panel }]}>
        <Text style={[styles.saveTitle, { color: palette.ink }]}>Save the current Full build</Text>
        <TextInput
          value={saveName}
          onChangeText={setSaveName}
          placeholder="Name this build (optional)"
          placeholderTextColor={palette.faint}
          style={[styles.saveInput, { color: palette.ink, borderColor: palette.line }]}
        />
        <TextInput
          value={saveAuthor}
          onChangeText={setSaveAuthor}
          placeholder="Your name (author)"
          placeholderTextColor={palette.faint}
          autoCapitalize="words"
          style={[styles.saveInput, { color: palette.ink, borderColor: palette.line }]}
        />
        <Pressable
          onPress={saveCurrent}
          style={[styles.saveButton, { backgroundColor: accent.color }]}
          accessibilityRole="button"
          accessibilityLabel="Save the current Full build">
          <Text style={[styles.saveButtonText, { color: palette.onAccent }]}>Save build</Text>
        </Pressable>
        {saveMessage ? <Text style={[styles.saveMessage, { color: palette.muted }]}>{saveMessage}</Text> : null}
      </View>

      <Pressable
        onPress={() => void importBuild()}
        style={[styles.button, { backgroundColor: accent.color }]}
        accessibilityRole="button"
        accessibilityLabel="Import a build file">
        <Text style={[styles.buttonText, { color: palette.onAccent }]}>Import a build file</Text>
      </Pressable>
      {message ? <Text style={[styles.message, { color: palette.muted }]}>{message}</Text> : null}

      {!builds.length ? (
        <View style={[styles.card, cardShadow(palette), { backgroundColor: palette.panel }]}>
          <Text style={[styles.empty, { color: palette.muted }]}>
            No saved builds yet. Save one from Full build and it shows up here — then share it as a
            file or a link, or import one someone sent you.
          </Text>
        </View>
      ) : null}

      {builds.map((b) => (
        <View key={b.id} style={[styles.card, cardShadow(palette), { backgroundColor: palette.panel }]}>
          <Text style={[styles.name, { color: palette.ink }]}>{b.name}</Text>
          <Text style={[styles.meta, { color: palette.muted }]}>by {b.author}</Text>
          {/* The matchup, as it reads in-game: enemy hero vs the hero
              you played — portraits, not a backwards sentence. */}
          <View style={styles.matchup}>
            <View style={styles.matchupHero}>
              <Image
                source={b.enemyHero ? heroImage(b.enemyHero) : undefined}
                style={styles.heroIcon}
                contentFit="cover"
              />
              <Text style={[styles.matchupName, { color: palette.muted }]} numberOfLines={1}>
                {b.enemyHero ?? '—'}
              </Text>
            </View>
            <Text style={[styles.vs, { color: palette.ink }]}>vs</Text>
            <View style={styles.matchupHero}>
              <Image
                source={b.youHero ? heroImage(b.youHero) : undefined}
                style={styles.heroIcon}
                contentFit="cover"
              />
              <Text style={[styles.matchupName, { color: palette.muted }]} numberOfLines={1}>
                {b.youHero ?? '—'}
              </Text>
            </View>
          </View>
          {b.quickPick ? (
            <Text style={[styles.meta, { color: palette.muted }]}>
              Quick pick · they buy {typeLabel(b.quickPick.enemyType)} · you buy {typeLabel(b.quickPick.youType)}
            </Text>
          ) : (
            <>
              {b.youItems.length ? (
                <View style={styles.itemRow}>
                  <Text style={[styles.itemLabel, { color: palette.muted }]}>You</Text>
                  {b.youItems.map((name, i) => (
                    <Image key={`${name}-${i}`} source={itemImage(name)} style={styles.itemIcon} contentFit="cover" />
                  ))}
                </View>
              ) : null}
              {b.enemyItems.length ? (
                <View style={styles.itemRow}>
                  <Text style={[styles.itemLabel, { color: palette.muted }]}>Them</Text>
                  {b.enemyItems.map((name, i) => (
                    <Image key={`${name}-${i}`} source={itemImage(name)} style={styles.itemIcon} contentFit="cover" />
                  ))}
                </View>
              ) : null}
            </>
          )}
          <Text style={[styles.meta, { color: palette.muted }]}>{new Date(b.savedAt).toLocaleDateString()}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => loadBuild(b)}
              style={[styles.action, { backgroundColor: accent.color }]}
              accessibilityRole="button"
              accessibilityLabel={`Load ${b.name} into Full build`}>
              <Text style={[styles.actionText, { color: palette.onAccent }]}>Load</Text>
            </Pressable>
            <Pressable
              onPress={() => void shareBuild(b)}
              style={[styles.action, { backgroundColor: palette.panel2 }]}
              accessibilityRole="button"
              accessibilityLabel={`Download ${b.name} as a file`}>
              <Text style={[styles.actionText, { color: palette.ink }]}>Download</Text>
            </Pressable>
            <Pressable
              onPress={() => void shareBuildAsLink(b)}
              style={[styles.action, { backgroundColor: palette.panel2 }]}
              accessibilityRole="button"
              accessibilityLabel={`Share ${b.name} as a link`}>
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
  saveBox: {
    borderRadius: Radii.card,
    borderCurve: 'continuous',
    padding: 12,
    gap: 8,
  },
  saveTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  saveInput: {
    borderWidth: 1,
    borderRadius: Radii.tile,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: Radii.tile,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  saveMessage: {
    fontSize: 13,
  },
  button: {
    paddingVertical: 12,
    borderRadius: Radii.tile,
    borderCurve: 'continuous',
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
    borderRadius: Radii.card,
    borderCurve: 'continuous',
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
  matchup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  matchupHero: {
    alignItems: 'center',
    gap: 4,
    maxWidth: 120,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: Radii.tile,
  },
  matchupName: {
    fontSize: 13,
    textAlign: 'center',
  },
  vs: {
    fontSize: 18,
    fontWeight: '800',
  },
  itemRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
  itemIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  action: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.tile,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
