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
    var qrMode = draw.reveal === 'qr';
    draw.names.forEach(function (name, i) {
      var tile = el('div', 'person' + (draw.seen[i] ? ' seen' : ''));
      var b = el('button', 'person-main');
      b.type = 'button';
      b.appendChild(el('span', 'name', name));
      b.appendChild(el('span', 'status', t(draw.seen[i] ? 'statusSeen' : 'statusWaiting')));
      b.addEventListener('click', function () { pick(i); });
      tile.appendChild(b);
      if (qrMode) {
        // Send this person's link directly, without handing the device over.
        var s = el('button', 'person-share');
        s.type = 'button';
        s.title = t('shareFor', { name: name });
        s.setAttribute('aria-label', s.title);
        s.innerHTML = SHARE_ICON;
        s.addEventListener('click', function () { shareFromList(i); });
        tile.appendChild(s);
      }
      box.appendChild(tile);
      if (draw.seen[i]) done++;
    });
    $('handout-help').textContent = t(qrMode ? 'handoutHelpQr' : 'handoutHelp');
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
      var url = linkFor(target);
      revealUrl = url;
      renderQr(url);
      $('qr-link').textContent = url;
      $('share-status').textContent = '';
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

  var SHARE_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>' +
    '<circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';

  var revealUrl = null;   // link shown on the reveal screen
  var dialogCtx = null;   // { url, onSent } while the fallback dialog is open
  var leavingForApp = 0;  // timestamp: an sms:/mailto: link was just opened (see beforeunload)

  /** Participant link for a drawn name. The language is not secret: it goes in the query string.
   *  The code goes in the fragment (#), which browsers never send to any server. */
  function linkFor(targetName) {
    var page = new URL('r.html', location.href);
    page.search = '?lang=' + window.I18n.getLang();
    page.hash = '';
    return page.href + '#' + RT.encode(targetName);
  }

  /** Send `url` to participant `i` with an app of this device. `onSent` runs once it was handed over. */
  function share(i, url, onSent) {
    var text = t('shareText', { name: draw.names[i] });
    if (navigator.share) {
      navigator.share({ title: 'Random Team', text: text, url: url }).then(onSent, function (err) {
        if (err && err.name === 'AbortError') return; // the operator closed the share sheet
        openShareDialog(i, url, text, onSent);
      });
    } else {
      openShareDialog(i, url, text, onSent);
    }
  }

  function openShareDialog(i, url, text, onSent) {
    var body = text + '\n' + url;
    $('share-dialog-title').textContent = t('shareFor', { name: draw.names[i] });
    $('share-whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent(body);
    $('share-sms').href = 'sms:?&body=' + encodeURIComponent(body);
    $('share-mail').href = 'mailto:?subject=' + encodeURIComponent(t('shareSubject')) + '&body=' + encodeURIComponent(body);
    $('share-dialog-status').textContent = '';
    dialogCtx = { url: url, onSent: onSent };
    var d = $('share-dialog');
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }

  function closeShareDialog() {
    dialogCtx = null;
    ['share-whatsapp', 'share-sms', 'share-mail'].forEach(function (id) { $(id).removeAttribute('href'); });
    $('share-dialog-status').textContent = '';
    var d = $('share-dialog');
    if (d.open) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); }
  }

  ['share-whatsapp', 'share-sms', 'share-mail'].forEach(function (id) {
    $(id).addEventListener('click', function () {
      if (!dialogCtx) return;
      leavingForApp = Date.now();
      $('share-dialog-status').textContent = t('shareDone');
      dialogCtx.onSent();
    });
  });

  $('copy-btn').addEventListener('click', function () {
    if (!dialogCtx) return;
    var ctx = dialogCtx;
    var done = function () { $('share-dialog-status').textContent = t('copied'); ctx.onSent(); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ctx.url).then(done, function () { if (legacyCopy(ctx.url)) done(); });
    } else if (legacyCopy(ctx.url)) {
      done();
    }
  });

  $('share-dialog-close').addEventListener('click', closeShareDialog);
  $('share-dialog').addEventListener('close', function () { dialogCtx = null; });

  // Reveal screen: share the link that is displayed. The participant is marked on "Hide".
  $('share-btn').addEventListener('click', function () {
    if (!draw || current < 0 || !revealUrl) return;
    share(current, revealUrl, function () { $('share-status').textContent = t('shareDone'); });
  });

  // Hand-out list: share a participant's link directly, then mark them as informed.
  function shareFromList(i) {
    if (!draw) return;
    if (draw.seen[i] && !confirm(t('confirmReshare', { name: draw.names[i] }))) return;
    var d = draw;
    share(i, linkFor(d.names[d.targets[i]]), function () {
      if (draw !== d) return; // the draw was cancelled meanwhile
      d.seen[i] = true;
      renderHandout();
    });
  }

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
    revealUrl = null;
    closeShareDialog();
    $('share-status').textContent = '';
    $('reveal-name').textContent = '';
    $('reveal-intro').textContent = '';
    $('qr').textContent = '';
    $('qr-link').textContent = '';
  }

  // Leaving the page loses the draw: ask first.
  window.addEventListener('beforeunload', function (e) {
    // Opening an sms:/mailto: link can fire beforeunload in some browsers: don't warn for that.
    if (Date.now() - leavingForApp < 2000) return;
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
