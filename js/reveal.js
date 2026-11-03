/* Random Team - participant page (r.html#<code>): decodes the code from the URL fragment.
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

  function init() {
    var code = location.hash.replace(/^#/, '');
    name = null;
    $('name').textContent = '';
    if (!code) return fail('phoneNoCode');
    try {
      name = window.RandomTeam.decode(code);
    } catch (e) {
      return fail('phoneInvalid');
    }
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

  window.I18n.init();
  window.addEventListener('hashchange', init);
  init();
})();
