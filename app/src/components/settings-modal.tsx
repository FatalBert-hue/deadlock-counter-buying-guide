// Settings modal: theme (dark/light/system), border accent colour, item
// icon size, show/hide souls budget. The accent is for the UI border only.
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { ACCENTS, ICON_SIZES, type IconSize, type ThemeMode } from '@/constants/palette';
import { useSettings } from '@/state/settings';

const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

const ICON_SIZE_OPTIONS: { id: IconSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

export function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { palette, accent, settings, update } = useSettings();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: palette.bg }]}>
        <View style={[styles.header, { borderBottomColor: palette.line }]}>
          <Text style={[styles.title, { color: palette.ink }]}>Settings</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close settings">
            <Text style={[styles.close, { color: palette.ink }]}>✕</Text>
          </Pressable>
        </View>

        <Text style={[styles.section, { color: palette.ink }]}>Theme</Text>
        <View style={styles.options}>
          {THEME_MODES.map((m) => {
            const active = settings.themeMode === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => update({ themeMode: m.id })}
                style={[styles.option, { backgroundColor: active ? accent.color : palette.panel }]}>
                <Text style={[styles.optionText, { color: active ? palette.onAccent : palette.ink }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.section, { color: palette.ink }]}>Border colour</Text>
        <View style={styles.options}>
          {ACCENTS.map((a) => {
            const active = settings.accentId === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => update({ accentId: a.id })}
                accessibilityRole="button"
                accessibilityLabel={`${a.label} border`}
                style={[
                  styles.swatch,
                  { backgroundColor: a.color, borderColor: active ? palette.ink : 'transparent', borderWidth: active ? 3 : 1 },
                ]}
              />
            );
          })}
        </View>
        <Text style={[styles.hint, { color: palette.muted }]}>Border only — dark stays dark, light stays light.</Text>

        <Text style={[styles.section, { color: palette.ink }]}>Item icon size</Text>
        <View style={styles.options}>
          {ICON_SIZE_OPTIONS.map((o) => {
            const active = settings.iconSize === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => update({ iconSize: o.id })}
                style={[styles.option, { backgroundColor: active ? accent.color : palette.panel }]}>
                <Text style={[styles.optionText, { color: active ? palette.onAccent : palette.ink }]}>
                  {o.label} · {ICON_SIZES[o.id]}px
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: palette.ink }]}>Show souls budget</Text>
          <Switch value={settings.showSouls} onValueChange={(v) => update({ showSouls: v })} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  section: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  options: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  hint: {
    fontSize: 13,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
