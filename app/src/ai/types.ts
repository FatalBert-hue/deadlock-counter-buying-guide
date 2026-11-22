// AI chat helper — types shared by the provider layer, the AI state
// provider, the Settings AI section, and the AI Chat screen.
//
// The user brings their own key (BYOK): Gemini, ChatGPT (OpenAI),
// Claude (Anthropic), or any OpenAI-compatible endpoint ("Other").
// The key lives ONLY in expo-secure-store — never in AsyncStorage,
// never in plain text, never in a log or an error message.
export type AIProviderId = 'gemini' | 'openai' | 'anthropic' | 'other';

export interface AIProviderMeta {
  id: AIProviderId;
  label: string;
  /** Hint shown under the key field, e.g. where to get a key. */
  keyHint: string;
  /** Sensible free/cheap default model (verified against the provider's
      current docs; the user can edit it). */
  defaultModel: string;
}

export const AI_PROVIDERS: AIProviderMeta[] = [
  {
    id: 'gemini',
    label: 'Gemini',
    keyHint: 'Free key from Google AI Studio (aistudio.google.com).',
    // Gemma 3 27B, served through the same Gemini API with the same
    // key (verified 2026-11-21 against Google's docs and the Vercel
    // AI SDK / ADK provider docs). Its free tier is far roomier than
    // Flash's — 30 RPM / 15,000 TPM / 14,400 RPD per model from
    // secondary sources, vs Flash's 20 requests/day — though the low
    // 15,000 TPM binds first with DCB's ~1,274-token system prompt.
    defaultModel: 'gemma-3-27b-it',
  },
  {
    id: 'openai',
    label: 'ChatGPT',
    keyHint: 'Key from platform.openai.com.',
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'anthropic',
    label: 'Claude',
    keyHint: 'Key from console.anthropic.com.',
    defaultModel: 'claude-sonnet-4-5',
  },
  {
    id: 'other',
    label: 'Other',
    keyHint: 'Any OpenAI-compatible API — needs a base URL and model below.',
    defaultModel: '',
  },
];

export function providerMeta(id: AIProviderId): AIProviderMeta {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
}

/** Non-secret AI settings (provider, model, base URL). The key is
    stored separately, in SecureStore only. */
export interface AIConfig {
  provider: AIProviderId;
  /** Empty means "use the provider's default model". */
  model: string;
  /** Only used by the "Other" provider. */
  baseUrl: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'gemini',
  model: '',
  baseUrl: '',
};

/** The Gemini default before 2026-11-21. A saved config that still
    holds it is migrated to the new Gemma default on load (see
    migrateLegacyGeminiModel); anything else the user typed is left
    alone. */
export const LEGACY_GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash';

/** One-time migration for the Gemini default change (2026-11-21):
    the old default `gemini-3.8-flash` becomes `gemma-3-27b-it`.
    Only the exact old default is moved — a model the user typed in
    themselves, a blank model (which already resolves to the new
    default), or a config for another provider is untouched. Mutates
    the passed object and returns true when it changed anything. */
export function migrateLegacyGeminiModel(config: Partial<AIConfig>): boolean {
  const provider = config.provider ?? DEFAULT_AI_CONFIG.provider;
  if (provider === 'gemini' && config.model === LEGACY_GEMINI_DEFAULT_MODEL) {
    config.model = 'gemma-3-27b-it';
    return true;
  }
  return false;
}

/** One chat turn. Roles are the OpenAI-style ones; each provider module
    translates them into its own wire format. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/** A message as stored in the on-device chat history (adds an id and
    marks error bubbles, which are local-only and never sent). */
export interface StoredChatMessage extends ChatMessage {
  id: string;
  kind?: 'error';
}
