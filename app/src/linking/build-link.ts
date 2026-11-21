// Deep-link handling for DCB build sharing.
//
// Three ways a build can arrive from outside the app:
//   1. An https App Link — https://fatalbert-hue.github.io/dcb/build?data=<base64url JSON>
//      — shared as plain text. Google Messages only linkifies http/https
//      URLs, so this is the link that is actually tappable in a text.
//      Android verifies it against /.well-known/assetlinks.json on that
//      host (intent filter in app.json, autoVerify) and opens DCB to the
//      /dcb/build route (src/app/dcb/build.tsx).
//   2. A dcb:// link — dcb://import?data=<base64url JSON> — the fallback
//      used only inside the build.html page a browser shows when the app
//      is not installed. Custom schemes are not linkified by Messages, so
//      this is never the shared link anymore.
//   3. A .json file — a content:// or file:// URI handed to the app when
//      the user picks "Open with DCB" on a build file. Android only offers
//      DCB there because of the intent filter in app.json
//      (VIEW + application/json + *.json on content/file schemes).
//
// The payload is the same shared build JSON as the file format
// (formatVersion 1) in every case, so a link and a file carry the same
// build. The build JSON is ~1–2 KB, so the encoded link is ~1.5–3 KB.
//
// Incoming dcb:// and https links are routed by Expo Router to the
// /import and /dcb/build screens. This module's listener
// (DeepLinkHandler) handles only the file URIs, which the router turns
// into an unmatched route instead — see src/app/+not-found.tsx, which
// sends that route home. Both paths validate through the same
// parseBuildFile() — unknown hero/item names are dropped, a bad payload
// never crashes, and the author always shows.
import * as Linking from 'expo-linking';
import { File } from 'expo-file-system';

import { buildToFile, parseBuildFile, type SavedBuild } from '@/state/saved';

export const IMPORT_SCHEME = 'dcb';
export const IMPORT_HOST = 'import';

/** The https App Link host/path — the shareable, Messages-tappable link. */
export const APP_LINK_HOST = 'fatalbert-hue.github.io';
export const APP_LINK_PATH = '/dcb/build';
export const APP_LINK_BASE = `https://${APP_LINK_HOST}${APP_LINK_PATH}`;

/* ------------------------------------------------------------------ */
/* base64url codec (dependency-free; Hermes has no Buffer)             */
/* ------------------------------------------------------------------ */

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8Encode(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        bytes.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f),
        );
        i++;
        continue;
      }
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

function utf8Decode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i++;
    } else if (b >= 0xc0 && b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if (b >= 0xe0 && b < 0xf0) {
      out += String.fromCharCode(
        ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f),
      );
      i += 3;
    } else {
      const cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      const v = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff));
      i += 4;
    }
  }
  return out;
}

export function base64UrlEncode(text: string): string {
  const bytes = utf8Encode(text);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64_ALPHABET[b2 & 0x3f] : '=';
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(input: string): string {
  const s = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
  const idx = (ch: string): number => (ch === '=' ? 0 : B64_ALPHABET.indexOf(ch));
  const bytes: number[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    const n = (idx(padded[i]) << 18) | (idx(padded[i + 1]) << 12) | (idx(padded[i + 2]) << 6) | idx(padded[i + 3]);
    bytes.push((n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  }
  const pad = (padded.match(/=+$/) || [''])[0].length;
  return utf8Decode(bytes.slice(0, bytes.length - pad));
}

/* ------------------------------------------------------------------ */
/* Build links                                                         */
/* ------------------------------------------------------------------ */

/** The shared link: an https App Link, tappable in Google Messages. */
export function buildImportLink(build: SavedBuild): string {
  return `${APP_LINK_BASE}?data=${base64UrlEncode(JSON.stringify(buildToFile(build)))}`;
}

/** The dcb:// fallback link — used only inside the build.html page a
 *  browser shows when the app is not installed. Never shared directly:
 *  Messages does not linkify custom schemes. */
export function buildDcbImportLink(build: SavedBuild): string {
  return `${IMPORT_SCHEME}://${IMPORT_HOST}?data=${base64UrlEncode(JSON.stringify(buildToFile(build)))}`;
}

/**
 * Decode an import link back to a build (null if not one). Accepts both
 * the https App Link (https://fatalbert-hue.github.io/dcb/build?data=...)
 * and the dcb://import?data=... fallback.
 */
export function parseImportLink(url: string): SavedBuild | null {
  const parsed = Linking.parse(url);
  if (parsed.scheme === 'https') {
    if (parsed.hostname !== APP_LINK_HOST) return null;
    if ((parsed.path ?? '') !== APP_LINK_PATH) return null;
  } else if (parsed.scheme === IMPORT_SCHEME || parsed.scheme === 'counter-buy') {
    const host = parsed.hostname ?? '';
    const path = (parsed.path ?? '').replace(/^\//, '');
    if (host !== IMPORT_HOST && path !== IMPORT_HOST) return null;
  } else {
    return null;
  }
  const data = parsed.queryParams?.data;
  if (typeof data !== 'string' || !data) return null;
  try {
    return parseBuildFile(JSON.parse(base64UrlDecode(data)) as unknown);
  } catch {
    return null;
  }
}

export type IncomingUrlOutcome =
  | { status: 'imported'; build: SavedBuild }
  | { status: 'invalid' }
  | { status: 'ignored' };

/**
 * Handle a URL the OS handed the app. Used by DeepLinkHandler for file
 * URIs only — dcb:// and https App Links are routed by Expo Router to
 * /import and /dcb/build instead, so they are ignored here to avoid
 * importing the same build twice.
 */
export async function handleIncomingUrl(url: string): Promise<IncomingUrlOutcome> {
  const parsed = Linking.parse(url);
  if (parsed.scheme === 'content' || parsed.scheme === 'file') {
    try {
      const text = await new File(url).text();
      const build = parseBuildFile(JSON.parse(text) as unknown);
      return build ? { status: 'imported', build } : { status: 'invalid' };
    } catch {
      return { status: 'invalid' };
    }
  }
  return { status: 'ignored' };
}
