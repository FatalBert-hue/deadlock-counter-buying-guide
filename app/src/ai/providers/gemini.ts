// Gemini provider — Google AI Generative Language API.
// POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
// Auth: x-goog-api-key header.
// Roles: 'user' / 'model' (assistant turns become 'model').
// Reply text: candidates[0].content.parts[].text
//
// Main model (since 2026-11-22): `gemma-4-31b-it` — Google's
// open-weight model, served through the same Gemini API with the same
// key. Gemma 3 is DEAD on the API: Google's official Gemini models
// page (ai.google.dev/gemini-api/docs/models, crawled 2026-11-22)
// lists no Gemma models at all, and gemma-3-27b-it returns 404 on a
// real phone. Gemma 4 is what the API serves now — the Gemma docs
// (gemma.ai/deployment/gemini-api) host exactly two models:
// gemma-4-31b-it and gemma-4-26b-a4b-it. Free tier for Gemma 4 from
// secondary sources (Google publishes no free-tier numbers): 30 RPM /
// 16,000 TPM / 14,400 RPD per model — one older AI Studio snapshot
// showed 1,500 RPD instead, so treat the daily number as indicative.
// The low TPM binds first: DCB's ~1,274-token system prompt plus
// history is a few thousand input tokens per request.
//
// Unlike Gemma 3, Gemma 4 DOES support `systemInstruction` — the
// Gemma docs have a "System Instructions" section with a working
// example, and independent write-ups confirm the field works when
// sent as a separate field. So Gemma 4 models get the real
// `systemInstruction`, exactly like Gemini-family models. Only
// Gemma 3 models (kept in the code solely so a user-typed
// gemma-3-* model still behaves) get the system prompt prepended
// to the first user turn instead.
//
// One Gemma 4 quirk: gemma-4-26b-a4b-it thinks by default, and its
// thinking comes back as response parts marked `thought: true`.
// Those parts are filtered out of the reply text below so the user
// never sees raw thinking. gemma-4-31b-it does not think.
//
// Model fallback: when a model attempt fails with a transient 429/5xx
// AFTER postJson's retries are exhausted, the next model in the chain
// is tried — gemma-4-26b-a4b-it, then the Flash-Lite models
// gemini-3.5-flash-lite and gemini-3.1-flash-lite (500 RPD each).
// NEW 404 rule (2026-11-22, after Gemma 3 died with a 404): a 404
// on a model in the built-in chain also tries the next model —
// Google retires/renames models, and a dead built-in should not be
// a dead end. But a 404 on the user's own typed custom model fails
// immediately: that is their typo to fix. Timeouts and network
// failures never fall back either. The fallback is per-request only
// — the user's saved model setting is never changed. No Gemma 3
// model is in the chain, no Gemini 4 model is in it, and
// gemini-3.8-flash is out too — its 20/day cap is what this change
// is escaping.
import { friendlyError, postJson, ProviderHttpError, type SendChatOptions, type SendChatResult } from '../providers';

/** Fallbacks after the user's configured model, in order, skipping
    any duplicate. */
const GEMINI_FALLBACK_MODELS = [
  'gemma-4-26b-a4b-it',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

/** The models DCB itself ships as the Gemini chain (default +
    fallbacks). A 404 on one of these means Google retired it, so the
    chain moves on. A 404 on anything else is the user's own typed
    model, which fails immediately instead. */
const BUILTIN_GEMINI_MODELS = [
  'gemma-4-31b-it',
  ...GEMINI_FALLBACK_MODELS,
];

/** Overall deadline for one Gemini send across the whole chain.
    90s: four models × ~30s worst case would otherwise be minutes
    of "Thinking…". Production value — tests may use a shorter
    deadline through postJson's options, never by changing this. */
export const GEMINI_CHAIN_DEADLINE_MS = 90_000;

/** Only Gemma 3 models lack a system role — `systemInstruction`
    errors on them — so the system prompt is prepended to the first
    user turn for those. Gemma 4 supports system instructions
    natively (Gemma docs, "System Instructions"), as do
    Gemini-family models. */
function lacksSystemInstruction(model: string): boolean {
  return model.startsWith('gemma-3-');
}

export async function sendGemini(options: SendChatOptions): Promise<SendChatResult> {
  const chain = [options.model, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== options.model)];
  // Only a built-in chain model earns a 404 fallback — a dead
  // built-in is Google's doing, a dead custom model is the user's.
  const canFallback404 = BUILTIN_GEMINI_MODELS.includes(options.model);
  // Overall deadline for one send across the whole chain (~90s).
  // postJson's race caps each single attempt at 30s, but a chain
  // of slow models could still spin for minutes — the deadline
  // stops the chain and reports the last error, and it is also
  // passed into postJson so an in-flight attempt cannot run past
  // it. "Thinking…" never spins for minutes.
  const deadline = Date.now() + GEMINI_CHAIN_DEADLINE_MS;
  let lastError: unknown = null;
  for (const model of chain) {
    if (Date.now() >= deadline) break;
    try {
      const text = await sendGeminiWithModel({ ...options, model }, deadline);
      return { text, model };
    } catch (e) {
      // Only transient overload/rate-limit failures try the next model.
      // Anything else (bad key, wrong model, timeout, network) fails now.
      if (e instanceof ProviderHttpError && (e.status === 429 || e.status >= 500)) {
        lastError = e;
        continue;
      }
      // A 404 on a built-in chain model means Google retired or
      // renamed it (Gemma 3 died exactly this way) — try the next
      // model instead of showing a dead error. The "Answering with
      // {model}" indicator shows which model actually answered.
      if (e instanceof ProviderHttpError && e.status === 404 && canFallback404) {
        lastError = e;
        continue;
      }
      throw e;
    }
  }
  // Every model in the chain failed the same way — report the last
  // one's error, which carries the same diagnosable status.
  if (lastError !== null) {
    throw lastError;
  }
  throw new Error('That took too long — check your connection and try again.');
}

async function sendGeminiWithModel(
  { apiKey, model, systemPrompt, messages }: SendChatOptions,
  deadline: number,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));
  // Only Gemma 3 models lack a system role: the API rejects
  // `systemInstruction` for them, so the Deadlock context goes at
  // the top of the first user turn instead. Gemma 4 and
  // Gemini-family models get the real field.
  let body: Record<string, unknown>;
  if (lacksSystemInstruction(model)) {
    const firstUser = contents.find((c) => c.role === 'user');
    if (firstUser) {
      firstUser.parts[0].text = `${systemPrompt}\n\n${firstUser.parts[0].text}`;
    } else {
      contents.unshift({ role: 'user', parts: [{ text: systemPrompt }] });
    }
    body = { contents };
  } else {
    body = { systemInstruction: { parts: [{ text: systemPrompt }] }, contents };
  }
  const json = await postJson(
    url,
    { 'x-goog-api-key': apiKey },
    body,
    'Gemini',
    { deadline },
  );
  const parts = json.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    // gemma-4-26b-a4b-it thinks by default: its thinking comes back
    // as parts marked `thought: true`. Filter those out so the user
    // never sees raw thinking — only the actual reply.
    const text = parts
      .filter((p: any) => p?.thought !== true)
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
