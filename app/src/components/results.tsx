// Shared results rendering for all three layouts: threat chips, the pick
// list, and the notes (anti-heal owned, Healbane both sides, stealth gap).
import { StyleSheet, Text, View } from 'react-native';

import { cardShadow, pillShadow, Radii } from '@/constants/palette';
import type { ScoreResult } from '@/engine/score';
import { PickCard } from '@/components/pick-card';
import { useSettings } from '@/state/settings';

export function Results({ result, emptyText }: { result: ScoreResult; emptyText: string }) {
  const { palette } = useSettings();
  if (!result.enemyHero) {
    return (
      <View style={[styles.box, cardShadow(palette), { backgroundColor: palette.panel }]}>
        <Text style={[styles.empty, { color: palette.muted }]}>{emptyText}</Text>
      </View>
    );
  }
  if (!result.picks.length) {
    return (
      <View style={[styles.box, cardShadow(palette), { backgroundColor: palette.panel }]}>
        <Text style={[styles.empty, { color: palette.muted }]}>
          You&apos;ve already marked every strong answer to this matchup as owned.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.list}>
      {result.threatLabels.length ? (
        <View style={styles.chips}>
          {result.threatLabels.map((t, i) => {
            // Chunky coloured pills like the reference's teal / pink /
            // orange chips — saturated tints cycling, bold short labels,
            // big enough to read at a glance.
            const tint = palette.chipTints[i % palette.chipTints.length];
            return (
              <Text key={t} style={[styles.chip, pillShadow(palette), { backgroundColor: tint.bg, color: tint.ink }]}>
                {t}
              </Text>
            );
          })}
        </View>
      ) : null}
      {result.picks.map((p, i) => (
        <PickCard key={p.name} pick={p} rank={i + 1} top={i === 0} />
      ))}
      {result.topOverBudget ? (
        <Text style={[styles.note, { color: palette.muted }]}>
          Top pick is over your stated budget — it&apos;s the save-up target.
        </Text>
      ) : null}
      {result.notes.map((n, i) => (
        <View
          key={i}
          style={[
            styles.noteBox,
            cardShadow(palette),
            { backgroundColor: palette.panel, borderColor: palette.heroSoft, borderWidth: 1 },
          ]}>
          <Text style={[styles.note, { color: palette.muted }]}>{n.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radii.card,
    borderCurve: 'continuous',
    padding: 16,
  },
  empty: {
    fontSize: 15,
    lineHeight: 21,
  },
  list: {
    gap: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  noteBox: {
    borderRadius: Radii.card,
    borderCurve: 'continuous',
    padding: 12,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
  },
});
