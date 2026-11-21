// "Other" provider — any OpenAI-compatible endpoint. Same chat
// completions shape as OpenAI, posted to the user's base URL instead
// of api.openai.com. Accepts a base URL with or without a trailing
// slash, with or without the /chat/completions suffix already on it.
import type { SendChatOptions, SendChatResult } from '../providers';
import { sendChatCompletions } from './openai';

export async function sendOpenAICompatible({
  config,
  apiKey,
  model,
  systemPrompt,
  messages,
}: SendChatOptions): Promise<SendChatResult> {
  const base = (config.baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) {
    throw new Error('Add a base URL in Settings first — that is the address of your AI service.');
  }
  const url = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
  const text = await sendChatCompletions(url, apiKey, model, systemPrompt, messages, 'your AI service');
  return { text, model };
}
