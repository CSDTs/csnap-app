#!/usr/bin/env node
'use strict';

// check-upgrade.js — CLI entry for the Snap!-upgrade compatibility checker.
//
//   check-upgrade.js                      self-check vs vendored snap/ tree
//   check-upgrade.js --against <ref>       pre-upgrade drift report vs a ref
//   check-upgrade.js --write-known-custom  (re)bootstrap the custom allowlist
//
// Wiring / ordering / exit-code mapping live here; lib/drift.js owns the
// classification + drift logic (one implementation for both modes) and
// lib/report.js renders. See README.md for the Finding / ctx contracts.

const fs = require('fs');
const path = require('path');
const { extractCsnapOverrides } = require('./lib/extract-overrides');
const { extractUpstreamAt } = require('./lib/extract-upstream');
const createGit = require('./lib/git');
const drift = require('./lib/drift');
const mergeAssist = require('./lib/merge-assist');
const tutorialsScan = require('./lib/tutorials-scan');
const indexHtmlCheck = require('./lib/index-html-check');
const librariesCheck = require('./lib/libraries-check');
const similarity = require('./lib/similarity');
const report = require('./lib/report');

// Kinds that are not real override keys and must be skipped when classifying.
const NON_OVERRIDE_KINDS = new Set(['prototype-chain', 'top-var']);

const KNOWN_CUSTOM_PATH = path.join(__dirname, 'known-custom.json');

// --- arg parsing ----------------------------------------------------------

function parseArgs(argv) {
  const args = {
    against: null,
    writeKnownCustom: false,
    deepTutorials: false,
    repo: path.resolve(__dirname, '../..'),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--against') {
      args.against = argv[++i];
      if (!args.against) throw new Error('--against requires a ref');
    } else if (a === '--write-known-custom') {
      args.writeKnownCustom = true;
    } else if (a === '--deep-tutorials') {
      args.deepTutorials = true;
    } else if (a === '--repo') {
      args.repo = path.resolve(argv[++i]);
    } else {
      throw new Error(`unknown argument: ${a}`);
    }
  }
  return args;
}

// --- known-custom.json ----------------------------------------------------

function loadKnownCustom() {
  if (!fs.existsSync(KNOWN_CUSTOM_PATH)) return { entries: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(KNOWN_CUSTOM_PATH, 'utf8'));
    if (!parsed.entries) parsed.entries = {};
    return parsed;
  } catch (err) {
    throw new Error(`could not parse known-custom.json: ${err.message}`);
  }
}

function hasEntry(knownCustom, key) {
  return Object.prototype.hasOwnProperty.call(knownCustom.entries, key);
}

// Split a camelCase / snake identifier into lowercased keyword tokens,
// dropping tokens of 1-2 chars. `setScaleGlide` -> ['set','scale','glide'].
function keywordsFor(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2);
}

// --- report dir -----------------------------------------------------------

