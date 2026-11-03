/*
 * Random Team - UI translations (English / French).
 *
 * In HTML:  data-i18n="key" (text), data-i18n-placeholder="key", data-i18n-aria-label="key".
 * In JS:    I18n.t('key', { name: 'Alice' })  ->  "{name}" placeholders are replaced.
 * Language: ?lang=xx in the URL, else the saved choice, else the browser language, else English.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.I18n = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STORE_KEY = 'random-team.lang';
  var LANGS = ['en', 'fr'];

  var messages = {
    en: {
      langLabel: 'Language',
      tagline: 'Secretly pair everyone in a list with someone else.',
      nameLabel: 'Name',
      addPlaceholder: 'Add a name…',
      add: 'Add',
      count: function (p) { return p.n === 1 ? '1 participant' : p.n + ' participants'; },
      clearList: 'Clear list',
      emptyHint: 'Type a name and press Enter. You can also paste several names separated by new lines or commas. The list is kept on this device.',
      revealLegend: 'How participants see their pair',
      revealScreen: 'On this screen',
      revealQr: 'QR code / link',
      revealHelpScreen: 'Each participant taps to show the name on this device, then taps again to hide it.',
      revealHelpQr: 'Each participant scans a QR code and reads the name on their own phone. They can open the link again later.',
      fileWarning: 'This page is opened from a local file: phones won\'t be able to open the QR links. Use the hosted version (GitHub Pages) for the QR mode.',
      moreOptions: 'More options',
      modeLegend: 'Pairing style',
      modeAny: 'Fully random (A→B and B→A may happen)',
      modeLoop: 'Single loop (A→B→C→…→A, no mutual pairs)',
      start: 'Start the draw',
      hintMin: 'Add at least 2 names.',
      hintTwo: 'With only 2 people, each one can guess the other\'s pair.',
      errTooLong: '“{name}” is too long.',
      errDuplicate: '“{name}” is already in the list.',
      remove: 'Remove {name}',
      confirmClear: 'Remove all {n} names from the list?',

      handoutTitle: 'Draw done',
      handoutHelp: 'Pick the next participant, then hand them the device.',
      progress: '{done} / {total} informed',
      statusWaiting: 'waiting',
      statusSeen: '✓ informed',
      allDone: 'Everyone has been informed.',
      volatileNote: 'The pairing only exists in this page\'s memory: it is lost when you leave or reload.',
      finish: 'Finish',
      cancelDraw: 'Cancel the draw',
      confirmReshow: '{name} has already seen their pair.\nShow it again?',
      confirmCancel: 'Cancel this draw? The pairing will be lost; a new draw will give different pairs.',

      handoverTo: 'Hand the device to',
      handoverPrivacy: 'Make sure nobody else can see the screen.',
      showBtn: 'I\'m {name} — show my pair',
      notMe: 'Not me — go back',
      revealIntro: '{name}, you are paired with',
      qrAlt: 'QR code',
      scanHelp: 'Scan it with your phone to see the name there.',
      noCamera: 'No camera? Open this link:',
      hideBtn: 'Hide & hand back',

      phonePrivacy: 'Make sure nobody else can see your screen.',
      phoneShow: 'Show my pair',
      phoneIntro: 'You are paired with',
      phoneHide: 'Hide',
      phoneKeep: 'Keep this link to see it again later.',
      phoneNoCode: 'This page shows the name you were paired with. Open it by scanning the QR code shown by the organiser.',
      phoneInvalid: 'This link is invalid or incomplete. Ask the organiser to show the QR code again.'
    },

    fr: {
      langLabel: 'Langue',
      tagline: 'Associez secrètement chaque personne d\'une liste à une autre.',
      nameLabel: 'Nom',
      addPlaceholder: 'Ajouter un nom…',
      add: 'Ajouter',
      count: function (p) { return p.n <= 1 ? p.n + ' participant' : p.n + ' participants'; },
      clearList: 'Vider la liste',
      emptyHint: 'Saisissez un nom et appuyez sur Entrée. Vous pouvez aussi coller plusieurs noms séparés par des retours à la ligne ou des virgules. La liste est conservée sur cet appareil.',
      revealLegend: 'Comment chacun découvre son tirage',
      revealScreen: 'Sur cet écran',
      revealQr: 'QR code / lien',
      revealHelpScreen: 'Chaque participant touche l\'écran pour afficher le nom sur cet appareil, puis touche à nouveau pour le masquer.',
      revealHelpQr: 'Chaque participant scanne un QR code et lit le nom sur son propre téléphone. Il peut rouvrir le lien plus tard.',
      fileWarning: 'Cette page est ouverte depuis un fichier local : les téléphones ne pourront pas ouvrir les liens des QR codes. Utilisez la version hébergée (GitHub Pages) pour le mode QR.',
      moreOptions: 'Plus d\'options',
      modeLegend: 'Type de tirage',
      modeAny: 'Entièrement aléatoire (A→B et B→A possibles)',
      modeLoop: 'Boucle unique (A→B→C→…→A, jamais de paire réciproque)',
      start: 'Lancer le tirage',
      hintMin: 'Ajoutez au moins 2 noms.',
      hintTwo: 'Avec seulement 2 personnes, chacune peut deviner le tirage de l\'autre.',
      errTooLong: '« {name} » est trop long.',
      errDuplicate: '« {name} » est déjà dans la liste.',
      remove: 'Retirer {name}',
      confirmClear: 'Retirer les {n} noms de la liste ?',

      handoutTitle: 'Tirage effectué',
      handoutHelp: 'Choisissez le participant suivant, puis donnez-lui l\'appareil.',
      progress: '{done} / {total} informés',
      statusWaiting: 'en attente',
      statusSeen: '✓ informé',
      allDone: 'Tout le monde a été informé.',
      volatileNote: 'Le tirage n\'existe que dans la mémoire de cette page : il est perdu si vous la quittez ou la rechargez.',
      finish: 'Terminer',
      cancelDraw: 'Annuler le tirage',
      confirmReshow: '{name} a déjà vu son tirage.\nL\'afficher à nouveau ?',
      confirmCancel: 'Annuler ce tirage ? Il sera perdu ; un nouveau tirage donnera d\'autres résultats.',

      handoverTo: 'Donnez l\'appareil à',
      handoverPrivacy: 'Assurez-vous que personne d\'autre ne voit l\'écran.',
      showBtn: 'Je suis {name} — afficher mon tirage',
      notMe: 'Ce n\'est pas moi — retour',
      revealIntro: '{name}, vous avez tiré',
      qrAlt: 'QR code',
      scanHelp: 'Scannez-le avec votre téléphone pour y voir le nom.',
      noCamera: 'Pas d\'appareil photo ? Ouvrez ce lien :',
      hideBtn: 'Masquer et rendre l\'appareil',

      phonePrivacy: 'Assurez-vous que personne d\'autre ne voit votre écran.',
      phoneShow: 'Afficher mon tirage',
      phoneIntro: 'Vous avez tiré',
      phoneHide: 'Masquer',
      phoneKeep: 'Gardez ce lien pour le revoir plus tard.',
      phoneNoCode: 'Cette page affiche le nom que vous avez tiré. Ouvrez-la en scannant le QR code présenté par l\'organisateur.',
      phoneInvalid: 'Ce lien est invalide ou incomplet. Demandez à l\'organisateur d\'afficher à nouveau le QR code.'
    }
  };

  function supported(l) {
    l = String(l || '').toLowerCase().slice(0, 2);
    return LANGS.indexOf(l) >= 0 ? l : null;
  }

  function detect() {
    var fromUrl = null, saved = null, browser = null;
    try { fromUrl = new URLSearchParams(location.search).get('lang'); } catch (e) { /* ignore */ }
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* ignore */ }
    try { browser = navigator.language; } catch (e) { /* ignore */ }
    return supported(fromUrl) || supported(saved) || supported(browser) || 'en';
  }

  var lang = typeof location !== 'undefined' ? detect() : 'en';

  function t(key, params) {
    var m = messages[lang][key];
    if (m == null) m = messages.en[key];
    if (m == null) return key;
    if (typeof m === 'function') return m(params || {});
    return !params ? m : m.replace(/\{(\w+)\}/g, function (all, k) {
      return params[k] != null ? String(params[k]) : all;
    });
  }

  /** Translate every element carrying data-i18n* attributes under `scope`. */
  function apply(scope) {
    scope = scope || document;
    document.documentElement.lang = lang;
    scope.querySelectorAll('[data-i18n]').forEach(function (e) { e.textContent = t(e.getAttribute('data-i18n')); });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (e) { e.placeholder = t(e.getAttribute('data-i18n-placeholder')); });
    scope.querySelectorAll('[data-i18n-aria-label]').forEach(function (e) { e.setAttribute('aria-label', t(e.getAttribute('data-i18n-aria-label'))); });
    scope.querySelectorAll('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
  }

  var listeners = [];

  function setLang(l) {
    l = supported(l);
    if (!l) return;
    lang = l;
    try { localStorage.setItem(STORE_KEY, l); } catch (e) { /* ignore */ }
    apply();
    listeners.forEach(function (fn) { fn(lang); });
  }

  /** Wire up language buttons ([data-lang]) and translate the page. */
  function init(onChange) {
    if (onChange) listeners.push(onChange);
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
    });
    apply();
  }

  return {
    LANGS: LANGS,
    messages: messages,
    t: t,
    apply: apply,
    init: init,
    setLang: setLang,
    getLang: function () { return lang; }
  };
});
