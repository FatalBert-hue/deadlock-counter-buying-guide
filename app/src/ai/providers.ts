// Provider layer — one small module per AI provider behind a single
// `sendChatMessage` interface, so adding a provider later is one file.
//
// Every provider gets: the resolved model name, the system prompt, and
// the conversation so far. Every provider returns the assistant's reply
// text. Errors are mapped to short plain-language messages — never a
// raw JSON dump, never the API key.
//
// Request shapes were verified against the providers' current docs
// (Nov 2026): Gemini generateContent REST, OpenAI chat completions,
// Anthropic Messages API. Re-checked 2026-11-21 against
// ai.google.dev: `gemini-3.8-flash` is a real Stable model (so the
// Gemini default is correct), `generateContent` remains fully
// supported (now labelled legacy beside the new Interactions API),
// and `systemInstruction: { parts: [{ text }] }` matches the
// GenerateContentRequest reference — no model or shape change needed.
import type { AIConfig, ChatMessage } from './types';
import { sendGemini } from './providers/gemini';
import { sendOpenAI } from './providers/openai';
import { sendAnthropic } from './providers/anthropic';
import { sendOpenAICompatible } from './providers/openai-compatible';

export interface SendChatOptions {
  config: AIConfig;
  /** The user's API key. Passed in, never stored or logged here. */
  apiKey: string;
  /** Resolved model name (config.model, or the provider default when blank). */
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
}

/** An HTTP failure from a provider, carrying the status so callers
    can decide what to do next (e.g. Gemini falls back to a quieter
    model on 429/5xx, but never on 400/401/403/404). The message is
    the same plain-language friendly error the user sees. */
export class ProviderHttpError extends Error {
  status: number;
  constructor(status: number, context: string) {
    super(friendlyError(status, context).message);
    this.name = 'ProviderHttpError';
    this.status = status;
  }
}

/** What a provider send returns: the reply text plus the model that
    actually answered (Gemini may answer from a fallback model — see
    sendGemini). */
export interface SendChatResult {
  text: string;
  model: string;
}

export async function sendChatMessage(options: SendChatOptions): Promise<SendChatResult> {
  const { config } = options;
  switch (config.provider) {
    case 'gemini':
      return sendGemini(options);
    case 'openai':
      return sendOpenAI(options);
    case 'anthropic':
      return sendAnthropic(options);
    case 'other':
      return sendOpenAICompatible(options);
  }
}

/** Map an HTTP status / network failure to a short plain-language
    message. `context` names the provider so the message can say where
    the problem is. The HTTP status is included in the text (e.g.
    "error 500") so a failure can be diagnosed from the message alone.
    No request or response body is ever included. */
export function friendlyError(status: number | null, context: string): Error {
  if (status === null) {
    return new Error(`Couldn't reach ${context} — check your connection and try again.`);
  }
  switch (status) {
    case 400:
      return new Error(
        `That request was rejected by ${context} (error 400) — the model name may be wrong, or the message too long. Check the model in Settings.`,
      );
    case 401:
    case 403:
      return new Error(
        `Your API key was rejected by ${context} (error ${status}). Check the key in Settings — make sure you copied the whole thing.`,
      );
    case 404:
      return new Error(
        `That model wasn't found on ${context} (error 404). Check the model name in Settings.`,
      );
    case 429:
      return new Error(
        `You're being rate-limited by ${context} (error 429) — wait a bit and try again. (Free tiers cap how often you can ask.)`,
      );
    default:
      if (status >= 500) {
        return new Error(
          `${context} returned error ${status} — it's having trouble right now, try again in a bit.`,
        );
      }
      return new Error(`Something went wrong talking to ${context} (error ${status}). Try again.`);
  }
}

/** How long a provider request may run before it is aborted. React
    Native's fetch has no built-in timeout, so without this a stalled
    request could hang the UI's "Testing…" / "Thinking…" state forever
    — which is exactly what happened to Mikel on 0.1.11. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Retry policy for transient provider errors (Google's documented
    fix for 503s: retry with exponential backoff). Only responses that
    actually came back with a transient status are retried — 429 (rate
    limit) and 5xx (e.g. Gemini 503 "model is currently experiencing
    high demand"). Client errors (400/401/403/404 — bad key, wrong
    model) fail immediately, because retrying them can never help.
    Timeouts and network failures are NOT retried either: a request
    that already waited the full 30s should not make the user wait
    minutes. Delays are ~1s, ~2s, ~4s with a little jitter, so a
    503 that clears quickly still feels fast. */
export const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(retryIndex: number): number {
  // retryIndex 0 -> ~1s, 1 -> ~2s, 2 -> ~4s, plus up to 250ms jitter.
  return RETRY_BASE_DELAY_MS * 2 ** retryIndex + Math.random() * 250;
}

/** Run a fetch and turn HTTP errors into friendly errors. Throws the
    friendly error; returns the parsed JSON body on success. The request
    is aborted after REQUEST_TIMEOUT_MS so this always settles, and
    transient 429/5xx responses are retried with backoff (see above).
    When retries are exhausted the error is exactly the same friendly
    error a single attempt would have produced, status included. */
export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  context: string,
): Promise<Record<string, any>> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('That took too long — check your connection and try again.');
      }
      throw friendlyError(null, context);
    } finally {
      clearTimeout(timer);
    }
    if (res.ok) {
      try {
        return (await res.json()) as Record<string, any>;
      } catch {
        throw new Error(`Got a garbled reply from ${context}. Try again.`);
      }
    }
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt >= MAX_RETRIES) {
      throw new ProviderHttpError(res.status, context);
    }
    await sleep(retryDelayMs(attempt));
  }
}
