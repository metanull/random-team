/* Random Team - operator app (index.html). */
(function () {
  'use strict';

  var RT = window.RandomTeam;
  var STORE_KEY = 'random-team.v1';

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  // Only the list of names and the options are persisted (localStorage).
  // The draw itself lives in memory only: it is gone when the page is closed or reloaded.

  var saved = load();
  var names = saved.names;           // string[]
  var options = saved.options;       // { reveal: 'screen'|'qr', mode: 'any'|'loop' }
  var draw = null;                   // { names: string[], targets: number[], seen: boolean[] } | null
  var current = -1;                  // index of the participant holding the device

  function load() {
    var data = null;
    try { data = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { /* ignore */ }
    var list = data && Array.isArray(data.names) ? data.names.map(RT.cleanName).filter(Boolean) : [];
    var opts = data && data.options ? data.options : {};
    return {
      names: list,
      options: {
        reveal: opts.reveal === 'qr' ? 'qr' : 'screen',
        mode: opts.mode === 'loop' ? 'loop' : 'any'
      }
    };
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ names: names, options: options }));
    } catch (e) { /* storage may be unavailable (private mode): the app still works */ }
  }

  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------

  function $(id) { return document.getElementById(id); }

  function show(screenId) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].hidden = screens[i].id !== screenId;
    window.scrollTo(0, 0);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------------------------------------------------------------------------
  // 1. Setup
  // ---------------------------------------------------------------------------

  var input = $('name-input');
  var addError = $('add-error');

  function setError(msg) {
    addError.textContent = msg || '';
    addError.hidden = !msg;
  }

  function addNames(raw) {
    var parts = String(raw).split(/[\n\r,;]+/).map(RT.cleanName).filter(Boolean);
    if (!parts.length) return;
    var problems = [];
    parts.forEach(function (name) {
      if (RT.nameBytes(name) > RT.MAX_NAME_BYTES) {
        problems.push('“' + name + '” is too long.');
      } else if (names.some(function (n) { return RT.nameKey(n) === RT.nameKey(name); })) {
        problems.push('“' + name + '” is already in the list.');
      } else {
        names.push(name);
      }
    });
    setError(problems.join(' '));
    save();
    renderSetup();
  }

  function removeName(i) {
    names.splice(i, 1);
    save();
    renderSetup();
  }

  function renderSetup() {
    var list = $('name-list');
    list.textContent = '';
    names.forEach(function (name, i) {
      var li = el('li');
      li.appendChild(el('span', 'name', name));
      var rm = el('button', 'btn-icon', '×');
      rm.type = 'button';
      rm.title = 'Remove ' + name;
      rm.setAttribute('aria-label', 'Remove ' + name);
      rm.addEventListener('click', function () { removeName(i); });
      li.appendChild(rm);
      list.appendChild(li);
    });
    $('name-count').textContent = names.length;
    $('empty-hint').hidden = names.length > 0;
    $('clear-btn').hidden = names.length === 0;
    $('start-btn').disabled = names.length < 2;
    $('start-hint').textContent =
      names.length < 2 ? 'Add at least 2 names.' :
      names.length < 3 ? 'With only 2 people, each one can guess the other\'s pair.' : '';

    document.querySelector('input[name=reveal][value=' + options.reveal + ']').checked = true;
    document.querySelector('input[name=mode][value=' + options.mode + ']').checked = true;
    $('reveal-help').textContent = options.reveal === 'qr'
      ? 'Each participant scans a QR code and reads the name on their own phone. They can open the link again later.'
      : 'Each participant taps to show the name on this device, then taps again to hide it.';
    $('file-warning').hidden =!(options.reveal === 'qr' && location.protocol === 'file:');
  }

  $('add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    addNames(input.value);
    input.value = '';
    input.focus();
  });

  input.addEventListener('paste', function (e) {
    var text = (e.clipboardData || window.clipboardData).getData('text');
    if (/[\n\r,;]/.test(text)) {
      e.preventDefault();
      addNames(text);
      input.value = '';
    }
  });

  $('clear-btn').addEventListener('click', function () {
    if (confirm('Remove all ' + names.length + ' names from the list?')) {
      names = [];
      setError('');
      save();
      renderSetup();
    }
  });

  document.querySelectorAll('input[name=reveal], input[name=mode]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      options[radio.name] = radio.value;
      save();
      renderSetup();
    });
  });

  $('start-btn').addEventListener('click', function () {
    if (names.length < 2) return;
    var snapshot = names.slice();
    draw = {
      names: snapshot,
      targets: RT.draw(snapshot, options.mode),
      seen: snapshot.map(function () { return false; }),
      reveal: options.reveal
    };
    renderHandout();
    show('screen-handout');
  });

  // ---------------------------------------------------------------------------
  // 2. Hand-out
  // ---------------------------------------------------------------------------

  function renderHandout() {
    var box = $('people');
    box.textContent = '';
    var done = 0;
    draw.names.forEach(function (name, i) {
      var b = el('button', 'person' + (draw.seen[i] ? ' seen' : ''));
      b.type = 'button';
      b.appendChild(el('span', 'name', name));
      b.appendChild(el('span', 'status', draw.seen[i] ? '✓ informed' : 'waiting'));
      b.addEventListener('click', function () { pick(i); });
      box.appendChild(b);
      if (draw.seen[i]) done++;
    });
    $('progress').textContent = done + ' / ' + draw.names.length;
    $('all-done').hidden = done !== draw.names.length;
    $('end-btn').textContent = done === draw.names.length ? 'Finish' : 'Cancel the draw';
  }

  function pick(i) {
    if (draw.seen[i] && !confirm(draw.names[i] + ' has already seen their pair.\nShow it again?')) return;
    current = i;
    $('handover-name').textContent = draw.names[i];
    $('handover-name-2').textContent = draw.names[i];
    show('screen-handover');
  }

  $('end-btn').addEventListener('click', function () {
    var done = draw.seen.every(Boolean);
    if (!done && !confirm('Cancel this draw? The pairing will be lost; a new draw will give different pairs.')) return;
    endDraw();
  });

  function endDraw() {
    draw = null;
    current = -1;
    clearSecret();
    renderSetup();
    show('screen-setup');
  }

  // ---------------------------------------------------------------------------
  // 3. Hand-over & 4. Reveal
  // ---------------------------------------------------------------------------

  $('handover-cancel').addEventListener('click', function () {
    current = -1;
    show('screen-handout');
  });

  $('show-btn').addEventListener('click', function () {
    if (!draw || current < 0) return;
    var target = draw.names[draw.targets[current]];
    $('reveal-giver').textContent = draw.names[current];

    var qrMode = draw.reveal === 'qr';
    $('reveal-screen').hidden = qrMode;
    $('reveal-qr').hidden = !qrMode;
    if (qrMode) {
      var url = new URL('r.html', location.href).href.split('#')[0] + '#' + RT.encode(target);
      renderQr(url);
      $('qr-link').textContent = url;
    } else {
      $('reveal-name').textContent = target;
    }
    show('screen-reveal');
  });

  $('hide-btn').addEventListener('click', function () {
    if (draw && current >= 0) draw.seen[current] = true;
    current = -1;
    clearSecret();
    renderHandout();
    show('screen-handout');
  });

  function renderQr(text) {
    var qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    $('qr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
  }

  function clearSecret() {
    $('reveal-name').textContent = '';
    $('reveal-giver').textContent = '';
    $('qr').textContent = '';
    $('qr-link').textContent = '';
  }

  // Leaving the page loses the draw: ask first.
  window.addEventListener('beforeunload', function (e) {
    if (draw && !draw.seen.every(Boolean)) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  renderSetup();
  show('screen-setup');
  if (window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) input.focus();
})();
