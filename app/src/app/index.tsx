// Full build — pick both heroes and their 12 item slots, get the counter buy.
// State lives here; saved builds load in through the load request on focus.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { cardShadow, pillShadow, Radii } from '@/constants/palette';
import { AccentButton } from '@/components/accent-button';
import { HeroPicker } from '@/components/hero-picker';
import { ItemPicker } from '@/components/item-picker';
import { Results } from '@/components/results';
import { ScreenShell } from '@/components/screen-shell';
import { SlotGrid } from '@/components/slot-grid';
import { TileImage } from '@/components/tile-image';
import { heroImage } from '@/data/images';
import { scoreFull } from '@/engine/score';
import { useGuideData } from '@/state/data';
import { useSavedBuilds } from '@/state/saved';
import { useSettings } from '@/state/settings';

const EMPTY_SLOTS: (string | null)[] = Array.from({ length: 12 }, () => null);
const BUDGETS = [0, 800, 1600, 3200, 6400];

function emptySlots(): (string | null)[] {
  return [...EMPTY_SLOTS];
}

export default function FullBuildScreen() {
  const { data } = useGuideData();
  const { palette, accent, settings } = useSettings();
  const { addBuild, loadRequest, consumeLoadRequest, setCurrentBuild } = useSavedBuilds();
  const [enemyHero, setEnemyHero] = useState<string | null>(null);
  const [youHero, setYouHero] = useState<string | null>(null);
  const [enemySlots, setEnemySlots] = useState<(string | null)[]>(emptySlots());
  const [youSlots, setYouSlots] = useState<(string | null)[]>(emptySlots());
  const [budget, setBudget] = useState(0);
  const [heroPickerFor, setHeroPickerFor] = useState<'enemy' | 'you' | null>(null);
  const [itemPickerFor, setItemPickerFor] = useState<{ side: 'enemy' | 'you'; index: number } | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveAuthor, setSaveAuthor] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (loadRequest) {
        const b = loadRequest.build;
        setEnemyHero(b.enemyHero);
        setYouHero(b.youHero);
        const es = emptySlots();
        b.enemyItems.slice(0, 12).forEach((n, i) => {
          es[i] = n;
        });
        setEnemySlots(es);
        const ys = emptySlots();
        b.youItems.slice(0, 12).forEach((n, i) => {
          ys[i] = n;
        });
        setYouSlots(ys);
        consumeLoadRequest();
      }
    }, [loadRequest, consumeLoadRequest]),
  );

  const enemyItems = useMemo(() => enemySlots.filter((n): n is string => !!n), [enemySlots]);
  const youItems = useMemo(() => youSlots.filter((n): n is string => !!n), [youSlots]);

  // Publish the current draft so the Builds tab can save it too.
  useEffect(() => {
    setCurrentBuild({ enemyHero, enemyItems, youHero, youItems });
  }, [enemyHero, enemyItems, youHero, youItems, setCurrentBuild]);
  const result = useMemo(
    () =>
      scoreFull(data, {
        enemyHero,
        enemyItems,
        youHero,
        youItems,
        budget: budget || undefined,
      }),
    [data, enemyHero, enemyItems, youHero, youItems, budget],
  );

  const setSlot = (side: 'enemy' | 'you', index: number, name: string | null) => {
    const update = (slots: (string | null)[]) => {
      const next = [...slots];
      next[index] = name;
      return next;
    };
    if (side === 'enemy') setEnemySlots(update(enemySlots));
    else setYouSlots(update(youSlots));
  };

  const saveCurrent = () => {
    if (!enemyHero) {
      setSaveMessage('Pick an enemy hero first.');
      return;
    }
    addBuild({
      name: saveName.trim() || `vs ${enemyHero}`,
      author: saveAuthor,
      enemyHero,
      enemyItems,
      youHero,
      youItems,
    });
    setSaveName('');
    setSaveAuthor('');
    setSaveMessage('Saved. Find it in Builds.');
  };

  const heroButton = (side: 'enemy' | 'you', hero: string | null, label: string) => (
    <Pressable
      onPress={() => setHeroPickerFor(side)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.heroButton,
        cardShadow(palette),
        // The two sides read at a glance: the enemy button is a violet
        // tint with a violet edge, yours is a teal tint with a teal
        // edge — like the reference's colour-coded tiles. The portrait
        // sits on a white tile so it pops off the tint.
        {
          backgroundColor: side === 'enemy' ? palette.heroSoft : palette.chipTints[0].bg,
          borderColor: side === 'enemy' ? palette.hero : palette.you,
          borderWidth: 2,
        },
      ]}>
      {hero ? (
        <>
          <TileImage source={heroImage(hero)} size={52} palette={palette} bg="#ffffff" />
          <Text style={[styles.heroName, { color: palette.ink }]}>{hero}</Text>
          <Text style={[styles.heroChange, { color: palette.muted }]}>Change</Text>
        </>
      ) : (
        <Text style={[styles.heroPlaceholder, { color: palette.muted }]}>{label}</Text>
      )}
    </Pressable>
  );

  return (
    <ScreenShell title="Full build">
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={[styles.label, { color: palette.enemy }]}>Enemy</Text>
          {heroButton('enemy', enemyHero, 'Choose the enemy hero')}
        </View>
        <View style={styles.half}>
          <Text style={[styles.label, { color: palette.you }]}>You</Text>
          {heroButton('you', youHero, 'Choose your hero')}
        </View>
      </View>

      <Text style={[styles.label, { color: palette.ink }]}>
        Their build · {enemyItems.length} / 12 slots
        {settings.showSouls && enemyItems.length
          ? ` · ${enemyItems.reduce((sum, n) => sum + (data.items.find((i) => i.name === n)?.cost ?? 0), 0).toLocaleString('en-US')} souls`
          : ''}
      </Text>
      <SlotGrid slots={enemySlots} onPickSlot={(i) => setItemPickerFor({ side: 'enemy', index: i })} />

      <Text style={[styles.label, { color: palette.ink }]}>
        Your build · {youItems.length} / 12 slots
        {settings.showSouls && youItems.length
          ? ` · ${youItems.reduce((sum, n) => sum + (data.items.find((i) => i.name === n)?.cost ?? 0), 0).toLocaleString('en-US')} souls`
          : ''}
      </Text>
      <SlotGrid slots={youSlots} onPickSlot={(i) => setItemPickerFor({ side: 'you', index: i })} />

      {settings.showSouls ? (
        <View>
          <Text style={[styles.label, { color: palette.ink }]}>Souls budget</Text>
          <View style={styles.budgets}>
            {BUDGETS.map((b) => {
              const active = budget === b;
              return (
                <Pressable
                  key={b}
                  onPress={() => setBudget(b)}
                  style={[
                    styles.budget,
                    active ? pillShadow(palette) : null,
                    {
                      backgroundColor: active ? accent.color : palette.panel2,
                      borderColor: palette.line,
                      borderWidth: active ? 0 : 1,
                    },
                  ]}>
                  <Text style={[styles.budgetText, { color: active ? palette.onAccent : palette.ink }]}>
                    {b === 0 ? 'Any' : b.toLocaleString('en-US')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: palette.ink }]}>Your counter buy</Text>
      <Results
        result={result}
        emptyText="Pick an enemy hero above to get a recommendation. Adding their items sharpens it."
      />

      <View style={[styles.saveBox, cardShadow(palette), { backgroundColor: palette.panel }]}>
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
        <AccentButton label="Save build" onPress={saveCurrent} accessibilityLabel="Save this build" />
        {saveMessage ? <Text style={[styles.saveMessage, { color: palette.muted }]}>{saveMessage}</Text> : null}
      </View>

      <HeroPicker
        visible={heroPickerFor !== null}
        heroes={data.heroes}
        selected={heroPickerFor === 'enemy' ? enemyHero : youHero}
        onSelect={(name) => {
          if (heroPickerFor === 'enemy') setEnemyHero(name);
          else if (heroPickerFor === 'you') setYouHero(name);
        }}
        onClose={() => setHeroPickerFor(null)}
      />
      <ItemPicker
        visible={itemPickerFor !== null}
        items={data.items}
        owned={itemPickerFor?.side === 'enemy' ? enemyItems : youItems}
        onSelect={(name) => {
          if (itemPickerFor) setSlot(itemPickerFor.side, itemPickerFor.index, name);
        }}
        onClose={() => setItemPickerFor(null)}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
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
  budgets: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  budget: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  budgetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveBox: {
    borderRadius: Radii.card,
    borderCurve: 'continuous',
    padding: 12,
    gap: 8,
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
});
