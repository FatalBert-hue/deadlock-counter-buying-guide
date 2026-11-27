// AI chat helper — types shared by the provider layer, the AI state
// provider, the Settings AI section, and the AI Chat screen.
//
// The user brings their own key (BYOK). OpenRouter is the default:
// one key for every model, free or paid, with a one-tap sign-in in
// Settings — it replaces the old way of pasting a separate key per
// provider. Gemini, ChatGPT (OpenAI), Claude (Anthropic), and any
// OpenAI-compatible endpoint ("Other") are still available for
// anyone who already has those keys. The key lives ONLY in
// expo-secure-store — never in AsyncStorage, never in plain text,
// never in a log or an error message.
export type AIProviderId = 'openrouter' | 'gemini' | 'openai' | 'anthropic' | 'other';

export interface AIProviderMeta {
  id: AIProviderId;
  label: string;
  /** Hint shown under the key field, e.g. where to get a key. */
  keyHint: string;
  /** Sensible free/cheap default model (verified against the provider's
      current docs; the user can edit it). */
  defaultModel: string;
  /** Models offered in the Settings dropdown, default first. Every
      name was verified against the provider's live docs (see the
      per-provider comments); anything unverifiable was left out,
      and the Custom option covers the rest. Empty for "Other" — its
      models depend on the service the user points it at. */
  models: string[];
}

export const AI_PROVIDERS: AIProviderMeta[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    keyHint: 'One key for every model — free from openrouter.ai, or tap "Sign in with OpenRouter" below.',
    // The default since 2026-11-27: the cheapest models that can
    // still answer game questions well, free first. Both Gemma 4
    // models are free on OpenRouter (verified 2026-11-27 on
    // openrouter.ai/google/gemma-4-31b-it:free and
    // /gemma-4-26b-a4b-it:free — $0, served by Google AI Studio,
    // 262K context, image input, so screenshots work). Free-model
    // limits: 20 requests/min, 50/day, rising to 1,000/day once the
    // account has bought $10 of credits at any point. Paid fallback
    // is Gemini 2.5 Flash-Lite ($0.10/$0.40 per 1M tokens, verified
    // 2026-11-27 on openrouter.ai/google/gemini-2.5-flash-lite),
    // and DeepSeek V3 ($0.26/$1.03 per 1M, verified the same day on
    // openrouter.ai/deepseek/deepseek-chat) is the last dropdown
    // option. The app's fallback chain (providers/openrouter.ts)
    // runs default → 26B free → Flash-Lite, so a free user never
    // pays unless both free models are capped out.
    defaultModel: 'google/gemma-4-31b-it:free',
    models: [
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
      'google/gemini-2.5-flash-lite',
      'deepseek/deepseek-chat',
    ],
  },
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
    // Dropdown list, verified 2026-11-22: Gemma 4 pair from
    // gemma.ai/deployment/gemini-api; the four Flash models from
    // ai.google.dev/gemini-api/docs/models (all badge "Stable").
    // NO Gemma 3 (dead on the API), NO gemini-3-flash-preview
    // (Preview), NO Gemini 4 models (free-tier status unverified).
    models: [
      'gemma-4-31b-it',
      'gemma-4-26b-a4b-it',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
    ],
  },
  {
    id: 'openai',
    label: 'ChatGPT',
    keyHint: 'Key from platform.openai.com.',
    // gpt-4o-mini proved live on Mikel's phone 2026-11-21 (Test
    // returned 429 rate-limit, not 404 — the model exists and the
    // endpoint accepts it). gpt-6-luna / gpt-6.2-sol from
    // platform.openai.com/docs/models, crawled 2026-11-22 — the
    // flagship page lists those exact IDs. Note: that page presents
    // the GPT-6 models via the Responses API / SDKs; DCB calls chat
    // completions, so if one is rejected the user sees a clear
    // error and can pick another model or use Custom.
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-6-luna', 'gpt-6.2-sol'],
  },
  {
    id: 'anthropic',
    label: 'Claude',
    keyHint: 'Key from console.anthropic.com.',
    // All four from docs.claude.com/en/docs/about-claude/models,
    // crawled 2026-11-22: claude-sonnet-5-5 / claude-haiku-5-5 /
    // claude-opus-5-5 are the current latest; claude-sonnet-4-5 is
    // still listed in the "All models" table.
    defaultModel: 'claude-sonnet-4-5',
    models: ['claude-sonnet-4-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5'],
  },
  {
    id: 'other',
    label: 'Other',
    keyHint: 'Any OpenAI-compatible API — needs a base URL and model below.',
    defaultModel: '',
    // No dropdown for "Other": its models depend on the service.
    models: [],
  },
];

export function providerMeta(id: AIProviderId): AIProviderMeta {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
}

/** True when the saved model is a custom one the user typed — non-blank
    and not in the provider's dropdown list. Used by Settings to show
    the Custom value with the text field open instead of a list row. */
export function isCustomModel(provider: AIProviderId, model: string): boolean {
  return model !== '' && !providerMeta(provider).models.includes(model);
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
  provider: 'openrouter',
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
