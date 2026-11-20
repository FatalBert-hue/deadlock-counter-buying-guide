// 12-slot build grid — each slot opens the item picker; tapping a filled
// slot changes it, "Empty slot" in the picker clears it.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

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
            style={[styles.slot, { backgroundColor: palette.panel, borderColor: palette.line, width: size + 16, height: size + 16 }]}>
            {name ? (
              <Image source={itemImage(name)} style={{ width: size, height: size, borderRadius: 8 }} contentFit="cover" />
            ) : (
              <Text style={[styles.plus, { color: palette.faint }]}>+</Text>
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    fontSize: 24,
    fontWeight: '600',
  },
});
