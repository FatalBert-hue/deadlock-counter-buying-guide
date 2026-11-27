// Pure-JavaScript SHA-256 (FIPS 180-4) plus base64url helpers.
//
// Why hand-rolled instead of expo-crypto: expo-crypto is a native
// module, and adding a native module means the change cannot ship as
// an over-the-air update — it would need a whole new APK build. This
// file has no dependencies at all, so the OpenRouter sign-in ships
// over the air like everything else.
//
// Only used for the OpenRouter OAuth PKCE handshake: the verifier is
// random base64url (32 bytes), the challenge is base64url(SHA-256
// (verifier)). The verifier is ASCII by construction, so the hash
// below only handles ASCII input — that is all PKCE ever needs.
//
// Test vector (RFC 7636 §4.2): the verifier
// "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk" must give the
// challenge "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", and
// SHA-256("abc") must be
// ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad.
// Both are checked by the node test in scripts/ before shipping.
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/** SHA-256 digest of an ASCII string, as bytes. */
export function sha256Bytes(input: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) bytes.push(input.charCodeAt(i) & 0xff);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  // 64-bit length, big-endian. Inputs here are short, so the high
  // 32 bits are always zero.
  bytes.push(0, 0, 0, 0);
  bytes.push((bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Array<number>(64);
  for (let block = 0; block < bytes.length; block += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] =
        ((bytes[block + t * 4] << 24) |
          (bytes[block + t * 4 + 1] << 16) |
          (bytes[block + t * 4 + 2] << 8) |
          bytes[block + t * 4 + 3]) >>>
        0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = (rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)) >>> 0;
      const s1 = (rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)) >>> 0;
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let t = 0; t < 64; t++) {
      const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + s1 + ch + K[t] + w[t]) >>> 0;
      const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const hs = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (hs[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (hs[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (hs[i] >>> 8) & 0xff;
    out[i * 4 + 3] = hs[i] & 0xff;
  }
  return out;
}

/** SHA-256 digest of an ASCII string, as lowercase hex (test helper). */
export function sha256Hex(input: string): string {
  return [...sha256Bytes(input)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64url without padding — the PKCE encoding. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[b0 >> 2];
    out += B64[((b0 & 0x03) << 4) | (b1 >> 4)];
    if (i + 1 < bytes.length) out += B64[((b1 & 0x0f) << 2) | (b2 >> 6)];
    if (i + 2 < bytes.length) out += B64[b2 & 0x3f];
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_');
}

/** PKCE S256 code challenge for a verifier: base64url(SHA-256(verifier)). */
export function pkceChallenge(verifier: string): string {
  return base64UrlEncode(sha256Bytes(verifier));
}

/** `byteCount` cryptographically random bytes, base64url-encoded.
    Uses the platform's secure random generator (Hermes exposes
    globalThis.crypto.getRandomValues). Throws instead of falling
    back to Math.random — a PKCE verifier must be unpredictable. */
export function randomBase64Url(byteCount: number): string {
  const cryptoObj = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!cryptoObj?.getRandomValues) {
    throw new Error('This phone cannot generate a secure sign-in code — paste an OpenRouter key instead.');
  }
  const bytes = new Uint8Array(byteCount);
  cryptoObj.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}
