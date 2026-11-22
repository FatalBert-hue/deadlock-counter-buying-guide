// Gemini provider — Google AI Generative Language API.
// POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
// Auth: x-goog-api-key header.
// Roles: 'user' / 'model' (assistant turns become 'model').
// Reply text: candidates[0].content.parts[].text
//
// Main model (since 2026-11-21): `gemma-3-27b-it` — Google's
// open-weight model, served through the same Gemini API with the same
// key. Its free tier is far roomier than Flash's (secondary sources,
// Google does not publish free-tier numbers: 30 RPM / 15,000 TPM /
// 14,400 RPD per model, vs Flash's 20 requests/day) — though the low
// 15,000 TPM binds first: DCB's ~1,274-token system prompt plus
// history is a few thousand input tokens per request, so a few
// requests a minute is the practical ceiling.
//
// Gemma has no system role: sending `systemInstruction` to a Gemma
// model returns an error, so for Gemma models the system prompt is
// prepended to the first user turn instead — Google's own documented
// workaround, and what the Vercel AI SDK does for Gemma. Gemini-family
// models keep the real `systemInstruction` field.
//
// Model fallback: when a model attempt fails with a transient 429/5xx
// AFTER postJson's retries are exhausted, the next model in the chain
// is tried — gemma-3-12b-it, then gemma-3-4b-it, then the Flash-Lite
// models gemini-3.5-flash-lite and gemini-3.1-flash-lite (500 RPD
// each). Client errors (400/401/403/404) never fall back: a bad key or
// wrong model name can't be fixed by trying another model. Timeouts
// and network failures never fall back either. The fallback is
// per-request only — the user's saved model setting is never changed.
// No Gemini 4 model is in the chain (free-tier availability
// unverified), and gemini-3.8-flash is out too — its 20/day cap is
// what this change is escaping.
import { friendlyError, postJson, ProviderHttpError, type SendChatOptions, type SendChatResult } from '../providers';

/** Fallbacks after the user's configured model, in order, skipping
    any duplicate. */
const GEMINI_FALLBACK_MODELS = [
  'gemma-3-12b-it',
  'gemma-3-4b-it',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

/** Gemma models have no system role — `systemInstruction` errors on
    them — so the system prompt is prepended to the first user turn. */
function isGemmaModel(model: string): boolean {
  return model.startsWith('gemma-');
}

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
  // Gemma has no system role: the API rejects `systemInstruction` for
  // Gemma models, so the Deadlock context goes at the top of the first
  // user turn instead. Gemini-family models get the real field.
  let body: Record<string, unknown>;
  if (isGemmaModel(model)) {
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
