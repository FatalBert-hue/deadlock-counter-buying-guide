// Gemini provider — Google AI Generative Language API.
// POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
// Auth: x-goog-api-key header. System prompt goes in `systemInstruction`.
// Roles: 'user' / 'model' (assistant turns become 'model').
// Reply text: candidates[0].content.parts[].text
//
// Model fallback (added 2026-11-21): the default model
// `gemini-3.8-flash` is the one everyone hammers, so it 503s under
// load ("model is currently experiencing high demand"). When a model
// attempt fails with a transient 429/5xx AFTER postJson's retries are
// exhausted, the next model in the chain is tried — quieter Stable
// models from Google's models page: gemini-3.6-flash, then
// gemini-3.5-flash-lite, then gemini-3.1-flash-lite. Client errors
// (400/401/403/404) never fall back: a bad key or wrong model name
// can't be fixed by trying another model. Timeouts and network
// failures never fall back either. The fallback is per-request only —
// the user's saved model setting is never changed. No Gemini 4 model
// is in the chain (likely not on the free tier — a fallback that 404s
// would be worse than useless), and gemini-3-flash-preview is left out
// (Preview — free-tier availability unverified).
import { friendlyError, postJson, ProviderHttpError, type SendChatOptions, type SendChatResult } from '../providers';

/** Quieter Stable fallbacks, in order. The user's configured model is
    tried first; these follow, skipping any duplicate. */
const GEMINI_FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

export async function sendGemini(options: SendChatOptions): Promise<SendChatResult> {
  const chain = [options.model, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== options.model)];
  let lastError: unknown = null;
  for (const model of chain) {
    try {
      const text = await sendGeminiWithModel({ ...options, model });
      return { text, model };
    } catch (e) {
      // Only transient overload/rate-limit failures try the next model.
      // Anything else (bad key, wrong model, timeout, network) fails now.
      if (e instanceof ProviderHttpError && (e.status === 429 || e.status >= 500)) {
        lastError = e;
        continue;
      }
      throw e;
    }
  }
  // Every model in the chain failed the same transient way — report the
  // last one's error, which carries the same diagnosable status.
  throw lastError;
}

async function sendGeminiWithModel({ apiKey, model, systemPrompt, messages }: SendChatOptions): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));
  const json = await postJson(
    url,
    { 'x-goog-api-key': apiKey },
    { systemInstruction: { parts: [{ text: systemPrompt }] }, contents },
    'Gemini',
  );
  const parts = json.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const text = parts
      .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')
      .trim();
    if (text) return text;
  }
  // A blocked/empty reply still has a finish reason, not text.
  if (json.candidates?.[0]?.finishReason) {
    throw new Error('Gemini declined to answer that — try rephrasing the question.');
  }
  throw friendlyError(null, 'Gemini');
}
