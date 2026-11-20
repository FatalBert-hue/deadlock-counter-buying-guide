// Saved builds — builds saved on this phone, stored locally.
// No accounts, no logins, nothing uploaded.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { useSavedBuilds } from '@/state/saved';
import { useSettings } from '@/state/settings';

export default function SavedBuildsScreen() {
  const { builds, removeBuild, requestLoad } = useSavedBuilds();
  const { palette, accent } = useSettings();

  return (
    <ScreenShell title="Saved builds">

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
