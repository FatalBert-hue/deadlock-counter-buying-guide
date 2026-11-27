// OpenRouter provider — one key for every model.
//
// POST https://openrouter.ai/api/v1/chat/completions, OpenAI chat
// completions shape, Auth: Bearer <key>. OpenRouter is wire
// compatible with OpenAI, so the request/response handling is the
// shared sendChatCompletions helper; only the URL, the context
// label, and the app-attribution headers differ (OpenRouter asks
// apps to identify themselves with HTTP-Referer and a title).
//
// Model chain (same pattern as Gemini): the configured model first,
// then the free Gemma fallback, then the cheapest paid model —
// gemini-2.5-flash-lite at $0.10/$0.40 per 1M tokens, verified live
// 2026-11-27 on openrouter.ai/google/gemini-2.5-flash-lite. A 429
// (free-model daily cap) or 5xx on one model tries the next; a 404
// on a built-in model does too (OpenRouter retires/renames models,
// and a dead built-in should not be a dead end). A 404 on the
// user's own typed custom model fails immediately. Timeouts and
// network failures never fall back. Per-request only — the user's
// saved model setting is never changed. Overall deadline ~90s, so
// "Thinking…" never spins for minutes.
import { ProviderHttpError, type SendChatOptions, type SendChatResult } from '../providers';
import { sendChatCompletions } from './openai';

/** Fallbacks after the user's configured model, in order, skipping
    any duplicate. */
const OPENROUTER_FALLBACK_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemini-2.5-flash-lite',
];

/** The models DCB itself ships for OpenRouter (default + fallbacks
    + the rest of the Settings dropdown). A 404 on one of these means
    OpenRouter retired it, so the chain moves on. A 404 on anything
    else is the user's own typed model, which fails immediately
    instead. */
const BUILTIN_OPENROUTER_MODELS = [
  'google/gemma-4-31b-it:free',
  ...OPENROUTER_FALLBACK_MODELS,
  'deepseek/deepseek-chat',
];

/** Overall deadline for one OpenRouter send across the whole chain. */
export const OPENROUTER_CHAIN_DEADLINE_MS = 90_000;

/** App attribution headers, as OpenRouter's docs recommend. */
const ATTRIBUTION_HEADERS = {
  'HTTP-Referer': 'https://fatalbert-hue.github.io/deadlock-counter-buying-guide/',
  'X-Title': 'DCB',
};

export async function sendOpenRouter(options: SendChatOptions): Promise<SendChatResult> {
  const chain = [options.model, ...OPENROUTER_FALLBACK_MODELS.filter((m) => m !== options.model)];
  const canFallback404 = BUILTIN_OPENROUTER_MODELS.includes(options.model);
  const deadline = Date.now() + OPENROUTER_CHAIN_DEADLINE_MS;
  let lastError: unknown = null;
  for (const model of chain) {
    if (Date.now() >= deadline) break;
    try {
      const text = await sendChatCompletions(
        'https://openrouter.ai/api/v1/chat/completions',
        options.apiKey,
        model,
        options.systemPrompt,
        options.messages,
        'OpenRouter',
        { extraHeaders: ATTRIBUTION_HEADERS, deadline },
      );
      return { text, model };
    } catch (e) {
      if (e instanceof ProviderHttpError && (e.status === 429 || e.status >= 500)) {
        lastError = e;
        continue;
      }
      if (e instanceof ProviderHttpError && e.status === 404 && canFallback404) {
        lastError = e;
        continue;
      }
      throw e;
    }
  }
  if (lastError !== null) {
    throw lastError;
  }
  throw new Error('That took too long — check your connection and try again.');
}
