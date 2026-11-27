// "Sign in with OpenRouter" — OAuth PKCE flow, no client secret, no
// backend, no password ever handled by the app.
//
// The user taps the button in Settings, authorizes DCB on
// openrouter.ai, and OpenRouter redirects back to dcb://openrouter
// with a single-use code. The app exchanges that code (plus the
// PKCE verifier it generated) for an API key tied to the user's own
// OpenRouter account, and stores that key in SecureStore exactly
// like a pasted key. Their requests are billed to their own
// OpenRouter credits — DCB never pays for anyone's inference and
// never sees their password.
//
// Exchange verified 2026-11-27 against OpenRouter's own API
// reference (openrouter.ai/docs/api/api-reference/oauth/
// exchange-authorization-code-for-api-key): POST
// https://openrouter.ai/api/v1/auth/keys with
// { code, code_challenge_method: "S256", code_verifier } returns
// { key }. The SHA-256 / base64url pieces live in ./sha256.ts
// (pure JS, verified against the RFC vectors); the random bytes
// come from expo-crypto's native generator. That native dependency
// is why this flow ships in a full APK build (0.1.12), not over the
// air: the 0.1.11 APK was built before expo-crypto was added, and
// an over-the-air update cannot add native code.
//
// The pending verifier lives in AsyncStorage only until the exchange
// (it is a single-use proof, not a credential that spends money),
// and is deleted the moment it is used — so if both the Settings
// button handler and the /openrouter callback route see the same
// redirect, only the first exchange runs and the second is a
// harmless no-op.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { saveApiKey, hasApiKey } from '@/ai/secure-key';
import { base64UrlEncode, pkceChallenge } from '@/ai/sha256';

const PENDING_KEY = 'counter-buy:openrouter-oauth:v1';

/** The deep link OpenRouter redirects back to after authorization —
    routed by Expo Router to src/app/openrouter.tsx. */
export const OPENROUTER_REDIRECT_URL = 'dcb://openrouter';

/** Key label prefilled on OpenRouter's authorization page. */
const KEY_LABEL = 'DCB';

interface PendingSignIn {
  verifier: string;
  state: string;
  createdAt: number;
}

/** Build the authorization URL and store the pending verifier/state.
    Call this, then open the returned URL in the browser. Randomness
    comes from expo-crypto's native generator: Hermes does not expose
    globalThis.crypto.getRandomValues on this build, so the first
    version of this flow failed on Mikel's phone with "this phone
    can't generate a secure sign-in code". */
export async function startOpenRouterSignIn(): Promise<{ authUrl: string; redirectUrl: string }> {
  const verifier = base64UrlEncode(await Crypto.getRandomBytesAsync(32));
  const state = base64UrlEncode(await Crypto.getRandomBytesAsync(16));
  const challenge = pkceChallenge(verifier);
  const pending: PendingSignIn = { verifier, state, createdAt: Date.now() };
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  const params = new URLSearchParams({
    callback_url: OPENROUTER_REDIRECT_URL,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    key_label: KEY_LABEL,
  });
  return {
    authUrl: `https://openrouter.ai/auth?${params.toString()}`,
    redirectUrl: OPENROUTER_REDIRECT_URL,
  };
}

/** True when a sign-in is waiting for its redirect — the guard that
    stops the /openrouter route from consuming a stray ?code= that
    does not belong to this flow. */
export async function hasPendingOpenRouterSignIn(): Promise<boolean> {
  return (await AsyncStorage.getItem(PENDING_KEY)) != null;
}

/** Read a query param out of a redirect URL without depending on
    the URL global. */
export function queryParam(url: string, name: string): string | null {
  const query = url.split('?')[1] ?? '';
  for (const pair of query.split('&')) {
    const [key, value] = pair.split('=');
    if (key === name) {
      try {
        return decodeURIComponent(value ?? '');
      } catch {
        return value ?? '';
      }
    }
  }
  return null;
}

function friendlyExchangeError(status: number | null): Error {
  if (status === null) {
    return new Error("Couldn't reach OpenRouter — check your connection and try again.");
  }
  if (status === 400 || status === 403) {
    return new Error('OpenRouter rejected the sign-in — try signing in again.');
  }
  return new Error(`OpenRouter sign-in failed (error ${status}) — try again.`);
}

/** Exchange an authorization code for the user's API key and save
    it. Returns 'signed-in' on the first exchange, 'already' when
    the code was already consumed (the Settings handler and the
    callback route can both see the same redirect). The pending
    verifier is deleted before the exchange so a second call can
    never reuse it. */
export async function completeOpenRouterSignIn(code: string, state: string | null): Promise<'signed-in' | 'already'> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  if (!raw) {
    // No pending sign-in: either this code was already exchanged
    // (the other path got there first) or it is stale.
    if (await hasApiKey()) return 'already';
    throw new Error('That sign-in expired — try signing in again from Settings.');
  }
  const pending = JSON.parse(raw) as PendingSignIn;
  // Consume the verifier first: a code is single-use, and this
  // stops a second exchange attempt from ever reusing it.
  await AsyncStorage.removeItem(PENDING_KEY);
  if (state !== null && state !== pending.state) {
    throw new Error("That sign-in didn't match this phone — try signing in again.");
  }
  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_challenge_method: 'S256',
        code_verifier: pending.verifier,
      }),
    });
  } catch {
    throw friendlyExchangeError(null);
  }
  if (!res.ok) {
    throw friendlyExchangeError(res.status);
  }
  let json: Record<string, unknown>;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new Error('OpenRouter sent back a garbled reply — try signing in again.');
  }
  const key = json.key;
  if (typeof key !== 'string' || !key) {
    throw new Error('OpenRouter did not return a key — try signing in again.');
  }
  await saveApiKey(key);
  return 'signed-in';
}

/** Abandon a pending sign-in (user cancelled in the browser). */
export async function cancelOpenRouterSignIn(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}
