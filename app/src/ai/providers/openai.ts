// OpenAI provider (ChatGPT) — chat completions API.
// POST https://api.openai.com/v1/chat/completions
// Auth: Authorization: Bearer <key>. System prompt is the first
// message with role 'system'. Reply text: choices[0].message.content
import { postJson, type SendChatOptions } from '../providers';

export async function sendOpenAI({ apiKey, model, systemPrompt, messages }: SendChatOptions): Promise<string> {
  return sendChatCompletions('https://api.openai.com/v1/chat/completions', apiKey, model, systemPrompt, messages, 'ChatGPT');
}

export async function sendChatCompletions(
  url: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: SendChatOptions['messages'],
  context: string,
): Promise<string> {
  const json = await postJson(
    url,
    { Authorization: `Bearer ${apiKey}` },
    {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.text })),
      ],
      max_tokens: 1024,
    },
    context,
  );
  const text = json.choices?.[0]?.message?.content;
  if (typeof text === 'string' && text.trim()) return text.trim();
  throw new Error(`Got an empty reply from ${context}. Try again.`);
}
