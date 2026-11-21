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
import { DEFAULT_AI_CONFIG, providerMeta, type AIConfig, type ChatMessage } from '@/ai/types';

const CONFIG_KEY = 'counter-buy:ai-config:v1';

interface AIContextValue {
  config: AIConfig;
  /** True when a key is stored on this phone. */
  keyConfigured: boolean;
  /** Has the stored config/key finished loading? */
  ready: boolean;
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
  saveConfig: () => {},
  saveKey: async () => {},
  disconnect: async () => {},
  testConnection: async () => ({ ok: false, message: 'AI is not ready yet.' }),
  sendChat: async () => {
    throw new Error('AI is not connected yet — add your key in Settings.');
  },
});

function resolveModel(config: AIConfig): string {
  const trimmed = config.model.trim();
  return trimmed || providerMeta(config.provider).defaultModel;
}

export function AIProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      AsyncStorage.getItem(CONFIG_KEY).then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<AIConfig>;
        if (alive) setConfig((prev) => ({ ...prev, ...parsed }));
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
      const reply = await sendChatMessage({
        config: testConfig,
        apiKey: trimmedKey,
        model,
        systemPrompt: buildTestSystemPrompt(),
        messages: [{ role: 'user', text: 'Reply with just the word OK' }],
      });
      return reply.trim().toUpperCase().startsWith('OK')
        ? { ok: true, message: `Connected — ${providerMeta(testConfig.provider).label} answered OK.` }
        : { ok: true, message: `Connected — ${providerMeta(testConfig.provider).label} answered, but not with OK. It should still work for chat.` };
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
      return sendChatMessage({
        config,
        apiKey: key,
        model,
        systemPrompt: buildSystemPrompt(),
        messages,
      });
    },
    [config],
  );

  const value = useMemo(
    () => ({ config, keyConfigured, ready, saveConfig, saveKey, disconnect, testConnection, sendChat }),
    [config, keyConfigured, ready, saveConfig, saveKey, disconnect, testConnection, sendChat],
  );
  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI(): AIContextValue {
  return useContext(AIContext);
}
