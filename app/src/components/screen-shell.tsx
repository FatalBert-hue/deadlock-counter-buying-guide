// Shared screen shell: safe area, scroll view, header (menu button top-left
// + Settings), and the one-line intro. No long descriptions anywhere.
//
// The ScrollView sits inside a KeyboardAvoidingView so the keyboard
// never covers the text input a user is typing in (the build name /
// author boxes on Full build and Builds): when the keyboard opens, the
// view shrinks and the focused input stays visible above it. This
// pairs with android.softwareKeyboardLayoutMode "resize" in app.json,
// which makes Android shrink the window instead of panning it — that
// part is a native setting, so it only takes effect in a fresh build.
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
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
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.intro, { color: palette.muted }]}>
              Pick the enemy hero and their items, pick yours, and get the counter-buy the pros would buy.
            </Text>
            {children}
            <Text style={[styles.footer, { color: palette.faint }]}>
              Unofficial fan companion — not affiliated with, endorsed by, or sponsored by Valve Corporation.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboard: {
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
