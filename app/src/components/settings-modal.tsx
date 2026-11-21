// Settings modal: theme (dark/light/system), border accent colour, item
// icon size, show/hide souls budget — plus the AI section: pick a
// provider (Gemini, ChatGPT, Claude, or another OpenAI-compatible
// service), paste your own API key, test the connection.
//
// The key is stored ONLY in expo-secure-store (see src/ai/secure-key.ts)
// — never in AsyncStorage, never in plain text, never logged. The
// provider/model/base URL (no secrets) live in AsyncStorage with the
// rest of the AI config.
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ACCENTS, ICON_SIZES, pillShadow, type IconSize, type ThemeMode } from '@/constants/palette';
import { useAI } from '@/state/ai';
import { useSettings } from '@/state/settings';
import { AccentButton } from '@/components/accent-button';
import { AI_PROVIDERS, providerMeta, type AIProviderId } from '@/ai/types';
import { loadApiKey } from '@/ai/secure-key';

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
  const { config, keyConfigured, saveConfig, saveKey, disconnect, testConnection } = useAI();
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  const meta = providerMeta(config.provider);

  const onPickProvider = (id: AIProviderId) => {
    saveConfig({ provider: id, model: '', baseUrl: id === 'other' ? config.baseUrl : '' });
    setTestStatus(null);
  };

  const onSaveKey = async () => {
    if (!keyInput.trim()) return;
    setSavingKey(true);
    try {
      await saveKey(keyInput);
      setKeyInput('');
      setTestStatus({ ok: true, message: 'Key saved on this phone.' });
    } catch {
      setTestStatus({ ok: false, message: 'Could not save the key — try again.' });
    } finally {
      setSavingKey(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      // Test with the key typed here if there is one, else the saved key.
      const key = keyInput.trim() || (await loadApiKey()) || '';
      const result = await testConnection(config, key);
      setTestStatus(result);
    } catch {
      setTestStatus({ ok: false, message: 'Connection test failed — check your connection and try again.' });
    } finally {
      setTesting(false);
    }
  };

  const onDisconnect = async () => {
    await disconnect();
    setKeyInput('');
    setTestStatus({ ok: true, message: 'Disconnected — key removed from this phone.' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: palette.bg }]}>
        <View style={[styles.header, { borderBottomColor: palette.line }]}>
          <Text style={[styles.title, { color: palette.ink }]}>Settings</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close settings">
            <Text style={[styles.close, { color: palette.ink }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.section, { color: palette.ink }]}>Theme</Text>
          <View style={styles.options}>
            {THEME_MODES.map((m) => {
              const active = settings.themeMode === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => update({ themeMode: m.id })}
                  style={[styles.option, active ? pillShadow(palette) : null, { backgroundColor: active ? accent.color : palette.panel }]}>
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
                    pillShadow(palette),
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
                  style={[styles.option, active ? pillShadow(palette) : null, { backgroundColor: active ? accent.color : palette.panel }]}>
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

          <Text style={[styles.section, { color: palette.ink }]}>AI chat</Text>
          <Text style={[styles.hint, { color: palette.muted }]}>
            Connect your own AI to chat about Deadlock in the app. Your key stays on this phone — questions go
            to the provider you pick, and you pay their usage.
          </Text>
          <View style={styles.options}>
            {AI_PROVIDERS.map((p) => {
              const active = config.provider === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => onPickProvider(p.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.label} AI provider`}
                  style={[styles.option, active ? pillShadow(palette) : null, { backgroundColor: active ? accent.color : palette.panel }]}>
                  <Text style={[styles.optionText, { color: active ? palette.onAccent : palette.ink }]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: palette.muted }]}>{meta.keyHint}</Text>

          <Text style={[styles.fieldLabel, { color: palette.ink }]}>Model</Text>
          <TextInput
            value={config.model}
            onChangeText={(v) => saveConfig({ model: v })}
            placeholder={meta.defaultModel || 'e.g. gpt-4o-mini'}
            placeholderTextColor={palette.faint}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, pillShadow(palette), { backgroundColor: palette.panel2, color: palette.ink }]}
            accessibilityLabel="AI model"
          />
          <Text style={[styles.hint, { color: palette.muted }]}>
            Leave blank to use {meta.defaultModel ? `the default (${meta.defaultModel})` : 'your provider’s default'}.
          </Text>

          {config.provider === 'other' ? (
            <>
              <Text style={[styles.fieldLabel, { color: palette.ink }]}>Base URL</Text>
              <TextInput
                value={config.baseUrl}
                onChangeText={(v) => saveConfig({ baseUrl: v })}
                placeholder="https://your-service.example.com/v1"
                placeholderTextColor={palette.faint}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, pillShadow(palette), { backgroundColor: palette.panel2, color: palette.ink }]}
                accessibilityLabel="AI base URL"
              />
            </>
          ) : null}

          <Text style={[styles.fieldLabel, { color: palette.ink }]}>API key</Text>
          <View style={styles.keyRow}>
            <TextInput
              value={keyInput}
              onChangeText={setKeyInput}
              placeholder={keyConfigured ? 'Key saved — paste a new one to replace it' : 'Paste your API key'}
              placeholderTextColor={palette.faint}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showKey}
              style={[styles.input, styles.keyInput, pillShadow(palette), { backgroundColor: palette.panel2, color: palette.ink }]}
              accessibilityLabel="API key"
            />
            <Pressable
              onPress={() => setShowKey((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showKey ? 'Hide API key' : 'Show API key'}
              style={[styles.showButton, pillShadow(palette), { backgroundColor: palette.panel }]}>
              <Text style={[styles.showText, { color: palette.ink }]}>{showKey ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
          {keyConfigured ? (
            <Text style={[styles.hint, { color: palette.good }]}>✓ A key is saved on this phone.</Text>
          ) : null}

          <View style={styles.aiButtons}>
            <AccentButton label={savingKey ? 'Saving…' : 'Save key'} onPress={onSaveKey} disabled={savingKey || !keyInput.trim()} compact />
            <AccentButton label={testing ? 'Testing…' : 'Test connection'} onPress={onTest} disabled={testing} compact />
          </View>
          {keyConfigured ? (
            <View style={styles.aiButtons}>
              <Pressable
                onPress={onDisconnect}
                accessibilityRole="button"
                accessibilityLabel="Disconnect AI and remove key"
                style={[styles.disconnectButton, pillShadow(palette), { backgroundColor: palette.panel }]}>
                <Text style={[styles.disconnectText, { color: palette.enemy }]}>Disconnect & remove key</Text>
              </Pressable>
            </View>
          ) : null}
          {testStatus ? (
            <Text style={[styles.status, { color: testStatus.ok ? palette.good : palette.enemy }]}>{testStatus.message}</Text>
          ) : null}
        </ScrollView>
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
  scrollContent: {
    paddingBottom: 64,
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
    lineHeight: 18,
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
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  keyRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  keyInput: {
    flex: 1,
  },
  showButton: {
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  showText: {
    fontSize: 14,
    fontWeight: '700',
  },
  aiButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  disconnectButton: {
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  disconnectText: {
    fontSize: 15,
    fontWeight: '700',
  },
  status: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 12,
  },
});
