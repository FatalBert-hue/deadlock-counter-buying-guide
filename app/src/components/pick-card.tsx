// A counter-buy pick: item image, name, category/tier/souls, what the item
// does, and the reasons it was picked. The top pick shows all its reasons;
// alternates show the first two.
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { cardShadow, Radii } from '@/constants/palette';
import { itemImage } from '@/data/images';
import { deliverLabel, type RankedPick } from '@/engine/score';
import { useSettings } from '@/state/settings';

export function PickCard({
  pick,
  rank,
  top = false,
}: {
  pick: RankedPick;
  rank: number;
  top?: boolean;
}) {
  const { palette, accent, settings } = useSettings();
  const size = settings.iconSize === 'small' ? 48 : settings.iconSize === 'large' ? 72 : 60;
  const reasons = top ? pick.reasons : pick.reasons.slice(0, 2);
  return (
    <View
      style={[
        styles.card,
        cardShadow(palette),
        {
          backgroundColor: top ? palette.heroSoft : palette.panel,
          borderColor: top ? accent.color : palette.line,
          borderWidth: top ? 2 : 1,
        },
      ]}>
      <View style={styles.head}>
        <Image source={itemImage(pick.name)} style={{ width: size, height: size, borderRadius: Radii.tile }} contentFit="cover" />
        <View style={styles.headText}>
          <Text style={[styles.name, { color: palette.ink }]}>{pick.name}</Text>
          <Text style={[styles.meta, { color: palette.muted }]}>
            {top ? '★ Buy this next' : `Also strong · #${rank}`} · {pick.info.cat} · Tier {pick.info.tier}
            {settings.showSouls ? ` · ${pick.info.cost.toLocaleString('en-US')} souls` : ''} · {deliverLabel(pick.info.deliver)}
          </Text>
        </View>
      </View>
      <Text style={[styles.desc, { color: palette.ink }]}>{pick.info.desc}</Text>
      {reasons.map((r, i) => (
        <Text key={i} style={[styles.reason, { color: palette.muted }]}>
          • {r}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.card,
    borderCurve: 'continuous',
    padding: 12,
    gap: 8,
  },
  head: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headText: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  desc: {
    fontSize: 15,
    lineHeight: 21,
  },
  reason: {
    fontSize: 14,
    lineHeight: 20,
  },
});
