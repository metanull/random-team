/*
 * Random Team - core logic (no DOM).
 *
 *  - draw():   random secret pairing (a derangement: everyone gives to exactly one other person,
 *              everyone receives from exactly one other person, nobody draws themself).
 *  - encode(): / decode(): reversible, fixed-length obfuscation of a name, used for the QR/link mode.
 *
 * Works as a classic browser script (exposes window.RandomTeam) and as a CommonJS module (tests).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.RandomTeam = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('A secure random number generator (crypto.getRandomValues) is required.');
  }

  // ---------------------------------------------------------------------------
  // Randomness
  // ---------------------------------------------------------------------------

  /** Uniform random integer in [0, n), without modulo bias. */
  function randomInt(n) {
    if (!(n > 0) || n > 0x100000000) throw new RangeError('randomInt: bad range ' + n);
    var limit = 0x100000000 - (0x100000000 % n); // largest multiple of n that fits in 2^32
    var buf = new Uint32Array(1);
    var x;
    do {
      cryptoObj.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % n;
  }

  /** Fisher-Yates shuffle (in place), returns the array. */
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = randomInt(i + 1);
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function range(n) {
    var a = new Array(n);
    for (var i = 0; i < n; i++) a[i] = i;
    return a;
  }

  /**
   * Uniformly random derangement of 0..n-1: result[i] is the index of the person i is paired with.
   * Rejection sampling: shuffle until nobody is mapped to themself (on average ~2.7 tries).
   * Mutual pairs (A->B and B->A) are allowed, they simply happen at random.
   */
  function derangement(n) {
    if (n < 2) throw new RangeError('At least 2 people are needed.');
    for (;;) {
      var p = shuffle(range(n));
      var ok = true;
      for (var i = 0; i < n; i++) {
        if (p[i] === i) { ok = false; break; }
      }
      if (ok) return p;
    }
  }

  /**
   * Random single loop of 0..n-1 (A->B->C->...->A). Never produces mutual pairs (when n > 2)
   * or small closed groups. Optional alternative to the default derangement.
   */
  function singleLoop(n) {
    if (n < 2) throw new RangeError('At least 2 people are needed.');
    var order = shuffle(range(n));
    var p = new Array(n);
    for (var i = 0; i < n; i++) p[order[i]] = order[(i + 1) % n];
    return p;
  }

  /**
   * Draw pairs for a list of names.
   * @param {string[]} names
   * @param {'any'|'loop'} [mode='any']
   * @returns {number[]} targets: targets[i] is the index (in names) of the person names[i] is paired with.
   */
  function draw(names, mode) {
    var n = names.length;
    return mode === 'loop' ? singleLoop(n) : derangement(n);
  }

  // ---------------------------------------------------------------------------
  // Names
  // ---------------------------------------------------------------------------

  var encoder = new TextEncoder();
  var decoderFatal = new TextDecoder('utf-8', { fatal: true });

  /** Max UTF-8 bytes of a name, so it fits in the fixed-size code. */
  var MAX_NAME_BYTES = 42;

  function cleanName(s) {
    return String(s == null ? '' : s).normalize('NFC').replace(/\s+/g, ' ').trim();
  }

  function nameKey(s) {
    return cleanName(s).toLocaleLowerCase();
  }

  function nameBytes(s) {
    return encoder.encode(cleanName(s)).length;
  }

  // ---------------------------------------------------------------------------
  // Codec (obfuscation, NOT encryption)
  // ---------------------------------------------------------------------------
  //
  // Layout of the 48 raw bytes (-> always 64 base64url characters):
  //
  //   [ nonce: 4 ][ len: 1 ][ name: len bytes | random padding up to 42 ][ check: 1 ]
  //                \_______________ XOR-ed with a keystream seeded by the nonce ________/
  //
  //  - fixed length: the code length never depends on the name length;
  //  - random nonce + random padding: the same name gives a different code every time;
  //  - check byte: detects mistyped / truncated / tampered codes.
  //
  // Anyone who reads this source can decode a code: the goal is only that the name cannot be
  // read at a glance (on screen, in a QR code or in a URL).

  var NONCE_BYTES = 4;
  var BLOCK_BYTES = 1 + MAX_NAME_BYTES + 1; // 44
  var CODE_BYTES = NONCE_BYTES + BLOCK_BYTES; // 48
  var CODE_LENGTH = 64; // base64url chars for 48 bytes, no padding
  var SALT = 0x5eC2e7A1;

  /** mulberry32 PRNG -> keystream of `len` bytes. */
  function keystream(seed, len) {
    var a = seed >>> 0;
    var out = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      out[i] = ((t ^ (t >>> 14)) >>> 0) & 0xff;
    }
    return out;
  }

  function checksum(bytes, end) {
    var h = 0x2f;
    for (var i = 0; i < end; i++) h = (Math.imul(h ^ bytes[i], 0x9d) + 7) & 0xff;
    return h;
  }

  function seedOf(nonce) {
    return (((nonce[0] << 24) | (nonce[1] << 16) | (nonce[2] << 8) | nonce[3]) ^ SALT) >>> 0;
  }

  function toBase64Url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromBase64Url(str) {
    var s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /** Encode a name into a fixed-length (64 chars), URL-safe code. */
  function encode(name) {
    var bytes = encoder.encode(cleanName(name));
    if (bytes.length === 0) throw new Error('Empty name.');
    if (bytes.length > MAX_NAME_BYTES) throw new Error('Name too long.');

    var block = new Uint8Array(BLOCK_BYTES);
    cryptoObj.getRandomValues(block); // random padding everywhere, then overwrite the useful part
    block[0] = bytes.length;
    block.set(bytes, 1);
    block[BLOCK_BYTES - 1] = checksum(block, BLOCK_BYTES - 1);

    var nonce = new Uint8Array(NONCE_BYTES);
    cryptoObj.getRandomValues(nonce);
    var ks = keystream(seedOf(nonce), BLOCK_BYTES);

    var out = new Uint8Array(CODE_BYTES);
    out.set(nonce, 0);
    for (var i = 0; i < BLOCK_BYTES; i++) out[NONCE_BYTES + i] = block[i] ^ ks[i];
    return toBase64Url(out);
  }

  /** Decode a code produced by encode(). Throws on any invalid input. */
  function decode(code) {
    var c = String(code || '').trim();
    if (c.length !== CODE_LENGTH || !/^[A-Za-z0-9_-]+$/.test(c)) throw new Error('Invalid code.');
    var raw = fromBase64Url(c);
    if (raw.length !== CODE_BYTES) throw new Error('Invalid code.');

    var nonce = raw.subarray(0, NONCE_BYTES);
    var ks = keystream(seedOf(nonce), BLOCK_BYTES);
    var block = new Uint8Array(BLOCK_BYTES);
    for (var i = 0; i < BLOCK_BYTES; i++) block[i] = raw[NONCE_BYTES + i] ^ ks[i];

    if (block[BLOCK_BYTES - 1] !== checksum(block, BLOCK_BYTES - 1)) throw new Error('Invalid code.');
    var len = block[0];
    if (len < 1 || len > MAX_NAME_BYTES) throw new Error('Invalid code.');
    try {
      return decoderFatal.decode(block.subarray(1, 1 + len));
    } catch (e) {
      throw new Error('Invalid code.');
    }
  }

  return {
    randomInt: randomInt,
    shuffle: shuffle,
    derangement: derangement,
    singleLoop: singleLoop,
    draw: draw,
    cleanName: cleanName,
    nameKey: nameKey,
    nameBytes: nameBytes,
    MAX_NAME_BYTES: MAX_NAME_BYTES,
    CODE_LENGTH: CODE_LENGTH,
    encode: encode,
    decode: decode
  };
});
