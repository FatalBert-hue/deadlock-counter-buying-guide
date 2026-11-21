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

import { cardShadow, pillShadow, Radii } from '@/constants/palette';
import { AccentButton } from '@/components/accent-button';
import { buildImportLink } from '@/linking/build-link';
import { ScreenShell } from '@/components/screen-shell';
import { TileImage } from '@/components/tile-image';
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
  const { palette } = useSettings();
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
          // Soft pill input: pale fill, fully round, no hard border,
          // soft shadow so it lifts off the card.
          style={[styles.saveInput, pillShadow(palette), { color: palette.ink, backgroundColor: palette.panel2 }]}
        />
        <TextInput
          value={saveAuthor}
          onChangeText={setSaveAuthor}
          placeholder="Your name (author)"
          placeholderTextColor={palette.faint}
          autoCapitalize="words"
          style={[styles.saveInput, pillShadow(palette), { color: palette.ink, backgroundColor: palette.panel2 }]}
        />
        <AccentButton label="Save build" onPress={saveCurrent} accessibilityLabel="Save the current Full build" />
        {saveMessage ? <Text style={[styles.saveMessage, { color: palette.muted }]}>{saveMessage}</Text> : null}
      </View>

      <AccentButton label="Import a build file" onPress={() => void importBuild()} accessibilityLabel="Import a build file" />
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
              <TileImage
                source={b.enemyHero ? heroImage(b.enemyHero) : undefined}
                size={56}
                palette={palette}
                tint={2}
              />
              <Text style={[styles.matchupName, { color: palette.muted }]} numberOfLines={1}>
                {b.enemyHero ?? '—'}
              </Text>
            </View>
            <Text style={[styles.vs, { color: palette.ink }]}>vs</Text>
            <View style={styles.matchupHero}>
              <TileImage
                source={b.youHero ? heroImage(b.youHero) : undefined}
                size={56}
                palette={palette}
                tint={0}
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
            <AccentButton
              label="Load"
              onPress={() => loadBuild(b)}
              accessibilityLabel={`Load ${b.name} into Full build`}
              compact
              style={styles.actionFlex}
            />
            <Pressable
              onPress={() => void shareBuild(b)}
              style={[
                styles.action,
                pillShadow(palette),
                { backgroundColor: palette.chipTints[0].bg },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Download ${b.name} as a file`}>
              <Text style={[styles.actionText, { color: palette.chipTints[0].ink }]}>Download</Text>
            </Pressable>
            <Pressable
              onPress={() => void shareBuildAsLink(b)}
              style={[
                styles.action,
                pillShadow(palette),
                { backgroundColor: palette.chipTints[1].bg },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Share ${b.name} as a link`}>
              <Text style={[styles.actionText, { color: palette.chipTints[1].ink }]}>Share</Text>
            </Pressable>
            <Pressable
              onPress={() => removeBuild(b.id)}
              style={[
                styles.action,
                pillShadow(palette),
                { backgroundColor: palette.chipTints[2].bg },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${b.name}`}>
              <Text style={[styles.actionText, { color: palette.chipTints[2].ink }]}>Delete</Text>
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
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  saveMessage: {
    fontSize: 13,
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
    borderRadius: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionFlex: {
    flex: 1,
  },
  action: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
