// Hero picker — searchable list of all 44 heroes with portraits.
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';

import { heroImage } from '@/data/images';
import type { Hero } from '@/data';
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
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return heroes;
    return heroes.filter(
      (h) => h.name.toLowerCase().includes(q) || h.role.toLowerCase().includes(q) || h.cls.toLowerCase().includes(q),
    );
  }, [heroes, query]);

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
          style={[styles.search, { backgroundColor: palette.panel, color: palette.ink, borderColor: palette.line }]}
        />
        <FlatList
          data={filtered}
          keyExtractor={(h) => h.name}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = item.name === selected;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.name);
                  onClose();
                }}
                style={[styles.row, { borderBottomColor: palette.line, backgroundColor: isSelected ? palette.panel2 : 'transparent' }]}>
                <Image source={heroImage(item.name)} style={{ width: 44, height: 44, borderRadius: 8 }} contentFit="cover" />
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: palette.ink }]}>{item.name}</Text>
                  <Text style={[styles.meta, { color: palette.muted }]}>
                    {item.role} · {item.cls}
                  </Text>
                </View>
                {isSelected ? <Text style={[styles.check, { color: accent.color }]}>✓</Text> : null}
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
          <Text style={[styles.clearText, { color: palette.ink }]}>No hero</Text>
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
    borderRadius: 10,
    borderWidth: 1,
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
  clear: {
    margin: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
