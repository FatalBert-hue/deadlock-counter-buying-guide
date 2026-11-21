// A counter-buy pick: item image, name, category/tier/souls, what the item
// does, and the reasons it was picked. The top pick shows all its reasons;
// alternates show the first two.
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { cardShadow, Radii } from '@/constants/palette';
import { itemImage } from '@/data/images';
import { deliverLabel, type RankedPick } from '@/engine/score';
import { TileImage } from '@/components/tile-image';
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
  // The top pick is the hero panel: a SATURATED violet gradient like
  // the reference's big violet hero panel, with white text on it.
  // White on both gradient stops is 4.5:1 or better (WCAG AA), so the
  // small text stays readable on the strong fill.
  const ink = top ? palette.heroOnGradient : palette.ink;
  const sub = top ? palette.heroOnGradient : palette.muted;
  const body = (
    <>
      <View style={styles.head}>
        <TileImage source={itemImage(pick.name)} size={size} palette={palette} bg="#ffffff" />
        <View style={styles.headText}>
          <Text style={[styles.name, { color: ink }]}>{pick.name}</Text>
          <Text style={[styles.meta, { color: sub }, top ? styles.metaOnHero : null]}>
            {top ? '★ Buy this next' : `Also strong · #${rank}`} · {pick.info.cat} · Tier {pick.info.tier}
            {settings.showSouls ? ` · ${pick.info.cost.toLocaleString('en-US')} souls` : ''} · {deliverLabel(pick.info.deliver)}
          </Text>
        </View>
      </View>
      <Text style={[styles.desc, { color: ink }]}>{pick.info.desc}</Text>
      {reasons.map((r, i) => (
        <Text key={i} style={[styles.reason, { color: sub }, top ? styles.metaOnHero : null]}>
          • {r}
        </Text>
      ))}
    </>
  );
  if (top) {
    return (
      <LinearGradient
        colors={palette.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, cardShadow(palette), { borderColor: accent.color, borderWidth: 2 }]}>
        {body}
      </LinearGradient>
    );
  }
  return (
    <View
      style={[
        styles.card,
        cardShadow(palette),
        {
          backgroundColor: palette.panel,
          borderColor: palette.heroSoft,
          borderWidth: 1,
        },
      ]}>
      {body}
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
    fontWeight: '800',
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  // Secondary text on the violet hero panel: white at 85% opacity so
  // it reads as clearly secondary without dropping below contrast.
  metaOnHero: {
    opacity: 0.85,
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
