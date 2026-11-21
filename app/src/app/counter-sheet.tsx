// Counter sheet — enemy hero only, top 3 counter buys with reasons. The
// one to open mid-match when there's no time to fill in builds.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';

import { cardShadow, pillShadow, Radii } from '@/constants/palette';
import { HeroPicker } from '@/components/hero-picker';
import { Results } from '@/components/results';
import { ScreenShell } from '@/components/screen-shell';
import { heroImage } from '@/data/images';
import { scoreCounterSheet } from '@/engine/score';
import { useGuideData } from '@/state/data';
import { useSettings } from '@/state/settings';

export default function CounterSheetScreen() {
  const { data } = useGuideData();
  const { palette } = useSettings();
  const [enemyHero, setEnemyHero] = useState<string | null>(null);
  const [heroPickerOpen, setHeroPickerOpen] = useState(false);

  const result = useMemo(() => scoreCounterSheet(data, enemyHero), [data, enemyHero]);

  return (
    <ScreenShell title="Counter sheet">
      <Pressable
        onPress={() => setHeroPickerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Choose the enemy hero"
        style={[styles.heroButton, cardShadow(palette), { backgroundColor: palette.panel, borderColor: palette.line }]}>
        {enemyHero ? (
          <>
            <Image
              source={heroImage(enemyHero)}
              style={[{ width: 52, height: 52, borderRadius: Radii.tile }, pillShadow(palette)]}
              contentFit="cover"
            />
            <Text style={[styles.heroName, { color: palette.ink }]}>{enemyHero}</Text>
            <Text style={[styles.heroChange, { color: palette.muted }]}>Change</Text>
          </>
        ) : (
          <Text style={[styles.heroPlaceholder, { color: palette.muted }]}>Choose the enemy hero</Text>
        )}
      </Pressable>

      <Text style={[styles.sectionTitle, { color: palette.ink }]}>Top counter buys</Text>
      <Results result={result} emptyText="Pick an enemy hero above for the top 3 counter buys." />

      <HeroPicker
        visible={heroPickerOpen}
        heroes={data.heroes}
        selected={enemyHero}
        onSelect={setEnemyHero}
        onClose={() => setHeroPickerOpen(false)}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroButton: {
    borderWidth: 1,
    borderRadius: Radii.card,
    borderCurve: 'continuous',
    padding: 12,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  heroName: {
    fontSize: 16,
    fontWeight: '700',
  },
  heroChange: {
    fontSize: 12,
  },
  heroPlaceholder: {
    fontSize: 15,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
});
