// Quick pick — enemy hero + the item type they're buying + the type you
// want to buy. No item-by-item input.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardShadow, pillShadow, Radii } from '@/constants/palette';
import { HeroPicker } from '@/components/hero-picker';
import { Results } from '@/components/results';
import { ScreenShell } from '@/components/screen-shell';
import { TileImage } from '@/components/tile-image';
import { heroImage } from '@/data/images';
import { scoreQuick, typeDisplayName } from '@/engine/score';
import { useGuideData } from '@/state/data';
import { useSettings } from '@/state/settings';

type ItemType = '' | 'Weapon' | 'Vitality' | 'Spirit';

const TYPE_OPTIONS: { id: ItemType; label: string }[] = [
  { id: '', label: 'Not sure' },
  { id: 'Weapon', label: 'Gun' },
  { id: 'Vitality', label: 'Health' },
  { id: 'Spirit', label: 'Spirit' },
];

export default function QuickPickScreen() {
  const { data } = useGuideData();
  const { palette, accent } = useSettings();
  const [enemyHero, setEnemyHero] = useState<string | null>(null);
  const [enemyType, setEnemyType] = useState<ItemType>('');
  const [youType, setYouType] = useState<ItemType>('');
  const [heroPickerOpen, setHeroPickerOpen] = useState(false);

  const result = useMemo(
    () => scoreQuick(data, { enemyHero, enemyType, youType }),
    [data, enemyHero, enemyType, youType],
  );

  const typeRow = (label: string, value: ItemType, onChange: (t: ItemType) => void) => (
    <View>
      <Text style={[styles.label, { color: palette.ink }]}>{label}</Text>
      <View style={styles.options}>
        {TYPE_OPTIONS.map((o) => {
          const active = value === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => onChange(o.id)}
              style={[
                styles.option,
                active ? pillShadow(palette) : null,
                {
                  backgroundColor: active ? accent.color : palette.panel2,
                  borderColor: palette.line,
                  borderWidth: active ? 0 : 1,
                },
              ]}>
              <Text style={[styles.optionText, { color: active ? palette.onAccent : palette.ink }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScreenShell title="Quick pick">
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
            <TileImage source={heroImage(enemyHero)} size={52} palette={palette} bg="#ffffff" />
            <Text style={[styles.heroName, { color: palette.ink }]}>{enemyHero}</Text>
            <Text style={[styles.heroChange, { color: palette.muted }]}>Change</Text>
          </>
        ) : (
          <Text style={[styles.heroPlaceholder, { color: palette.muted }]}>Choose the enemy hero</Text>
        )}
      </Pressable>

      {typeRow('What type of items are they buying?', enemyType, setEnemyType)}
      {typeRow('What type do you want to buy?', youType, setYouType)}

      <Text style={[styles.sectionTitle, { color: palette.ink }]}>
        Your quick counter buy{result.narrowed ? ` — best ${typeDisplayName(youType)} answer` : ''}
      </Text>
      <Results
        result={result}
        emptyText="Pick an enemy hero above to get a recommendation — then narrow it with the two item-type choices."
      />
      {youType && result.enemyHero && !result.narrowed && result.picks.length ? (
        <Text style={[styles.note, { color: palette.muted }]}>
          No strong {typeDisplayName(youType)} counter for this matchup — the pick above is the best answer overall.
        </Text>
      ) : null}

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
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  options: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
  },
});
