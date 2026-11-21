// Anthropic provider (Claude) — Messages API.
// POST https://api.anthropic.com/v1/messages
// Auth: x-api-key header + anthropic-version header. System prompt is
// a top-level `system` field (not a message). Reply text is the joined
// text blocks in content[]. `anthropic-dangerous-direct-browser-access`
// is the documented header for direct client-side calls.
// max_tokens is required by this API.
import { postJson, type SendChatOptions, type SendChatResult } from '../providers';

export async function sendAnthropic({ apiKey, model, systemPrompt, messages }: SendChatOptions): Promise<SendChatResult> {
  const json = await postJson(
    'https://api.anthropic.com/v1/messages',
    {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    {
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.text })),
    },
    'Claude',
  );
  const blocks = json.content;
  if (Array.isArray(blocks)) {
    const text = blocks
      .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
      .map((b: any) => b.text)
      .join('')
      .trim();
    if (text) return { text, model };
  }
  throw new Error('Got an empty reply from Claude. Try again.');
}
