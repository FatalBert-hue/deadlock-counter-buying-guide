// AI Chat — talk to the AI you connected in Settings (Gemini,
// ChatGPT, Claude, or another OpenAI-compatible service) about
// Deadlock. The AI answers from DCB's own guide data: current patch,
// heroes, items, and the pro counter-buy rules.
//
// History lives only on this phone (AsyncStorage) and is cleared on
// demand. The API key is never shown here and never leaves the phone
// except to the provider you picked.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccentButton } from '@/components/accent-button';
import { ScreenHeader } from '@/components/screen-header';
import { cardShadow, lighten, pillShadow, Radii } from '@/constants/palette';
import { useAI } from '@/state/ai';
import { useSettings } from '@/state/settings';
import { useSettingsModal } from '@/state/settings-modal';
import type { ChatMessage, StoredChatMessage } from '@/ai/types';

const HISTORY_KEY = 'counter-buy:ai-chat:v1';
const MAX_STORED_MESSAGES = 60;

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `m${Date.now().toString(36)}-${idCounter}`;
}

function toChatMessages(stored: StoredChatMessage[]): ChatMessage[] {
  return stored
    .filter((m) => m.kind !== 'error')
    .map((m) => ({ role: m.role, text: m.text }));
}

export default function AIChatScreen() {
  const { palette, accent } = useSettings();
  const { keyConfigured, ready, sendChat } = useAI();
  // Settings opens from the shared root modal (see _layout.tsx) —
  // the "Open Settings" button here and the drawer's Settings item
  // both use this same hook.
  const { openSettings } = useSettingsModal();
  const [messages, setMessages] = useState<StoredChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<StoredChatMessage>>(null);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as StoredChatMessage[];
        if (Array.isArray(parsed)) setMessages(parsed.slice(-MAX_STORED_MESSAGES));
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((next: StoredChatMessage[]) => {
    setMessages(next);
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(-MAX_STORED_MESSAGES))).catch(() => {});
  }, []);

  const scrollToEnd = useCallback(() => {
    // Let the list lay out the new row first.
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const userMsg: StoredChatMessage = { id: nextId(), role: 'user', text };
    const withUser = [...messages, userMsg];
    persist(withUser);
    scrollToEnd();
    setSending(true);
    try {
      const reply = await sendChat(toChatMessages(withUser));
      const assistantMsg: StoredChatMessage = { id: nextId(), role: 'assistant', text: reply.trim() };
      persist([...withUser, assistantMsg]);
    } catch (e) {
      const errorMsg: StoredChatMessage = {
        id: nextId(),
        role: 'assistant',
        kind: 'error',
        text: e instanceof Error ? e.message : 'Something went wrong. Try again.',
      };
      persist([...withUser, errorMsg]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }, [input, sending, messages, persist, scrollToEnd, sendChat]);

  const clearHistory = useCallback(() => {
    persist([]);
    AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
  }, [persist]);

  const configured = ready && keyConfigured;

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="AI Chat" />
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {!configured ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyCard, cardShadow(palette), { backgroundColor: palette.panel }]}>
                <Text style={[styles.emptyTitle, { color: palette.ink }]}>No AI connected yet</Text>
                <Text style={[styles.emptyText, { color: palette.muted }]}>
                  Pick an AI in Settings — Gemini, ChatGPT, Claude, or another service — paste your own API key,
                  and you can chat about Deadlock right here. Your key stays on this phone.
                </Text>
                <AccentButton label="Open Settings" onPress={openSettings} />
              </View>
            </View>
          ) : (
            <>
              {messages.length > 0 ? (
                <View style={styles.clearRow}>
                  <Pressable
                    onPress={clearHistory}
                    accessibilityRole="button"
                    accessibilityLabel="Clear chat history"
                    style={[styles.clearButton, pillShadow(palette), { backgroundColor: palette.panel2 }]}>
                    <Text style={[styles.clearText, { color: palette.muted }]}>Clear chat</Text>
                  </Pressable>
                </View>
              ) : null}
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(m) => m.id}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={[styles.emptyCard, cardShadow(palette), { backgroundColor: palette.panel }]}>
                    <Text style={[styles.emptyTitle, { color: palette.ink }]}>Ask about Deadlock</Text>
                    <Text style={[styles.emptyText, { color: palette.muted }]}>
                      Try “What do I buy against a fed Haze?” or “What should I buy next on Abrams?” — the AI
                      answers from the guide’s heroes, items, and pro counter-buys.
                    </Text>
                  </View>
                }
                renderItem={({ item }) =>
                  item.role === 'user' ? (
                    <View style={styles.userRow}>
                      <LinearGradient
                        colors={[accent.color, lighten(accent.color, 0.35)]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.bubble, styles.userBubble, pillShadow(palette)]}>
                        <Text style={[styles.bubbleText, { color: palette.onAccent }]}>{item.text}</Text>
                      </LinearGradient>
                    </View>
                  ) : (
                    <View style={styles.aiRow}>
                      <View
                        style={[
                          styles.bubble,
                          styles.aiBubble,
                          cardShadow(palette),
                          {
                            backgroundColor: item.kind === 'error' ? palette.panel2 : palette.panel,
                            borderColor: item.kind === 'error' ? palette.enemy : 'transparent',
                            borderWidth: item.kind === 'error' ? 2 : 0,
                          },
                        ]}>
                        <Text style={[styles.bubbleText, { color: item.kind === 'error' ? palette.enemy : palette.ink }]}>
                          {item.text}
                        </Text>
                      </View>
                    </View>
                  )
                }
              />
              {sending ? (
                <View style={styles.aiRow}>
                  <View style={[styles.bubble, styles.aiBubble, { backgroundColor: palette.panel }]}>
                    <Text style={[styles.bubbleText, { color: palette.muted }]}>Thinking…</Text>
                  </View>
                </View>
              ) : null}
              <View style={[styles.inputRow, { backgroundColor: palette.bg }]}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask about Deadlock…"
                  placeholderTextColor={palette.faint}
                  multiline
                  style={[
                    styles.input,
                    pillShadow(palette),
                    { backgroundColor: palette.panel2, color: palette.ink },
                  ]}
                  accessibilityLabel="Message the AI"
                  returnKeyType="send"
                  onSubmitEditing={send}
                />
                <AccentButton label="Send" onPress={send} disabled={sending || !input.trim()} compact />
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  emptyWrap: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: Radii.card,
    borderCurve: 'continuous',
    padding: 20,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 21,
  },
  clearRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  clearButton: {
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  aiRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: Radii.card,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    borderBottomRightRadius: 8,
  },
  aiBubble: {
    borderBottomLeftRadius: 8,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  input: {
    flex: 1,
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 120,
  },
});
