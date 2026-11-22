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
    // Gemma 4 31B, served through the same Gemini API with the same
    // key (verified 2026-11-22 against Google's Gemma docs —
    // gemma.ai/deployment/gemini-api — which host exactly two Gemma
    // 4 models: gemma-4-31b-it and gemma-4-26b-a4b-it). Gemma 3 is
    // DEAD on the API: Google's official Gemini models page lists no
    // Gemma at all, and gemma-3-27b-it 404s on Mikel's phone. Free
    // tier for Gemma 4 from secondary sources (Google publishes no
    // free-tier numbers): 30 RPM / 16,000 TPM / 14,400 RPD per model
    // — one older AI Studio snapshot showed 1,500 RPD instead, so
    // treat the daily number as indicative, not promised. The low
    // TPM binds first with DCB's ~1,274-token system prompt.
    defaultModel: 'gemma-4-31b-it',
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
    holds it is migrated to the current Gemma default on load (see
    migrateLegacyGeminiModel); anything else the user typed is left
    alone. */
export const LEGACY_GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash';

/** Gemma 3 models, dead on the API since ~Nov 2026 (Google's models
    page lists no Gemma at all; gemma-3-27b-it 404s). A saved config
    that still holds one is migrated to the current Gemma 4 default
    on load, alongside the old Flash default. */
export const LEGACY_GEMMA3_MODELS = ['gemma-3-27b-it', 'gemma-3-12b-it', 'gemma-3-4b-it'];

/** Current Gemini default, the migration target. */
export const CURRENT_GEMINI_DEFAULT_MODEL = 'gemma-4-31b-it';

/** One-time migration for the Gemini default changes (2026-11-21
    and 2026-11-22): the old default `gemini-3.8-flash` and any dead
    Gemma 3 model (`gemma-3-27b-it` / `-12b-it` / `-4b-it`) become
    `gemma-4-31b-it`. Only those exact legacy defaults are moved — a
    model the user typed in themselves, a blank model (which already
    resolves to the new default), or a config for another provider is
    untouched. Mutates the passed object and returns true when it
    changed anything. */
export function migrateLegacyGeminiModel(config: Partial<AIConfig>): boolean {
  const provider = config.provider ?? DEFAULT_AI_CONFIG.provider;
  if (
    provider === 'gemini' &&
    (config.model === LEGACY_GEMINI_DEFAULT_MODEL || LEGACY_GEMMA3_MODELS.includes(config.model ?? ''))
  ) {
    config.model = CURRENT_GEMINI_DEFAULT_MODEL;
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
