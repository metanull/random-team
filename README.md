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

### Two ways to show the pair (Options)

| Mode | What the participant sees | Pros | Cons |
|---|---|---|---|
| **On this screen** (default) | The name, in large type, on the operator's device | Simple, works offline, no phone needed | The participant must remember it |
| **QR code / link** | A QR code (and the link under it) that they scan with their own phone | The participant keeps the result on their phone and can open it again later | Needs the app to be hosted (not opened as a local file) and a phone with a camera |

In QR mode the link looks like `…/r.html#<64-character code>`:

- The code goes **after the `#`**, so the browser never sends it to the web server.
- Every code is **exactly 64 characters**, whatever the name's length, so its length gives nothing
  away.
- The same name gives a **different code every time** because of a random nonce and random padding.
- A **check byte** rejects codes that are mistyped or changed.
- This is **obfuscation, not encryption.** Anyone who reads `js/core.js` can decode a code. It only
  stops someone from reading the name at a glance.

Names are limited to 42 bytes of UTF-8, which is about 42 Latin letters or fewer accented or non-Latin
characters, so they fit in the fixed-size code.

### Pairing styles (Options)

- **Fully random** (default): a uniformly random *derangement*. Every valid pairing is equally likely,
  mutual pairs included.
- **Single loop**: everyone forms one chain, A → B → C → … → A. There are no mutual pairs and no small
  separate groups.

## Hosting on GitHub Pages

The app is plain HTML, CSS and JavaScript, with no build step:

1. In the repository, open **Settings → Pages**.
2. Under *Build and deployment*, set **Source: Deploy from a branch**.
3. Pick the branch, e.g. `main`, and the folder **`/ (root)`**.

The app is then served at `https://<owner>.github.io/<repo>/`. The `.nojekyll` file makes GitHub serve
the files as they are.

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
| `js/core.js` | Pairing and codec, no DOM; used by both pages and by the tests |
| `css/style.css` | Styles, with light and dark themes |
| `vendor/qrcode.js` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (MIT), vendored |
| `tests/core.test.js` | Tests |
