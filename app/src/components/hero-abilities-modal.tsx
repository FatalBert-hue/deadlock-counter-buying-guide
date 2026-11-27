// Hero abilities — the Deadlock shop card for a hero's kit.
// Long-pressing a hero's portrait anywhere in the app opens it:
// dark shop panel, hero portrait + role, then each of the 4
// abilities with its icon, in-game description, and what each
// tiered upgrade does. Same dark Curiosity Shop look as the item
// detail modal, not the app's pastel theme — it's a peek at the
// shop. The ability list scrolls: 4 abilities with 3 tiers each
// is far taller than one screen.
import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { abilityImage, heroImage } from '@/data/images';
import { useGuideData } from '@/state/data';

const SHOP_PANEL = '#161d27';
const SHOP_LINE = '#2a3542';
const SHOP_INK = '#f2f5f7';
const SHOP_MUTED = '#9aa8b5';
const TIER = '#e8a33d';

export function HeroAbilitiesModal({ heroName, onClose }: { heroName: string | null; onClose: () => void }) {
  const { data } = useGuideData();
  const hero = heroName ? data.heroes.find((h) => h.name === heroName) : undefined;
  const abilities = hero?.abilities ?? [];
  return (
    <Modal visible={hero != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close hero abilities">
        <Pressable
          style={styles.panel}
          // No-op press so taps on the panel itself don't fall through
          // to the backdrop and close the modal.
          onPress={() => {}}>
          {hero ? (
            <>
              <View style={styles.head}>
                <Image source={heroImage(hero.name)} style={styles.portrait} contentFit="cover" />
                <View style={styles.headText}>
                  <Text style={styles.name}>{hero.name}</Text>
                  <Text style={styles.meta}>
                    {hero.role} · {hero.cls}
                  </Text>
                  <Text style={styles.note}>{hero.note}</Text>
                </View>
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                  <Text style={styles.close}>✕</Text>
                </Pressable>
              </View>
              <View style={[styles.divider, { backgroundColor: SHOP_LINE }]} />
              {abilities.length ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {abilities.map((a) => {
                    const local = abilityImage(hero.name, a.name);
                    const source = local ?? (a.iconUrl ? { uri: a.iconUrl } : undefined);
                    return (
                      <View key={a.name} style={styles.ability}>
                        <View style={styles.abilityHead}>
                          {source ? (
                            <Image source={source} style={styles.abilityIcon} contentFit="cover" />
                          ) : (
                            <View style={[styles.abilityIcon, styles.abilityIconFallback]}>
                              <Text style={styles.keyFallback}>{a.key}</Text>
                            </View>
                          )}
                          <Text style={styles.abilityName}>{a.name}</Text>
                          <View style={styles.keyBadge}>
                            <Text style={styles.keyBadgeText}>{a.key}</Text>
                          </View>
                        </View>
                        <Text style={styles.desc}>{a.desc}</Text>
                        {a.tiers.length === 3 ? (
                          a.tiers.map((t, i) => (
                            <Text key={i} style={styles.tier}>
                              <Text style={styles.tierLabel}>T{i + 1} — </Text>
                              {t}
                            </Text>
                          ))
                        ) : (
                          <Text style={styles.tier}>
                            <Text style={styles.tierLabel}>Upgrades — </Text>
                            {a.tiers.join('; ')}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={styles.desc}>
                  Abilities for this hero are still being gathered — check back after the next update.
                </Text>
              )}
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: SHOP_PANEL,
    borderWidth: 2,
    borderColor: SHOP_LINE,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
  },
  head: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  portrait: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SHOP_LINE,
  },
  headText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: SHOP_INK,
  },
  meta: {
    fontSize: 14,
    fontWeight: '700',
    color: SHOP_MUTED,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    color: SHOP_MUTED,
    marginTop: 2,
  },
  close: {
    fontSize: 18,
    fontWeight: '700',
    color: SHOP_MUTED,
    padding: 4,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  ability: {
    marginBottom: 16,
  },
  abilityHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  abilityIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: SHOP_LINE,
  },
  abilityIconFallback: {
    backgroundColor: SHOP_LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyFallback: {
    fontSize: 18,
    fontWeight: '800',
    color: SHOP_INK,
  },
  abilityName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: SHOP_INK,
  },
  keyBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderCurve: 'continuous',
    backgroundColor: SHOP_LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: SHOP_INK,
  },
  desc: {
    fontSize: 15,
    lineHeight: 22,
    color: SHOP_INK,
  },
  tier: {
    fontSize: 14,
    lineHeight: 20,
    color: SHOP_MUTED,
    marginTop: 4,
  },
  tierLabel: {
    fontWeight: '800',
    color: TIER,
  },
});
