// Screen header: menu button top-left (opens the side drawer), title,
// settings button. Short and quiet — no long descriptions.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { pillShadow } from '@/constants/palette';
import { useDrawer } from '@/state/drawer';
import { useSettings } from '@/state/settings';

export function ScreenHeader({ title, onOpenSettings }: { title: string; onOpenSettings: () => void }) {
  const { palette, accent } = useSettings();
  const { openDrawer } = useDrawer();
  return (
    <View style={[styles.row, { borderTopColor: accent.color }]}>
      <Pressable
        onPress={openDrawer}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        style={[styles.iconButton, pillShadow(palette), { backgroundColor: accent.color }]}>
        <Text style={[styles.icon, { color: palette.onAccent }]}>☰</Text>
      </Pressable>
      <Text style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
        {title}
      </Text>
      <Pressable
        onPress={onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        style={[
          styles.settingsButton,
          pillShadow(palette),
          { backgroundColor: palette.panel, borderColor: accent.color, borderWidth: 2 },
        ]}>
        <Text style={[styles.settingsText, { color: palette.ink }]}>Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 3,
  },
  iconButton: {
    width: 40,
    height: 40,
    // Circular, like the reference's round icon buttons.
    borderRadius: 999,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    fontWeight: '800',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  settingsButton: {
    height: 40,
    paddingHorizontal: 12,
    // Fully rounded pill, like the reference's chunky pill buttons.
    borderRadius: 999,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
