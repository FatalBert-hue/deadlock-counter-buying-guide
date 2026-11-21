// Deep-link handling for DCB build sharing.
//
// Three ways a build can arrive from outside the app:
//   1. An https App Link — https://fatalbert-hue.github.io/dcb/build?data=<compact payload>
//      — shared as plain text. Google Messages only linkifies http/https
//      URLs, so this is the link that is actually tappable in a text.
//      Android verifies it against /.well-known/assetlinks.json on that
//      host (intent filter in app.json, autoVerify) and opens DCB to the
//      /dcb/build route (src/app/dcb/build.tsx).
//   2. A dcb:// link — dcb://import?data=<compact payload> — the fallback
//      used only inside the build.html page a browser shows when the app
//      is not installed. Custom schemes are not linkified by Messages, so
//      this is never the shared link anymore.
//   3. A .json file — a content:// or file:// URI handed to the app when
//      the user picks "Open with DCB" on a build file. Android only offers
//      DCB there because of the intent filter in app.json
//      (VIEW + application/json + *.json on content/file schemes).
//
// The link payload is a COMPACT encoding (see encodeCompactBuild below):
// heroes and items travel as their index in the bundled data.json
// roster/shop, not as full names, so a full 12+12-item build fits in
// ~70 characters of payload instead of ~2 KB of JSON. Old links that
// carry the full JSON payload still parse (parseImportLink tries the
// compact form first, then the legacy JSON form). The .json FILE format
// is unchanged (formatVersion 1) — only links are compact.
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

import { guideData } from '@/data';
import { parseBuildFile, type SavedBuild } from '@/state/saved';

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
  return base64UrlEncodeBytes(utf8Encode(text));
}

export function base64UrlDecode(input: string): string {
  return utf8Decode(base64UrlDecodeBytes(input));
}

