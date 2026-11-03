# Random Team

A small static web app that secretly pairs every person in a list with someone else. Use it for a
Secret Santa, gift exchanges, "secret friend" games and similar.

- **One direction:** A → B doesn't mean B → A.
- **Unique:** each person is drawn by exactly one other person.
- **Covers everyone:** everyone gives to someone and is drawn by someone. Nobody draws themself.
- **Random:** the pairing is drawn uniformly at random with `crypto.getRandomValues`. A → B and B → A
  can both happen by chance, unless you pick the *single loop* option.
- **Secret:** one operator runs the app, but only the participant sees their pair.

There is no server, no database and no tracking. The name list and the options are saved in the
operator's browser (`localStorage`). The pairing itself is kept **only in memory** and is lost when the
page is closed or reloaded.

## How it works

1. **Enter the names.** The operator types them one by one; pasting a list also works. Duplicates are
   rejected. The list stays on the device for next time.
2. **Start the draw.** The app pairs everyone and shows one button per participant. Nobody sees the
   pairs at this point.
3. **Inform each person.** The operator taps a name and hands the device to that person. The person
   taps *"I'm X — show my pair"*, reads the result, then taps *Hide & hand back*. That person is then
   marked as informed. Showing a pair again takes an extra confirmation.
4. Once everyone has been informed, tap **Finish**. The pairing is erased.

### Two ways to show the pair (toggle on the setup screen)

| Mode | What the participant sees | Pros | Cons |
|---|---|---|---|
| **On this screen** (default) | The name, in large type, on the operator's device | Simple, works offline, no phone needed | The participant must remember it |
| **QR code / link** | A QR code (and the link under it) that they scan with their own phone | The participant keeps the result on their phone and can open it again later | Needs the app to be hosted (not opened as a local file) and a phone with a camera |

In QR mode the link looks like `…/r.html?lang=en#<code of the drawn name>.<code of the recipient>`:

- **The recipient part** lets the page greet the participant: "Hello Bob! This link is meant for Bob. If
  that's not you, don't go any further and let the organiser know." Someone who gets the wrong link
  notices it before revealing anything. It's a message only, with no check behind it. Links without
  this part still work; they just don't show the greeting.
- The code goes **after the `#`**, so the browser never sends it to the web server.
- Every code is **exactly 64 characters**, whatever the name's length, so its length gives nothing
  away.
- The same name gives a **different code every time** because of a random nonce and random padding.
- A **check byte** rejects codes that are mistyped or changed.
- **Decoding is deterministic:** a code depends only on the name, never on the draw, so a link
  always shows the same name, even after later draws. Frozen test fixtures make sure future changes
  keep old links working.
- This is **obfuscation, not encryption.** Anyone who reads `js/core.js` can decode a code. It only
  stops someone from reading the name at a glance.

Names are limited to 42 bytes of UTF-8, which is about 42 Latin letters or fewer accented or non-Latin
characters, so they fit in the fixed-size code.

### Sending the link instead (QR / link mode)

The QR screen also has a **Share link…** button, for people who aren't there in person:

- **On a phone,** it opens the system share sheet, so the operator can send the link with WhatsApp,
  SMS, e-mail, Signal or any other app on the device. This uses the browser's built-in
  [Web Share](https://developer.mozilla.org/docs/Web/API/Navigator/share) feature; there's no API,
  account or server.
- **Where Web Share isn't available** (e.g. Firefox on desktop), the button shows plain **WhatsApp**
  (`wa.me`), **SMS** (`sms:`) and **E-mail** (`mailto:`) links, plus **Copy link**.

In QR / link mode, each name in the hand-out list also gets a **share icon**. It sends that
person's link straight away, without going through the "I'm X — show my pair" screen, and marks them as
informed once the link has been handed to an app. Sending the link again asks for confirmation first.

The message only contains the recipient's name (for example "Hi Alice, here is your draw…") and the
encoded link, never the name they drew. Messaging apps that build link previews never see the code,
because it sits after the `#`.

### Pairing styles (More options)

- **Fully random** (default): a uniformly random *derangement*. Every valid pairing is equally likely,
  mutual pairs included.
- **Single loop**: everyone forms one chain, A → B → C → … → A. There are no mutual pairs and no small
  separate groups.

### Language (English / French)

An **EN | FR** switch sits at the top of the setup screen. The participant page has one too.

- **First visit:** the language follows the browser (French browsers start in French). After that the
  last choice is kept on the device.
- **QR links:** they carry the operator's language as `?lang=fr` or `?lang=en`, so each participant's
  phone opens in the same language. The language isn't secret: only the code after `#` is.
- **Codes don't depend on the language:** the same code decodes to the same name, whatever the
  language.
- **Adding a language:** add a dictionary to `js/i18n.js`. A test checks that every language has the
  same keys.

## Hosting on GitHub Pages

The app is plain HTML, CSS and JavaScript, with no build step. The workflow
`.github/workflows/pages.yml` runs the tests on every push and pull request. When the push is on the
repository's **default branch**, it also publishes the app files to GitHub Pages. This needs
*Settings → Pages → Source: GitHub Actions*.

Dependabot (`.github/dependabot.yml`) checks the GitHub Actions versions every week. The
`.github/workflows/dependabot-automerge.yml` workflow turns on auto-merge for its **minor and patch**
updates. Major updates are left for manual review. To make auto-merge wait for the tests, mark the
`test` check as required in the branch ruleset for `main`.

The app is served at `https://<owner>.github.io/<repo>/`.

To run it locally, open `index.html` directly, or serve the folder with
`python3 -m http.server` and open <http://localhost:8000>. QR mode needs a URL that the phones can
reach.

## Development

```
node --test      # unit tests for the pairing and the codec (Node 18+)
```

| File | Role |
|---|---|
| `index.html`, `js/app.js` | Operator app: list, draw, hand-out |
| `r.html`, `js/reveal.js` | Participant page for QR mode, decodes `#<code>` |
| `js/i18n.js` | English and French UI text, language detection and switch |
| `js/core.js` | Pairing and codec, no DOM; used by both pages and by the tests |
| `css/style.css` | Styles, with light and dark themes |
| `vendor/qrcode.js` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (MIT), vendored |
| `tests/*.test.js` | Tests |
