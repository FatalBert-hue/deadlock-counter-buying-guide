// Item detail — the Deadlock shop card. Long-pressing an item anywhere
// in the app opens it: dark shop panel, big icon, name, category + tier
// + souls, and the in-game description of what the item does.
// Deliberately dark like the in-game Curiosity Shop, not the app's
// pastel theme — it's a peek at the shop.
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { itemImage } from '@/data/images';
import { deliverLabel } from '@/engine/score';
import { useGuideData } from '@/state/data';

const SHOP_PANEL = '#161d27';
const SHOP_LINE = '#2a3542';
const SHOP_INK = '#f2f5f7';
const SHOP_MUTED = '#9aa8b5';
const SOULS = '#e8a33d';

const CATEGORY_COLOR: Record<string, string> = {
  Weapon: '#e8a33d',
  Vitality: '#7ac74f',
  Spirit: '#9b7ede',
};

export function ItemDetailModal({ itemName, onClose }: { itemName: string | null; onClose: () => void }) {
  const { data } = useGuideData();
  const item = itemName ? data.items.find((i) => i.name === itemName) : undefined;
  const info = itemName ? data.counters[itemName] : undefined;
  const accent = item ? CATEGORY_COLOR[item.category] ?? SOULS : SOULS;
  const desc =
    item?.desc ?? info?.desc ?? 'No description yet — the shop text for this one is still being gathered.';
  return (
    <Modal visible={item != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close item details">
        <Pressable
          style={[styles.panel, { borderColor: accent }]}
          // No-op press so taps on the panel itself don't fall through
          // to the backdrop and close the modal.
          onPress={() => {}}>
          {item ? (
            <>
              <View style={styles.head}>
                <Image
                  source={itemImage(item.name)}
                  style={[styles.icon, { borderColor: accent }]}
                  contentFit="cover"
                />
                <View style={styles.headText}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={[styles.meta, { color: accent }]}>
                    {item.category} · Tier {item.tier} {'●'.repeat(item.tier)}
                    {'○'.repeat(Math.max(0, 4 - item.tier))}
                  </Text>
                  <Text style={[styles.cost, { color: SOULS }]}>
                    {item.cost.toLocaleString('en-US')} souls
                  </Text>
                  {info ? <Text style={styles.deliver}>{deliverLabel(info.deliver)}</Text> : null}
                </View>
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                  <Text style={styles.close}>✕</Text>
                </Pressable>
              </View>
              <View style={[styles.divider, { backgroundColor: SHOP_LINE }]} />
              <Text style={styles.desc}>{desc}</Text>
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
    backgroundColor: SHOP_PANEL,
    borderWidth: 2,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
  },
  head: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 2,
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
  },
  cost: {
    fontSize: 15,
    fontWeight: '700',
  },
  deliver: {
    fontSize: 13,
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
  desc: {
    fontSize: 15,
    lineHeight: 22,
    color: SHOP_INK,
  },
});
