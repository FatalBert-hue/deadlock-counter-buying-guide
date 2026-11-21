// Hero picker — searchable list of all 44 heroes with portraits.
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { pillShadow, Radii } from '@/constants/palette';
import { TileImage } from '@/components/tile-image';
import { heroImage } from '@/data/images';
import type { Hero } from '@/data';
import { useFavorites } from '@/state/favorites';
import { useSettings } from '@/state/settings';

interface HeroPickerProps {
  visible: boolean;
  heroes: Hero[];
  selected: string | null;
  onSelect: (name: string | null) => void;
  onClose: () => void;
}

export function HeroPicker({ visible, heroes, selected, onSelect, onClose }: HeroPickerProps) {
  const { palette, accent } = useSettings();
  const { isHeroFavorite, toggleHero } = useFavorites();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? heroes
      : heroes.filter(
          (h) => h.name.toLowerCase().includes(q) || h.role.toLowerCase().includes(q) || h.cls.toLowerCase().includes(q),
        );
    // Favourites pin to the top, in their original order.
    return [...list].sort((a, b) => Number(isHeroFavorite(b.name)) - Number(isHeroFavorite(a.name)));
  }, [heroes, query, isHeroFavorite]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: palette.bg }]}>
        <View style={[styles.header, { borderBottomColor: palette.line }]}>
          <Text style={[styles.title, { color: palette.ink }]}>Choose a hero</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close hero picker">
            <Text style={[styles.close, { color: palette.ink }]}>✕</Text>
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search heroes"
          placeholderTextColor={palette.faint}
          // Soft pill search like the reference's search bar: pale fill,
          // fully round, no hard border, soft shadow so it lifts off
          // the background.
          style={[styles.search, pillShadow(palette), { backgroundColor: palette.panel2, color: palette.ink }]}
        />
        <FlatList
          data={filtered}
          keyExtractor={(h) => h.name}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            const isSelected = item.name === selected;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.name);
                  onClose();
                }}
                style={[
                  styles.row,
                  // The selected row is a saturated violet tile, not a
                  // hairline list entry — like the reference's chunky
                  // tiles. Unselected rows keep their divider.
                  {
                    borderBottomColor: palette.line,
                    borderBottomWidth: isSelected ? 0 : 1,
                    backgroundColor: isSelected ? palette.chipTints[1].bg : 'transparent',
                    borderRadius: isSelected ? Radii.tile : 0,
                  },
                ]}>
                <TileImage source={heroImage(item.name)} size={44} palette={palette} tint={index} />
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: palette.ink }]}>{item.name}</Text>
                  <Text style={[styles.meta, { color: palette.muted }]}>
                    {item.role} · {item.cls}
                  </Text>
                </View>
                {isSelected ? <Text style={[styles.check, { color: accent.color }]}>✓</Text> : null}
                <Pressable
                  onPress={() => toggleHero(item.name)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={isHeroFavorite(item.name) ? `Unfavourite ${item.name}` : `Favourite ${item.name}`}>
                  <Text style={[styles.star, { color: isHeroFavorite(item.name) ? accent.color : palette.muted }]}>
                    {isHeroFavorite(item.name) ? '★' : '☆'}
                  </Text>
                </Pressable>
              </Pressable>
            );
          }}
        />
        <Pressable
          onPress={() => {
            onSelect(null);
            onClose();
          }}
          style={[
            styles.clear,
            pillShadow(palette),
            { backgroundColor: palette.chipTints[1].bg },
          ]}>
          <Text style={[styles.clearText, { color: palette.chipTints[1].ink }]}>No hero</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  close: {
    fontSize: 20,
    fontWeight: '700',
    padding: 8,
  },
  search: {
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderCurve: 'continuous',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
  },
  check: {
    fontSize: 18,
    fontWeight: '700',
  },
  star: {
    fontSize: 22,
    padding: 4,
  },
  clear: {
    margin: 12,
    paddingVertical: 12,
    borderRadius: 999,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