function timestamp(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}`
  );
}

function makeReportDir(repoRoot, slug) {
  const dir = path.join(
    repoRoot,
    'upgrade-reports',
    `${timestamp(new Date())}-${slug}`
  );
  fs.mkdirSync(path.join(dir, 'diffs', 'methods'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'merged'), { recursive: true });
  return dir;
}

// --- context --------------------------------------------------------------

function buildContext(args) {
  const repoRoot = args.repo;
  const overrides = extractCsnapOverrides(repoRoot);
  const knownCustom = loadKnownCustom();

  if (args.against) {
    return buildAgainstContext(args, repoRoot, overrides, knownCustom);
  }

  // 'check' mode — no git / no fetch / no vendored-sha detection required, so
  // it works even without the `snap` remote configured. Upstream index is the
  // working-tree snap/src/.
  const upstreamCurrent = extractUpstreamAt(null, null, repoRoot);
  const reportDir = makeReportDir(repoRoot, 'selfcheck');
  return {
    repoRoot,
    mode: 'check',
    overrides,
    knownCustom,
    upstreamCurrent,
    currentSha: null,
    currentShaVerified: true,
    deepTutorials: args.deepTutorials,
    reportDir,
  };
}

function buildAgainstContext(args, repoRoot, overrides, knownCustom) {
  const git = createGit(repoRoot);

  try {
    git.fetchSnap();
  } catch (err) {
    console.warn(`WARNING: fetch failed, using existing local refs (${err.message})`);
  }

  const detected = git.detectVendoredSha();
  if (!detected.verified) {
    console.warn(
      'WARNING: the currently vendored snap/ tree does NOT match the detected ' +
        `upstream sha ${detected.sha.slice(0, 10)} — drift results are approximate.`
    );
  }

  const target = git.resolveTargetRef(args.against);

  const upstreamCurrent = extractUpstreamAt(git, detected.sha, repoRoot);
  const upstreamTarget = extractUpstreamAt(git, target.sha, repoRoot);

  const refslug = target.refName.replace(/\//g, '-');
  const reportDir = makeReportDir(repoRoot, refslug);

  return {
    repoRoot,
    mode: 'against',
    git,
    overrides,
    knownCustom,
    upstreamCurrent,
    upstreamTarget,
    currentSha: detected.sha,
    currentShaVerified: detected.verified,
    targetSha: target.sha,
    targetRefName: target.refName,
    deepTutorials: args.deepTutorials,
    reportDir,
  };
}

// --- exit code ------------------------------------------------------------

function exitCodeFor(findings) {
  if (findings.some((f) => f.severity === 'error')) return 1;
  if (findings.some((f) => f.severity === 'warning')) return 2;
  return 0;
}

// --- known-custom bootstrap ----------------------------------------------

function writeKnownCustom(ctx) {
  const knownCustom = ctx.knownCustom;
  const entries = knownCustom.entries;
  const upstreamKeys = ctx.upstreamCurrent.byKey;

  // Every csnap override key with no upstream counterpart — INCLUDING all of
  // tutorials.js (it is entirely custom).
  const customKeys = new Set();
  for (const res of Object.values(ctx.overrides.files)) {
    for (const def of res.definitions) {
      if (NON_OVERRIDE_KINDS.has(def.kind)) continue;
      if (upstreamKeys.has(def.key)) continue;
      customKeys.add(def.key);
    }
  }

  let added = 0;
  for (const key of customKeys) {
    if (hasEntry(knownCustom, key)) continue; // preserve hand-edited entries
    const prop = key.includes('.') ? key.split('.').pop() : key;
    entries[key] = {
      note: 'auto-bootstrapped',
      feature: null,
      keywords: keywordsFor(prop),
    };
    added++;
  }

  // Prune report: existing entries whose key now EXISTS upstream (a possible
  // NEW-UPSTREAM-COLLISION). We only warn — never delete hand-curated data.
  const collisions = [];
  for (const key of Object.keys(entries)) {
    if (upstreamKeys.has(key)) collisions.push(key);
  }

  // Serialise with sorted keys, 2-space indent, trailing newline.
  const sortedEntries = {};
  for (const key of Object.keys(entries).sort()) {
    sortedEntries[key] = entries[key];
  }
  const out = { ...knownCustom, entries: sortedEntries };
  fs.writeFileSync(KNOWN_CUSTOM_PATH, JSON.stringify(out, null, 2) + '\n');

  return { added, total: Object.keys(sortedEntries).length, collisions };
}

// --- main -----------------------------------------------------------------

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // --write-known-custom stays on the working-tree path (no git needed).
  if (args.writeKnownCustom) {
    const repoRoot = args.repo;
    const ctx = {
      repoRoot,
      mode: 'check',
      overrides: extractCsnapOverrides(repoRoot),
      knownCustom: loadKnownCustom(),
      upstreamCurrent: extractUpstreamAt(null, null, repoRoot),
    };
    const result = writeKnownCustom(ctx);
    console.log(
      `known-custom.json: added ${result.added} entr${
        result.added === 1 ? 'y' : 'ies'
      }, ${result.total} total.`
    );
    if (result.collisions.length) {
      console.log('');
      console.log(
        `WARNING: ${result.collisions.length} known-custom entr${
          result.collisions.length === 1 ? 'y' : 'ies'
        } now exist upstream (possible NEW-UPSTREAM-COLLISION):`
      );
      for (const key of result.collisions) console.log(`  ${key}`);
    }
    process.exit(0);
  }

  let ctx;
  try {
    ctx = buildContext(args);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // Module contract allows run(ctx) to be sync or async; await both kinds.
  const findings = await drift.run(ctx);
  if (ctx.mode === 'against') {
    findings.push(...(await mergeAssist.run(ctx)));
  }
  findings.push(...(await tutorialsScan.run(ctx)));
  findings.push(...(await indexHtmlCheck.run(ctx)));
  findings.push(...(await librariesCheck.run(ctx))); // no-op in 'check' mode
  findings.push(...(await similarity.run(ctx))); // no-op in 'check' mode
  report.writeReport(ctx, findings);
  report.printConsole(ctx, findings);

  const code = exitCodeFor(findings);
  console.log(
    `exit ${code} (${
      code === 0 ? 'clean/info-only' : code === 2 ? 'warnings only' : 'errors'
    })`
  );
  process.exit(code);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}

module.exports = { parseArgs, buildContext, exitCodeFor, writeKnownCustom };
