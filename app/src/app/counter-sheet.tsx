// Counter sheet — enemy hero only, top 3 counter buys with reasons. The
// one to open mid-match when there's no time to fill in builds.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { cardShadow, Radii } from '@/constants/palette';
import { HeroAbilitiesModal } from '@/components/hero-abilities-modal';
import { HeroPicker } from '@/components/hero-picker';
import { Results } from '@/components/results';
import { ScreenShell } from '@/components/screen-shell';
import { TileImage } from '@/components/tile-image';
import { heroImage } from '@/data/images';
import { scoreCounterSheet } from '@/engine/score';
import { useGuideData } from '@/state/data';
import { useSettings } from '@/state/settings';

export default function CounterSheetScreen() {
  const { data } = useGuideData();
  const { palette } = useSettings();
  const [enemyHero, setEnemyHero] = useState<string | null>(null);
  const [heroPickerOpen, setHeroPickerOpen] = useState(false);
  const [abilitiesHero, setAbilitiesHero] = useState<string | null>(null);

  const result = useMemo(() => scoreCounterSheet(data, enemyHero), [data, enemyHero]);

  return (
    <ScreenShell title="Counter sheet">
      <Pressable
        onPress={() => setHeroPickerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Choose the enemy hero"
        style={[
          styles.heroButton,
          cardShadow(palette),
          // Violet tint with a violet edge, like the enemy side of Full
          // build — the enemy hero reads at a glance.
          { backgroundColor: palette.heroSoft, borderColor: palette.hero, borderWidth: 2 },
        ]}>
        {enemyHero ? (
          <>
            <TileImage
              source={heroImage(enemyHero)}
              size={52}
              palette={palette}
              bg="#ffffff"
              onPress={() => setHeroPickerOpen(true)}
              onLongPress={() => setAbilitiesHero(enemyHero)}
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
        onLongPressHero={setAbilitiesHero}
      />
      <HeroAbilitiesModal heroName={abilitiesHero} onClose={() => setAbilitiesHero(null)} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroButton: {
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
    fontWeight: '800',
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
