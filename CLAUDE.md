# CLAUDE.md

Project conventions and non-obvious constraints for this repo. Read before editing.

## Runtime and tooling

- **Pure vanilla JS, no build system, no bundler, no package.json.** Source files in `js/` load directly from `index.html` via `<script>` tags. Do not introduce npm, webpack, Vite, or TypeScript without discussion.
- **Chromium-only**: depends on the File System Access API. Firefox and Safari are unsupported — do not add polyfills or fallbacks for them.
- **Runs from `file://` and from `http://`**: `js/i18n.js` contains an `EMBEDDED_EN_FALLBACK` inline copy of `locales/en.json` because `fetch()` is blocked under `file://`. See i18n contract below.
- **Local dev**: `python -m http.server 8000` or `npx http-server -p 8000` in repo root.

## Cache-bust versioning

Every `<script>` and `<link>` in `index.html` uses a manual `?v=N` query param (e.g. `styles/main.css?v=40`, `js/i18n.js?v=12`). When you meaningfully change a file, **bump its `?v=` in `index.html`** so returning users don't see a stale cached copy. Many distinct version numbers are in flight at once — they're per-file, not global.

## Release / versioning

Release flow (do not do this unless asked):
1. Edit `version.json` (`version` + `released` date).
2. Bump `?v=` query params in `index.html` for every file that changed.
3. Commit as `Version YYYY.M.P` (see `git log` for format).
4. Push to `main` — the live site at teslacamviewer.com serves from the repo.

## i18n contract

- `locales/en.json` is the source of truth. 9 locales total: `en, de, es, fr, ja, ko, nl, no, zh`.
- **When you add, rename, or remove a key in `en.json`, update all 8 other locale files.** Missing keys in a locale silently fall back to English at runtime — catch drift at edit time, not release time.
- **Also update `EMBEDDED_EN_FALLBACK` in `js/i18n.js`**: it's a literal embedded copy of `en.json` used when loading from `file://`. Out-of-sync fallback → wrong strings in offline package.
- Pluralization: use `{one, other}` with `{{count}}` placeholder (see `bookmarks.bookmark` in `en.json`).
- Run `node .claude/scripts/check-locales.js` (or `/i18n-sync` skill) after any i18n change.

## ML models and binary assets

- `vendor/models/*.onnx` are checked-in binary artifacts (YOLO plate detection, NanoTrack, super-resolution, OCR). **Never `Write` (full overwrite) these files** — only replace via an explicit model-swap flow with shape verification.
- If you change model I/O, coordinate across the plate pipeline: `plateDetector.js` → `plateRecognizer.js` → `plateEnhancer.js` → `platePostProcessor.js` → `plateBlur.js`, plus `siameseTracker.js`, `regionTracker.js`, `paddleOCR.js`.

## Privacy invariant (product promise)

The README advertises "all processing happens locally — your video files never leave your computer." **No new code path may upload video frames, GPS, or timestamps to a remote server.** Network calls are allowed only for: map tiles (Leaflet/OSM), Street View, weather lookups, update check against `teslacamviewer.com`, CDN script loads. If you're adding a `fetch`, audit what's in the body.

## Testing

No automated test suite. For UI changes: start a local server, load the app in a Chromium browser, exercise the golden path (load a TeslaCam folder, scrub timeline, switch layouts, export a frame), and check for console errors. If you can't verify in-browser, say so — don't claim success from a passing `node -c` or type-check.

## File-size / structure notes

- `index.html` is ~62 KB — always use `Edit`, never `Write` (full rewrite), unless restructuring the whole page.
- `js/` modules are ~48 flat files with no subdirectories. Don't reorganize without a specific reason.
- CDN dependencies are pinned by version in `index.html`. Prefer upgrading one library at a time.
