// Run with: node --test   (from the repository root)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const RT = require('../js/core.js');

function assertValidPairing(p) {
  const n = p.length;
  const received = new Set();
  for (let i = 0; i < n; i++) {
    assert.ok(Number.isInteger(p[i]) && p[i] >= 0 && p[i] < n, 'target in range');
    assert.notEqual(p[i], i, 'nobody is paired with themself');
    received.add(p[i]);
  }
  assert.equal(received.size, n, 'everyone is chosen exactly once');
}

test('derangement: valid for many sizes', () => {
  for (let n = 2; n <= 40; n++) {
    for (let k = 0; k < 50; k++) assertValidPairing(RT.derangement(n));
  }
});

test('singleLoop: valid and forms one single cycle', () => {
  for (let n = 2; n <= 40; n++) {
    for (let k = 0; k < 50; k++) {
      const p = RT.singleLoop(n);
      assertValidPairing(p);
      let len = 0, i = 0;
      do { i = p[i]; len++; } while (i !== 0);
      assert.equal(len, n);
    }
  }
});

test('draw: rejects fewer than 2 people', () => {
  assert.throws(() => RT.draw([]));
  assert.throws(() => RT.draw(['Solo']));
  assert.throws(() => RT.draw(['Solo'], 'loop'));
});

test('derangement: roughly uniform over all 9 derangements of 4, mutual pairs do happen', () => {
  const counts = new Map();
  const N = 18000;
  let mutual = 0;
  for (let k = 0; k < N; k++) {
    const p = RT.derangement(4);
    const key = p.join('');
    counts.set(key, (counts.get(key) || 0) + 1);
    if (p[p[0]] === 0) mutual++;
  }
  assert.equal(counts.size, 9);
  for (const c of counts.values()) {
    assert.ok(Math.abs(c - N / 9) < N / 9 * 0.15, 'count ' + c + ' close to ' + N / 9);
  }
  assert.ok(mutual > 0);
});

test('codec: round trip, fixed length, varies between calls', () => {
  const names = ['A', 'Bob', 'Zoë', 'José María', '李小龍', 'Ölçü 🎄', 'x'.repeat(RT.MAX_NAME_BYTES)];
  for (const name of names) {
    const a = RT.encode(name);
    const b = RT.encode(name);
    assert.equal(a.length, RT.CODE_LENGTH);
    assert.equal(b.length, RT.CODE_LENGTH);
    assert.match(a, /^[A-Za-z0-9_-]+$/);
    assert.notEqual(a, b, 'same name gives different codes');
    assert.equal(RT.decode(a), name);
    assert.equal(RT.decode(b), name);
  }
});

test('codec: decoding is deterministic and stable across draws and versions', () => {
  // Codes generated once and frozen here. They must keep decoding to the same names forever, whatever
  // the draw: if this test fails, links already handed out to participants would stop working.
  const fixtures = {
    'VIrSXoSpb9lRDAybchmSy1cyM7BLNjTw0ovnTnJxN8YqEcz1-JS0-yLBkTV5IFJF': 'Zoë Müller-Ñúñez',
    'P9UsRRZbuqHz0iyEAaOxkZu4r2WZ-1PhH2q8C-ziDTZ1Bt6hbPObQ3gwTG1HprOr': 'Alice'
  };
  for (const [code, name] of Object.entries(fixtures)) {
    for (let k = 0; k < 3; k++) assert.equal(RT.decode(code), name);
  }
});

test('link: drawn name + recipient, old links still work', () => {
  const frag = RT.encodeLink('Chloé', 'Alice');
  assert.equal(frag.length, RT.CODE_LENGTH * 2 + 1);
  assert.deepEqual(RT.decodeLink(frag), { name: 'Chloé', recipient: 'Alice' });
  assert.deepEqual(RT.decodeLink('#' + frag), { name: 'Chloé', recipient: 'Alice' });
  // Links handed out before the recipient part existed (code only)
  const old = 'P9UsRRZbuqHz0iyEAaOxkZu4r2WZ-1PhH2q8C-ziDTZ1Bt6hbPObQ3gwTG1HprOr';
  assert.deepEqual(RT.decodeLink(old), { name: 'Alice', recipient: null });
  // A broken recipient part only drops the greeting; a broken drawn-name code is an error
  assert.deepEqual(RT.decodeLink(old + '.garbage'), { name: 'Alice', recipient: null });
  assert.throws(() => RT.decodeLink('garbage.' + old));
});

test('codec: rejects too long or empty names', () => {
  assert.throws(() => RT.encode(''));
  assert.throws(() => RT.encode('x'.repeat(RT.MAX_NAME_BYTES + 1)));
});

test('codec: rejects invalid or tampered codes', () => {
  assert.throws(() => RT.decode(''));
  assert.throws(() => RT.decode('abc'));
  const code = RT.encode('Alice');
  assert.throws(() => RT.decode(code.slice(1)));
  let rejected = 0;
  for (let i = 4; i < code.length; i++) { // past the nonce: flipping a character must be detected
    const ch = code[i] === 'A' ? 'B' : 'A';
    const bad = code.slice(0, i) + ch + code.slice(i + 1);
    try { RT.decode(bad); } catch { rejected++; }
  }
  assert.ok(rejected >= code.length - 4 - 3, 'nearly all single-character changes are detected');
});

test('cleanName / nameKey', () => {
  assert.equal(RT.cleanName('  Anna   Maria \n'), 'Anna Maria');
  assert.equal(RT.nameKey('ANNA maria'), RT.nameKey('anna  Maria'));
});
