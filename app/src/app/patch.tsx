// Patch tab — the patch the data is current to, where the data came from,
// and a manual data-update check. No long descriptions.
import { StyleSheet, Text, View } from 'react-native';

import { cardShadow, Radii } from '@/constants/palette';
import { AccentButton } from '@/components/accent-button';
import { ScreenShell } from '@/components/screen-shell';
import { useGuideData } from '@/state/data';
import { useSettings } from '@/state/settings';

export default function PatchScreen() {
  const { data, source, checking, lastCheckAt, refresh } = useGuideData();
  const { palette } = useSettings();

  const sourceLabel =
    source === 'remote'
      ? 'Updated from GitHub Pages'
      : source === 'cached'
        ? 'Cached update on this phone'
        : 'Bundled with the app';

  return (
    <ScreenShell title="Patch">
      <View style={[styles.card, cardShadow(palette), { backgroundColor: palette.panel }]}>
        <Text style={[styles.patch, { color: palette.ink }]}>{data.patch}</Text>
        <Text style={[styles.meta, { color: palette.muted }]}>
          {data.heroes.length} heroes · {data.items.length} items · Data version {data.version}
        </Text>
        <Text style={[styles.meta, { color: palette.muted }]}>Data: {sourceLabel}</Text>
        {lastCheckAt ? (
          <Text style={[styles.meta, { color: palette.muted }]}>
            Last checked {new Date(lastCheckAt).toLocaleString()}
          </Text>
        ) : null}
      </View>

      <AccentButton
        label={checking ? 'Checking…' : 'Check for a data update'}
        onPress={() => void refresh()}
        disabled={checking}
        accessibilityLabel="Check for a data update"
      />

      <View style={[styles.card, cardShadow(palette), { backgroundColor: palette.panel }]}>
        <Text style={[styles.body, { color: palette.muted }]}>
          When a new Deadlock patch lands, the app checks for a newer data file on launch and updates without a
          rebuild. If you&apos;re offline, the copy on your phone keeps working.
        </Text>
        <Text style={[styles.body, { color: palette.muted }]}>
          Picks tagged Pro rule come from the validated pro rule set. Thin picks rest on a single older source —
          verify in game.
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.card,
    borderCurve: 'continuous',
    padding: 16,
    gap: 6,
  },
  patch: {
    fontSize: 20,
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
});