/** base64url over raw bytes (no padding). Hermes has no Buffer. */
export function base64UrlEncodeBytes(bytes: number[]): string {
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

export function base64UrlDecodeBytes(input: string): number[] {
  const s = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
  const idx = (ch: string): number => (ch === '=' ? 0 : B64_ALPHABET.indexOf(ch));
  const bytes: number[] = [];
  for (let i = 0; i < padded.length; i += 4) {
    const n = (idx(padded[i]) << 18) | (idx(padded[i + 1]) << 12) | (idx(padded[i + 2]) << 6) | idx(padded[i + 3]);
    bytes.push((n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  }
  const pad = (padded.match(/=+$/) || [''])[0].length;
  return bytes.slice(0, bytes.length - pad);
}

/* ------------------------------------------------------------------ */
/* Build links                                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Compact link encoding                                               */
/* ------------------------------------------------------------------ */

// A full build as JSON is ~1–2 KB, which is why the old share links
// were ~1.5–3 KB and kept hitting character limits in Messages. The
// compact form packs the same build into a few dozen bytes:
//
//   data = "c1." + base64url(bytes)
//   bytes = [0x01 version]
//           [enemy hero index in guideData.heroes, or 0xFF]
//           [your hero index in guideData.heroes, or 0xFF]
//           [enemy item count N][N item indices in guideData.items]
//           [your item count M][M item indices in guideData.items]
//           [quickPick flag 0/1][enemy type code][your type code]
//           [name byte length][name UTF-8]
//           [author byte length][author UTF-8]
//   type codes: 0 = "" (none) · 1 = Weapon · 2 = Vitality · 3 = Spirit
//
// Indices are positions in the BUNDLED data.json roster/shop order.
// That order must not be shuffled without bumping COMPACT_VERSION, or
// old links would decode to the wrong heroes/items. A full 12+12-item
// build encodes to ~50–70 bytes of payload (~70–95 base64url chars).
// Name/author are truncated to 60 characters so each length still
// fits in one byte (60 chars x 4 bytes max = 240).

export const COMPACT_PREFIX = 'c1.';
const COMPACT_VERSION = 0x01;
const NO_HERO = 0xff;
const MAX_TEXT_CHARS = 60;

const TYPE_CODES: Record<string, number> = { '': 0, Weapon: 1, Vitality: 2, Spirit: 3 };
const CODE_TYPES = ['', 'Weapon', 'Vitality', 'Spirit'];

function heroIndex(name: string | null): number {
  if (!name) return NO_HERO;
  const i = guideData.heroes.findIndex((h) => h.name === name);
  return i < 0 ? NO_HERO : i;
}

function itemIndices(names: string[]): number[] {
  return names
    .map((n) => guideData.items.findIndex((i) => i.name === n))
    .filter((i) => i >= 0);
}

/** Encode a build as the compact payload string (with the "c1." prefix). */
export function encodeCompactBuild(build: SavedBuild): string {
  const enemyItems = itemIndices(build.enemyItems);
  const youItems = itemIndices(build.youItems);
  const nameBytes = utf8Encode(build.name.slice(0, MAX_TEXT_CHARS));
  const authorBytes = utf8Encode(build.author.slice(0, MAX_TEXT_CHARS));
  const bytes: number[] = [COMPACT_VERSION, heroIndex(build.enemyHero), heroIndex(build.youHero)];
  bytes.push(enemyItems.length, ...enemyItems);
  bytes.push(youItems.length, ...youItems);
  if (build.quickPick) {
    bytes.push(1, TYPE_CODES[build.quickPick.enemyType] ?? 0, TYPE_CODES[build.quickPick.youType] ?? 0);
  } else {
    bytes.push(0, 0, 0);
  }
  bytes.push(nameBytes.length, ...nameBytes);
  bytes.push(authorBytes.length, ...authorBytes);
  return COMPACT_PREFIX + base64UrlEncodeBytes(bytes);
}

/** Decode a compact payload back to a build (null if it is not one).
 *  Indices are mapped back to names and the result is validated through
 *  the same parseBuildFile() as the .json file format, so out-of-range
 *  indices are dropped and a bad payload never crashes. */
export function decodeCompactBuild(data: string): SavedBuild | null {
  if (!data.startsWith(COMPACT_PREFIX)) return null;
  try {
    const bytes = base64UrlDecodeBytes(data.slice(COMPACT_PREFIX.length));
    let p = 0;
    const take = (n: number): number[] | null => {
      if (p + n > bytes.length) return null;
      return bytes.slice(p, (p += n));
    };
    if (bytes[p++] !== COMPACT_VERSION) return null;
    const heroAt = (i: number): string | null =>
      i === NO_HERO || i < 0 || i >= guideData.heroes.length ? null : guideData.heroes[i].name;
    const enemyHero = heroAt(bytes[p++]);
    const youHero = heroAt(bytes[p++]);
    const readItems = (): string[] | null => {
      const count = bytes[p++];
      if (count === undefined) return null;
      const idxs = take(count);
      if (!idxs) return null;
      return idxs
        .filter((i) => i >= 0 && i < guideData.items.length)
        .map((i) => guideData.items[i].name);
    };
    const enemyItems = readItems();
    const youItems = readItems();
    if (!enemyItems || !youItems) return null;
    const qpFlag = bytes[p++];
    const qpEnemy = CODE_TYPES[bytes[p++]] ?? '';
    const qpYou = CODE_TYPES[bytes[p++]] ?? '';
    const readText = (): string | null => {
      const len = bytes[p++];
      if (len === undefined) return null;
      const b = take(len);
      return b ? utf8Decode(b) : null;
    };
    const name = readText();
    const author = readText();
    if (name === null || author === null) return null;
    return parseBuildFile({
      format: 'counter-buy-build',
      formatVersion: 1,
      app: 'DCB',
      name,
      author,
      savedAt: new Date().toISOString(),
      enemyHero,
      enemyItems,
      youHero,
      youItems,
      ...(qpFlag === 1 ? { quickPick: { enemyType: qpEnemy, youType: qpYou } } : {}),
    });
  } catch {
    return null;
  }
}

/** The shared link: an https App Link, tappable in Google Messages.
 *  Compact payload, so the whole link stays short. */
export function buildImportLink(build: SavedBuild): string {
  return `${APP_LINK_BASE}?data=${encodeCompactBuild(build)}`;
}

/**
 * Decode a bare link payload (the `data` query param) back to a build
 * (null if not one). Accepts both payload shapes: the compact "c1."
 * payload and the old full-JSON payload, so links already shared keep
 * working. This is what the import screens use — they only have the
 * param, not the whole URL — and parseImportLink() below uses it too,
 * so there is exactly one place that knows both payload shapes.
 */
export function parseImportPayload(data: string): SavedBuild | null {
  if (!data) return null;
  if (data.startsWith(COMPACT_PREFIX)) return decodeCompactBuild(data);
  try {
    return parseBuildFile(JSON.parse(base64UrlDecode(data)) as unknown);
  } catch {
    return null;
  }
}

/** The dcb:// fallback link — used only inside the build.html page a
 *  browser shows when the app is not installed. Never shared directly:
 *  Messages does not linkify custom schemes. Same compact payload. */
export function buildDcbImportLink(build: SavedBuild): string {
  return `${IMPORT_SCHEME}://${IMPORT_HOST}?data=${encodeCompactBuild(build)}`;
}

/**
 * Decode an import link back to a build (null if not one). Accepts both
 * the https App Link (https://fatalbert-hue.github.io/dcb/build?data=...)
 * and the dcb://import?data=... fallback — and both payload shapes:
 * the new compact "c1." payload, and the old full-JSON payload (links
 * already shared keep working).
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
  return parseImportPayload(data);
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
