// A counter-buy pick: item image, name, category/tier/souls, what the item
// does, and the reasons it was picked. The top pick shows all its reasons;
// alternates show the first two.
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { cardShadow, pillShadow, Radii } from '@/constants/palette';
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
  // The top pick is the hero panel: a soft diagonal violet gradient
  // (hero tint -> panel) like the reference's violet hero panel. Ink
  // text stays on it at full contrast — a strong violet fill would
  // have dropped the small text below 4.5:1.
  const body = (
    <>
      <View style={styles.head}>
        <Image
          source={itemImage(pick.name)}
          style={[{ width: size, height: size, borderRadius: Radii.tile }, pillShadow(palette)]}
          contentFit="cover"
        />
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
    </>
  );
  if (top) {
    return (
      <LinearGradient
        colors={[palette.heroSoft, palette.panel]}
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
          borderColor: palette.line,
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
