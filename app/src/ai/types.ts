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
    defaultModel: 'gemini-3.8-flash',
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
