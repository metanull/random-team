/* Random Team - operator app (index.html). */
(function () {
  'use strict';

  var RT = window.RandomTeam;
  var t = window.I18n.t;
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

  var problems = []; // [{ key, name }] kept so they can be re-translated

  function renderError() {
    var msg = problems.map(function (p) { return t(p.key, { name: p.name }); }).join(' ');
    addError.textContent = msg;
    addError.hidden = !msg;
  }

  function setProblems(list) {
    problems = list;
    renderError();
  }

  function addNames(raw) {
    var parts = String(raw).split(/[\n\r,;]+/).map(RT.cleanName).filter(Boolean);
    if (!parts.length) return;
    var found = [];
    parts.forEach(function (name) {
      if (RT.nameBytes(name) > RT.MAX_NAME_BYTES) {
        found.push({ key: 'errTooLong', name: name });
      } else if (names.some(function (n) { return RT.nameKey(n) === RT.nameKey(name); })) {
        found.push({ key: 'errDuplicate', name: name });
      } else {
        names.push(name);
      }
    });
    setProblems(found);
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
      rm.title = t('remove', { name: name });
      rm.setAttribute('aria-label', rm.title);
      rm.addEventListener('click', function () { removeName(i); });
      li.appendChild(rm);
      list.appendChild(li);
    });
    $('name-count').textContent = t('count', { n: names.length });
    $('empty-hint').hidden = names.length > 0;
    $('clear-btn').hidden = names.length === 0;
    $('start-btn').disabled = names.length < 2;
    $('start-hint').textContent =
      names.length < 2 ? t('hintMin') :
      names.length < 3 ? t('hintTwo') : '';

    document.querySelector('input[name=reveal][value=' + options.reveal + ']').checked = true;
    document.querySelector('input[name=mode][value=' + options.mode + ']').checked = true;
    $('reveal-help').textContent = t(options.reveal === 'qr' ? 'revealHelpQr' : 'revealHelpScreen');
    renderError();
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
    if (confirm(t('confirmClear', { n: names.length }))) {
      names = [];
      setProblems([]);
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
      b.appendChild(el('span', 'status', t(draw.seen[i] ? 'statusSeen' : 'statusWaiting')));
      b.addEventListener('click', function () { pick(i); });
      box.appendChild(b);
      if (draw.seen[i]) done++;
    });
    $('progress').textContent = t('progress', { done: done, total: draw.names.length });
    $('all-done').hidden = done !== draw.names.length;
    $('end-btn').textContent = t(done === draw.names.length ? 'finish' : 'cancelDraw');
  }

  function pick(i) {
    if (draw.seen[i] && !confirm(t('confirmReshow', { name: draw.names[i] }))) return;
    current = i;
    $('handover-name').textContent = draw.names[i];
    $('show-btn').textContent = t('showBtn', { name: draw.names[i] });
    show('screen-handover');
  }

  $('end-btn').addEventListener('click', function () {
    var done = draw.seen.every(Boolean);
    if (!done && !confirm(t('confirmCancel'))) return;
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
    $('reveal-intro').textContent = t('revealIntro', { name: draw.names[current] });

    var qrMode = draw.reveal === 'qr';
    $('reveal-screen').hidden = qrMode;
    $('reveal-qr').hidden = !qrMode;
    if (qrMode) {
      // The language is not secret: it goes in the query string. The code goes in the fragment (#),
      // which browsers never send to the server.
      var page = new URL('r.html', location.href);
      page.search = '?lang=' + window.I18n.getLang();
      page.hash = '';
      var url = page.href + '#' + RT.encode(target);
      renderQr(url);
      $('qr-link').textContent = url;
      prepareShare(draw.names[current], url);
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

  // ---------------------------------------------------------------------------
  // Share (QR / link mode): send the link with an app of this device.
  // Only the encoded link is shared, never the name. No API: the system share sheet
  // (Web Share) when available, otherwise plain WhatsApp / SMS / e-mail links and copy.
  // ---------------------------------------------------------------------------

  var shareData = null;

  function prepareShare(recipient, url) {
    var text = t('shareText', { name: recipient });
    shareData = { title: 'Random Team', text: text, url: url };
    var body = text + '\n' + url;
    $('share-whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent(body);
    $('share-sms').href = 'sms:?&body=' + encodeURIComponent(body);
    $('share-mail').href = 'mailto:?subject=' + encodeURIComponent(t('shareSubject')) + '&body=' + encodeURIComponent(body);
    $('share-fallback').hidden = true;
    $('share-btn').hidden = false;
    $('share-status').textContent = '';
  }

  $('share-btn').addEventListener('click', function () {
    if (!shareData) return;
    if (navigator.share) {
      navigator.share(shareData).then(function () {
        $('share-status').textContent = t('shareDone');
      }, function (err) {
        if (err && err.name === 'AbortError') return; // the operator closed the share sheet
        $('share-fallback').hidden = false;
      });
    } else {
      $('share-fallback').hidden = false;
      $('share-btn').hidden = true;
    }
  });

  $('copy-btn').addEventListener('click', function () {
    if (!shareData) return;
    var done = function () { $('share-status').textContent = t('copied'); };
    var url = shareData.url;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { legacyCopy(url) && done(); });
    } else if (legacyCopy(url)) {
      done();
    }
  });

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    return ok;
  }

  function clearSecret() {
    shareData = null;
    ['share-whatsapp', 'share-sms', 'share-mail'].forEach(function (id) { $(id).removeAttribute('href'); });
    $('share-fallback').hidden = true;
    $('share-status').textContent = '';
    $('reveal-name').textContent = '';
    $('reveal-intro').textContent = '';
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

  window.I18n.init(function () {
    renderSetup();
    if (draw) renderHandout();
  });
  renderSetup();
  show('screen-setup');
  if (window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) input.focus();
})();
