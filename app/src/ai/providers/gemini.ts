// Gemini provider — Google AI Generative Language API.
// POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
// Auth: x-goog-api-key header. System prompt goes in `systemInstruction`.
// Roles: 'user' / 'model' (assistant turns become 'model').
// Reply text: candidates[0].content.parts[].text
import { friendlyError, postJson, type SendChatOptions } from '../providers';

export async function sendGemini({ apiKey, model, systemPrompt, messages }: SendChatOptions): Promise<string> {
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
