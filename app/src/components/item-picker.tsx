// Item picker — searchable shop with category tabs. Items already in the
// build show as "In build" and can't be picked twice.
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';

import { Radii } from '@/constants/palette';
import { itemImage } from '@/data/images';
import type { Item } from '@/data';
import { useFavorites } from '@/state/favorites';
import { useSettings } from '@/state/settings';

type Category = 'All' | 'Weapon' | 'Vitality' | 'Spirit';

const CATEGORIES: Category[] = ['All', 'Weapon', 'Vitality', 'Spirit'];

interface ItemPickerProps {
  visible: boolean;
  items: Item[];
  owned: string[];
  onSelect: (name: string | null) => void;
  onClose: () => void;
}

export function ItemPicker({ visible, items, owned, onSelect, onClose }: ItemPickerProps) {
  const { palette, accent, settings } = useSettings();
  const { isItemFavorite, toggleItem } = useFavorites();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const iconSize = settings.iconSize === 'small' ? 36 : settings.iconSize === 'large' ? 56 : 44;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => (category === 'All' ? true : i.category === category))
      .filter((i) => (!q ? true : i.name.toLowerCase().includes(q)))
      // Favourites pin to the top of their category tab, then tier/cost/name.
      .sort(
        (a, b) =>
          Number(isItemFavorite(b.name)) - Number(isItemFavorite(a.name)) ||
          a.tier - b.tier ||
          a.cost - b.cost ||
          a.name.localeCompare(b.name),
      );
  }, [items, query, category, isItemFavorite]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: palette.bg }]}>
        <View style={[styles.header, { borderBottomColor: palette.line }]}>
          <Text style={[styles.title, { color: palette.ink }]}>Choose an item</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close item picker">
            <Text style={[styles.close, { color: palette.ink }]}>✕</Text>
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search items"
          placeholderTextColor={palette.faint}
          style={[styles.search, { backgroundColor: palette.panel, color: palette.ink, borderColor: palette.line }]}
        />
        <View style={styles.tabs}>
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.tab,
                  { backgroundColor: active ? accent.color : palette.panel, borderColor: palette.line },
                ]}>
                <Text style={[styles.tabText, { color: active ? palette.onAccent : palette.ink }]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.name}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const inBuild = owned.indexOf(item.name) !== -1;
            return (
              <Pressable
                onPress={() => {
                  if (inBuild) return;
                  onSelect(item.name);
                  onClose();
                }}
                style={[styles.row, { borderBottomColor: palette.line, opacity: inBuild ? 0.45 : 1 }]}>
                <Image source={itemImage(item.name)} style={{ width: iconSize, height: iconSize, borderRadius: 12 }} contentFit="cover" />
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: palette.ink }]}>{item.name}</Text>
                  <Text style={[styles.meta, { color: palette.muted }]}>
                    {item.category} · Tier {item.tier}
                    {settings.showSouls ? ` · ${item.cost.toLocaleString('en-US')} souls` : ''}
                  </Text>
                </View>
                {inBuild ? <Text style={[styles.inBuild, { color: palette.muted }]}>In build</Text> : null}
                <Pressable
                  onPress={() => toggleItem(item.name)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={isItemFavorite(item.name) ? `Unfavourite ${item.name}` : `Favourite ${item.name}`}>
                  <Text style={[styles.star, { color: isItemFavorite(item.name) ? accent.color : palette.muted }]}>
                    {isItemFavorite(item.name) ? '★' : '☆'}
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
          style={[styles.clear, { backgroundColor: palette.panel }]}>
          <Text style={[styles.clearText, { color: palette.ink }]}>Empty slot</Text>
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
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radii.tile,
    borderCurve: 'continuous',
    borderWidth: 1,
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  inBuild: {
    fontSize: 13,
    fontWeight: '600',
  },
  star: {
    fontSize: 22,
    padding: 4,
  },
  clear: {
    margin: 12,
    paddingVertical: 12,
    borderRadius: Radii.tile,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
