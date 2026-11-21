// 12-slot build grid — each slot opens the item picker; tapping a filled
// slot changes it, "Empty slot" in the picker clears it.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Radii, pillShadow } from '@/constants/palette';
import { itemImage } from '@/data/images';
import { MAX_SLOTS } from '@/engine/score';
import { useSettings } from '@/state/settings';

interface SlotGridProps {
  slots: (string | null)[];
  onPickSlot: (index: number) => void;
}

export function SlotGrid({ slots, onPickSlot }: SlotGridProps) {
  const { palette, settings } = useSettings();
  const size = settings.iconSize === 'small' ? 40 : settings.iconSize === 'large' ? 64 : 52;
  return (
    <View style={styles.grid}>
      {Array.from({ length: MAX_SLOTS }, (_, i) => {
        const name = slots[i];
        return (
          <Pressable
            key={i}
            onPress={() => onPickSlot(i)}
            accessibilityRole="button"
            accessibilityLabel={name ? `Slot ${i + 1}: ${name}` : `Slot ${i + 1}: empty`}
            style={[
              styles.slot,
              pillShadow(palette),
              {
                // Every slot is a clearly coloured tile, like the
                // reference's pastel icon tiles: filled slots sit on a
                // cycling pastel tile, empty slots are the tile itself
                // with a bold plus — no more pale, invisible slots.
                backgroundColor: palette.tileTints[i % palette.tileTints.length],
                borderColor: palette.line,
                width: size + 16,
                height: size + 16,
              },
            ]}>
            {name ? (
              <Image source={itemImage(name)} style={{ width: size, height: size, borderRadius: 12 }} contentFit="cover" />
            ) : (
              <Text style={[styles.plus, { color: palette.ink }]}>+</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    borderWidth: 1,
    borderRadius: Radii.tile,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    fontSize: 28,
    fontWeight: '800',
  },
});
