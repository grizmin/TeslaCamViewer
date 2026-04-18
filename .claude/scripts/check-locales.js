#!/usr/bin/env node
/**
 * Locale drift checker for TeslaCamViewer.
 *
 * - en.json is the source of truth.
 * - Reports missing keys (present in en, absent in locale) and extra keys (vice versa) per locale.
 * - Also checks whether EMBEDDED_EN_FALLBACK in js/i18n.js has the same top-level shape as en.json.
 *
 * Exit code 0 = clean, 1 = drift found. Hook usage: non-zero exit is logged but won't block by default.
 *
 * Invoked by PostToolUse hook only when the edited file is a locale JSON or js/i18n.js; see .claude/settings.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LOCALES_DIR = path.join(ROOT, 'locales');
const SOURCE = 'en.json';

function flatten(obj, prefix = '', out = new Set()) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    out.add(prefix);
    return out;
  }
  for (const k of Object.keys(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    flatten(obj[k], next, out);
  }
  return out;
}

function loadJson(file) {
  const raw = fs.readFileSync(file, 'utf8');
  try { return JSON.parse(raw); }
  catch (e) { throw new Error(`${path.basename(file)} is not valid JSON: ${e.message}`); }
}

function main() {
  const sourcePath = path.join(LOCALES_DIR, SOURCE);
  if (!fs.existsSync(sourcePath)) {
    console.error(`[check-locales] source not found: ${sourcePath}`);
    process.exit(1);
  }

  const en = loadJson(sourcePath);
  const enKeys = flatten(en);

  const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json') && f !== SOURCE);
  let drifted = false;

  for (const file of files) {
    const data = loadJson(path.join(LOCALES_DIR, file));
    const keys = flatten(data);
    const missing = [...enKeys].filter(k => !keys.has(k));
    const extra = [...keys].filter(k => !enKeys.has(k));

    if (missing.length || extra.length) {
      drifted = true;
      console.log(`\n[${file}]`);
      if (missing.length) {
        console.log(`  missing (${missing.length}):`);
        for (const k of missing.slice(0, 20)) console.log(`    - ${k}`);
        if (missing.length > 20) console.log(`    ... and ${missing.length - 20} more`);
      }
      if (extra.length) {
        console.log(`  extra (${extra.length}):`);
        for (const k of extra.slice(0, 20)) console.log(`    + ${k}`);
        if (extra.length > 20) console.log(`    ... and ${extra.length - 20} more`);
      }
    }
  }

  // Soft-check: EMBEDDED_EN_FALLBACK in js/i18n.js should exist and parse.
  const i18nPath = path.join(ROOT, 'js', 'i18n.js');
  if (fs.existsSync(i18nPath)) {
    const src = fs.readFileSync(i18nPath, 'utf8');
    const m = src.match(/EMBEDDED_EN_FALLBACK\s*=\s*(\{[\s\S]*?\});/);
    if (!m) {
      console.log('\n[js/i18n.js] WARNING: EMBEDDED_EN_FALLBACK not found — parser may need updating.');
    } else {
      try {
        const fallback = JSON.parse(m[1]);
        const fallbackKeys = flatten(fallback);
        const fMissing = [...enKeys].filter(k => !fallbackKeys.has(k));
        const fExtra = [...fallbackKeys].filter(k => !enKeys.has(k));
        if (fMissing.length || fExtra.length) {
          drifted = true;
          console.log('\n[js/i18n.js EMBEDDED_EN_FALLBACK]');
          if (fMissing.length) console.log(`  missing vs en.json (${fMissing.length}): ${fMissing.slice(0, 5).join(', ')}${fMissing.length > 5 ? ' …' : ''}`);
          if (fExtra.length) console.log(`  extra vs en.json (${fExtra.length}): ${fExtra.slice(0, 5).join(', ')}${fExtra.length > 5 ? ' …' : ''}`);
          console.log('  (EMBEDDED_EN_FALLBACK is used when app loads from file:// — keep in sync with en.json)');
        }
      } catch (e) {
        console.log(`\n[js/i18n.js] WARNING: EMBEDDED_EN_FALLBACK did not parse as JSON: ${e.message}`);
      }
    }
  }

  if (!drifted) {
    console.log('[check-locales] OK — all locales aligned with en.json');
    process.exit(0);
  }
  console.log('\n[check-locales] drift found. Fix before release.');
  process.exit(1);
}

main();
