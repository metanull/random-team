/* Random Team - participant page (r.html#<code>[.<recipient code>]): decodes the URL fragment.
 * The fragment (after #) is never sent to the web server, so the code stays on the phone. */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function state(which) {
    ['ready', 'shown', 'error'].forEach(function (s) { $('state-' + s).hidden = s !== which; });
  }

  function fail(key) {
    $('error-msg').setAttribute('data-i18n', key);
    $('error-msg').textContent = window.I18n.t(key);
    state('error');
  }

  var name = null;
  var recipient = null;

  // "Hello <recipient>": lets someone who received the wrong link notice it before revealing.
  function renderHello() {
    $('hello').hidden = !recipient;
    $('hello-title').textContent = recipient ? window.I18n.t('phoneHello', { name: recipient }) : '';
    $('hello-check').textContent = recipient ? window.I18n.t('phoneWrongPerson', { name: recipient }) : '';
  }

  function init() {
    var code = location.hash.replace(/^#/, '');
    name = null;
    recipient = null;
    $('name').textContent = '';
    renderHello();
    if (!code) return fail('phoneNoCode');
    try {
      var link = window.RandomTeam.decodeLink(code);
      name = link.name;
      recipient = link.recipient;
    } catch (e) {
      return fail('phoneInvalid');
    }
    renderHello();
    state('ready');
  }

  $('reveal-btn').addEventListener('click', function () {
    if (!name) return;
    $('name').textContent = name;
    state('shown');
  });

  $('hide-btn').addEventListener('click', function () {
    $('name').textContent = '';
    state('ready');
  });

  window.I18n.init(renderHello);
  window.addEventListener('hashchange', init);
  init();
})();
