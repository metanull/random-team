'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const I18n = require('../js/i18n.js');

test('i18n: every language has exactly the same keys', () => {
  const en = Object.keys(I18n.messages.en).sort();
  for (const lang of I18n.LANGS) {
    assert.deepEqual(Object.keys(I18n.messages[lang]).sort(), en, lang);
  }
});

test('i18n: every key used in HTML and JS exists', () => {
  const root = path.join(__dirname, '..');
  const used = new Set();
  for (const f of ['index.html', 'r.html']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of src.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) used.add(m[1]);
  }
  for (const f of ['js/app.js', 'js/reveal.js']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of src.matchAll(/\bt\('([A-Za-z]+)'/g)) used.add(m[1]);
    for (const m of src.matchAll(/'((?:err|status|reveal|phone)[A-Z][A-Za-z]+)'/g)) used.add(m[1]);
  }
  for (const key of used) {
    for (const lang of I18n.LANGS) assert.ok(key in I18n.messages[lang], lang + ': missing ' + key);
  }
  assert.ok(used.size > 30);
});

test('i18n: placeholders and plurals', () => {
  assert.equal(I18n.t('count', { n: 1 }), '1 participant');
  assert.equal(I18n.t('count', { n: 3 }), '3 participants');
  assert.equal(I18n.t('showBtn', { name: 'Zoë' }), 'I\'m Zoë — show my pair');
  assert.equal(I18n.t('unknownKey'), 'unknownKey');
});
