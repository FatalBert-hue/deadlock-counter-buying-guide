// AI state — the user's own AI connection (BYOK).
//
// Non-secret settings (provider, model, base URL) live in AsyncStorage
// like the rest of the app's settings. The API key lives ONLY in
// expo-secure-store (see src/ai/secure-key.ts) — it is never held in
// React state longer than a single call, never written to a log, and
// never included in an error message.
//
// Note on the testing-only version wipe (src/state/version-wipe.ts):
// it calls AsyncStorage.clear(), which wipes the AI config and chat
// history on a version change — but SecureStore is separate, so the
// saved key survives. After a wipe the user just re-picks their
// provider and the key is still there.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { deleteApiKey, hasApiKey, loadApiKey, saveApiKey } from '@/ai/secure-key';
import { sendChatMessage } from '@/ai/providers';
import { buildSystemPrompt, buildTestSystemPrompt } from '@/ai/system-prompt';
import { DEFAULT_AI_CONFIG, migrateLegacyGeminiModel, providerMeta, type AIConfig, type ChatMessage } from '@/ai/types';

const CONFIG_KEY = 'counter-buy:ai-config:v1';

interface AIContextValue {
  config: AIConfig;
  /** True when a key is stored on this phone. */
  keyConfigured: boolean;
  /** Has the stored config/key finished loading? */
  ready: boolean;
  /** The model that answered the most recent successful reply (for
      example a Gemini fallback model). Null until the first reply —
      the chat screen falls back to the configured model. Reset
      whenever the provider or model setting changes. */
  lastUsedModel: string | null;
  saveConfig: (patch: Partial<AIConfig>) => void;
  /** Store a new key (SecureStore only). Empty string removes it. */
  saveKey: (key: string) => Promise<void>;
  disconnect: () => Promise<void>;
  /** Tiny "Reply with just the word OK" round-trip against the given
      config/key. Returns a short human-readable result. */
  testConnection: (config: AIConfig, key: string) => Promise<{ ok: boolean; message: string }>;
  /** Send the conversation so far (user + assistant turns) and get the
      assistant's reply text. Throws a plain-language Error. */
  sendChat: (messages: ChatMessage[]) => Promise<string>;
}

const AIContext = createContext<AIContextValue>({
  config: DEFAULT_AI_CONFIG,
  keyConfigured: false,
  ready: false,
  lastUsedModel: null,
  saveConfig: () => {},
  saveKey: async () => {},
  disconnect: async () => {},
  testConnection: async () => ({ ok: false, message: 'AI is not ready yet.' }),
  sendChat: async () => {
    throw new Error('AI is not connected yet — add your key in Settings.');
  },
});

export function resolveModel(config: AIConfig): string {
  const trimmed = config.model.trim();
  return trimmed || providerMeta(config.provider).defaultModel;
}

export function AIProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [ready, setReady] = useState(false);
  const [lastUsedModel, setLastUsedModel] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      AsyncStorage.getItem(CONFIG_KEY).then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<AIConfig>;
        // One-time migration (2026-11-21): a saved Gemini model of
        // gemini-3.8-flash (the old default) becomes gemma-3-27b-it.
        // Anything the user typed themselves is left alone.
        const migrated = migrateLegacyGeminiModel(parsed);
        if (alive) setConfig((prev) => ({ ...prev, ...parsed }));
        if (migrated) {
          AsyncStorage.setItem(CONFIG_KEY, JSON.stringify({ ...DEFAULT_AI_CONFIG, ...parsed })).catch(() => {});
        }
      }),
      hasApiKey().then((has) => {
        if (alive) setKeyConfigured(has);
      }),
    ])
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const saveConfig = useCallback((patch: Partial<AIConfig>) => {
    // A new provider/model means the last reply's model is stale —
    // the indicator falls back to the configured model until the next reply.
    if (patch.provider !== undefined || patch.model !== undefined) {
      setLastUsedModel(null);
    }
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const saveKey = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      await deleteApiKey();
      setKeyConfigured(false);
      return;
    }
    await saveApiKey(trimmed);
    setKeyConfigured(true);
  }, []);

  const disconnect = useCallback(async () => {
    await deleteApiKey();
    setKeyConfigured(false);
  }, []);

  const testConnection = useCallback(async (testConfig: AIConfig, key: string) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return { ok: false, message: 'Paste your API key first.' };
    if (testConfig.provider === 'other' && !testConfig.baseUrl.trim()) {
      return { ok: false, message: 'Add a base URL first — that is the address of your AI service.' };
    }
    const model = resolveModel(testConfig);
    if (!model) return { ok: false, message: 'Add a model name first.' };
    try {
      const result = await sendChatMessage({
        config: testConfig,
        apiKey: trimmedKey,
        model,
        systemPrompt: buildTestSystemPrompt(),
        messages: [{ role: 'user', text: 'Reply with just the word OK' }],
      });
      setLastUsedModel(result.model);
      // Name the model that actually answered, so a Gemini fallback is visible.
      const via = result.model !== model ? ` via ${result.model}` : '';
      const label = providerMeta(testConfig.provider).label;
      return result.text.trim().toUpperCase().startsWith('OK')
        ? { ok: true, message: `Connected${via} — ${label} answered OK.` }
        : { ok: true, message: `Connected${via} — ${label} answered, but not with OK. It should still work for chat.` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Connection test failed.' };
    }
  }, []);

  const sendChat = useCallback(
    async (messages: ChatMessage[]) => {
      const key = await loadApiKey();
      if (!key) {
        throw new Error('No API key saved — add yours in Settings first.');
      }
      if (config.provider === 'other' && !config.baseUrl.trim()) {
        throw new Error('No base URL saved — add one in Settings first.');
      }
      const model = resolveModel(config);
      if (!model) {
        throw new Error('No model set — add one in Settings first.');
      }
      const result = await sendChatMessage({
        config,
        apiKey: key,
        model,
        systemPrompt: buildSystemPrompt(),
        messages,
      });
      setLastUsedModel(result.model);
      return result.text;
    },
    [config],
  );

  const value = useMemo(
    () => ({ config, keyConfigured, ready, lastUsedModel, saveConfig, saveKey, disconnect, testConnection, sendChat }),
    [config, keyConfigured, ready, lastUsedModel, saveConfig, saveKey, disconnect, testConnection, sendChat],
  );
  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI(): AIContextValue {
  return useContext(AIContext);
}
