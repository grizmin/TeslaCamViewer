---
name: i18n-sync
description: Audit and reconcile translation keys across all locale files in locales/. Use when adding, renaming, or removing UI strings, when a locale JSON is edited, or when the user explicitly asks to check i18n drift.
---

# i18n-sync

TeslaCamViewer ships with 9 locales: `en, de, es, fr, ja, ko, nl, no, zh`. `locales/en.json` is the source of truth. Missing keys in a non-English locale silently fall back to English at runtime — drift only shows up when a user switches languages. This skill surfaces drift explicitly and guides you through reconciling it.

There is also an `EMBEDDED_EN_FALLBACK` inline copy of `en.json` in `js/i18n.js` used under `file://` (where `fetch()` is blocked). It must stay in sync with `en.json`.

## When to run

- After editing `locales/en.json` (added/renamed/removed a key).
- After editing `locales/*.json` (any translation).
- After editing `js/i18n.js` (specifically `EMBEDDED_EN_FALLBACK`).
- Before cutting a release (belt-and-suspenders).

## How to run

From the repo root:

```bash
node .claude/scripts/check-locales.js
```

Exit code `0` = clean; `1` = drift found.

The script is also wired as a PostToolUse hook in `.claude/settings.json`, so it runs automatically when Claude edits locale files — but you can invoke it manually any time.

## Reading the output

Each drifted locale shows two lists:

- `missing (N)` — keys in `en.json` not present in this locale. **Fix these**: add the missing key with a translation (or copy the English string as a temporary placeholder). Missing keys silently fall back to English.
- `extra (N)` — keys in this locale not present in `en.json`. Either (a) the key was removed from `en.json` and not cleaned up elsewhere, or (b) it's intentional metadata like `_meta.language`. Remove stale keys; keep deliberate metadata.

The tail of the report also checks `EMBEDDED_EN_FALLBACK` in `js/i18n.js` against `en.json`. If those drift, the offline package will show wrong strings.

## Reconciliation workflow

1. Run `node .claude/scripts/check-locales.js`.
2. For each locale with `missing` keys:
   - Open `locales/<locale>.json`.
   - Add each missing key at the correct nested path.
   - Provide a translation. If you can't translate, copy the English value verbatim — this is better than a silent fallback because a native reviewer can later spot untranslated strings by grepping for English phrases.
3. For `extra` keys:
   - Confirm they're not intentional metadata (`_meta.*` is typical).
   - Remove stale keys.
4. If `EMBEDDED_EN_FALLBACK` drifted: copy the new `en.json` contents (as a JSON literal) over the inline object in `js/i18n.js`. Bump its `?v=` in `index.html`.
5. Re-run the script until it prints `OK — all locales aligned with en.json`.

## Pluralization and interpolation

- Plural keys use `{one, other}` nested under a key (e.g. `bookmarks.bookmark.one`, `bookmarks.bookmark.other`).
- Placeholders use `{{name}}` (e.g. `"Exporting {{percent}}%"`). Preserve placeholders exactly when translating.

## Don'ts

- Don't reorder top-level sections in `en.json` just to "clean up" — it creates a noisy diff across 9 files and the embedded fallback for no benefit.
- Don't introduce a new locale without also adding it to `I18n.supportedLocales` in `js/i18n.js`.
- Don't machine-translate the entire file silently; at minimum flag machine-translated sections with a PR note so a native speaker can review.
