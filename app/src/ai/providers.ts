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
// Anthropic Messages API. Re-checked 2026-11-22 against
// ai.google.dev and gemma.ai: `gemma-4-31b-it` is the Gemini
// default (served through the same generateContent endpoint with the
// same key — the Gemma docs host exactly gemma-4-31b-it and
// gemma-4-26b-a4b-it), `generateContent` remains fully supported
// (now labelled legacy beside the new Interactions API), and
// `systemInstruction: { parts: [{ text }] }` matches the
// GenerateContentRequest reference — Gemma 4 supports that field
// natively, unlike Gemma 3, which the API no longer serves at all
// (gemma-3-27b-it 404s; Google's models page lists no Gemma). Only
// a gemma-3-* model still gets the system prompt prepended to the
// first user turn (see providers/gemini.ts).
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
    model on 429/5xx, and on 404 for its own built-in models — but
    never on 400/401/403, and never on a 404 for the user's own typed
    model). The message is the same plain-language friendly error
    the user sees. */
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
    Timeouts are NOT retried either: a request that already waited
    the full 30s should not make the user wait minutes.
    Network failures ARE retried — 2 retries (3 attempts total),
    ~1s then ~2s apart. That is the exact failure Mikel hit on
    2026-11-21: Test connection (tiny prompt) succeeds, then the
    first real chat message (full Deadlock context, longer-held
    connection) fails with "Couldn't reach Gemini" because fetch
    threw before any response came back — a stale pooled connection
    on a flaky link. A failed connection attempt sends nothing and
    consumes no quota, so retrying it is free, and the next attempt
    opens a fresh connection. Delays are ~1s, ~2s, ~4s with a little
    jitter for HTTP retries, ~1s then ~2s for network retries. */
export const MAX_RETRIES = 3;
export const MAX_NETWORK_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(retryIndex: number): number {
  // retryIndex 0 -> ~1s, 1 -> ~2s, 2 -> ~4s, plus up to 250ms jitter.
  return RETRY_BASE_DELAY_MS * 2 ** retryIndex + Math.random() * 250;
}

/** Options for postJson. `timeoutMs` exists only so tests can
    prove the race without waiting 30s — production callers pass
    nothing and always get REQUEST_TIMEOUT_MS. `deadline` is an
    absolute Date.now() timestamp capping the whole call including
    retries (the Gemini chain passes its ~90s deadline so a chain
    of slow models can never spin for minutes). */
export interface PostJsonOptions {
  timeoutMs?: number;
  deadline?: number;
}

/** Run a fetch and turn HTTP errors into friendly errors. The
    request is raced against a timeout promise, so it ALWAYS
    settles at REQUEST_TIMEOUT_MS even if the underlying fetch
    ignores the AbortController signal — that is the failure Mikel
    hit on 2026-11-21: a chat send showed "Thinking…" for ~5
    minutes, then "couldn't reach Gemini", because the fetch hung
    past the 30s abort and only died when the OS killed the socket.
    Transient 429/5xx responses are retried with backoff, and
    network failures (fetch throwing before any response) are
    retried twice on a fresh connection (see the retry policy
    above). Timeouts are never retried. When retries are exhausted
    the error is exactly the same friendly error a single attempt
    would have produced, status included. */
export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  context: string,
  options: PostJsonOptions = {},
): Promise<Record<string, any>> {
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const deadline = options.deadline;
  for (let attempt = 0; ; attempt++) {
    // Overall deadline: once it has passed, stop starting attempts.
    const remaining = deadline === undefined ? Infinity : deadline - Date.now();
    if (remaining <= 0) {
      throw new Error('That took too long — check your connection and try again.');
    }
    const attemptTimeout = Math.min(timeoutMs, remaining);
    const controller = new AbortController();
    // The timeout error for this attempt — the race rejects with
    // this exact object so it can be told apart from a real
    // network failure below.
    const timeoutError = new Error('That took too long — check your connection and try again.');
    const abortTimer = setTimeout(() => controller.abort(), attemptTimeout);
    let raceTimer: ReturnType<typeof setTimeout> | undefined;
    let res: Response;
    try {
      res = await Promise.race([
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(body),
          signal: controller.signal,
        }),
        new Promise<never>((_, reject) => {
          raceTimer = setTimeout(() => reject(timeoutError), attemptTimeout);
        }),
      ]);
    } catch (e) {
      // The race left a fetch hanging — cancel it if it honours
      // the signal so it does not linger for minutes.
      controller.abort();
      if (e === timeoutError || (e instanceof Error && e.name === 'AbortError')) {
        throw timeoutError;
      }
      // Network failure: fetch threw before any response came back
      // (stale pooled connection, Wi-Fi hiccup). Retry on a fresh
      // connection — the failed attempt sent nothing and cost no
      // quota. After MAX_NETWORK_RETRIES retries, surface the same
      // friendly "couldn't reach" error a single attempt would give.
      if (attempt < MAX_NETWORK_RETRIES) {
        await sleep(retryDelayMs(attempt));
        continue;
      }
      throw friendlyError(null, context);
    } finally {
      clearTimeout(abortTimer);
      if (raceTimer !== undefined) clearTimeout(raceTimer);
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
