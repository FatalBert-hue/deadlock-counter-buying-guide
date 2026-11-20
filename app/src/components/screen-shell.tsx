// Shared screen shell: safe area, scroll view, header (menu button top-left
// + Settings), and the one-line intro. No long descriptions anywhere.
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SettingsModal } from '@/components/settings-modal';
import { useSettings } from '@/state/settings';

export function ScreenShell({ title, children }: { title: string; children: ReactNode }) {
  const { palette } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={title} onOpenSettings={() => setSettingsOpen(true)} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.intro, { color: palette.muted }]}>
            Pick the enemy hero and their items, pick yours, and get the counter-buy the pros would buy.
          </Text>
          {children}
          <Text style={[styles.footer, { color: palette.faint }]}>
            Unofficial fan companion — not affiliated with, endorsed by, or sponsored by Valve Corporation.
          </Text>
        </ScrollView>
      </SafeAreaView>
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 96,
  },
  intro: {
    fontSize: 15,
    lineHeight: 21,
  },
  footer: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
});
