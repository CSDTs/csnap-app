'use strict';

// Feature-similarity detection for upgrade-check. Plain CommonJS.
//
// Catches the case where upstream Snap! ships something CONCEPTUALLY similar
// to a feature CSnap already built on its own (e.g. CSnap's tutorial mode vs.
// an upstream onboarding feature). This is a soft, keyword-based heuristic —
// it is meant to flag "go compare these by hand", not to auto-classify.
//
// OUR inventory comes from known-custom.json (lib/extract-overrides.js /
// check-upgrade.js already classify which csnap/*.js keys have no upstream
// counterpart; known-custom.json is the curated allowlist + keyword index for
// those keys). THEIR inventory is: new HISTORY.md lines, new upstream symbol
// keys, and new upstream src/*.js files between currentSha and targetSha.
//
// Only meaningful in 'against' mode (need a target to diff against); 'check'
// mode returns no findings.

const fs = require('fs');
const path = require('path');

// Generic words that would otherwise cause noisy cross-matches (e.g. every
// "get"/"set" accessor colliding with every other one). Filtered out of both
// OUR keyword groups and THEIR item tokens before matching.
const STOPWORDS = new Set([
  'original', 'init', 'get', 'set', 'change', 'new', 'old', 'item', 'items',
  'data', 'list', 'load', 'save', 'file', 'files', 'update', 'create',
  'make', 'draw', 'show', 'hide', 'name', 'value', 'type', 'text', 'image',
  'project', 'cloud', 'url', 'snap', 'csnap', 'morph', 'menu', 'dialog',
  'button', 'size', 'color', 'state', 'helper', 'helpers', 'util', 'utils',
  'via', 'the', 'and', 'for',
  // Snap!-domain ubiquitous vocabulary — matching on these is pure noise in a
  // blocks-programming codebase (nearly every changelog entry mentions them).
  'block', 'blocks', 'primitive', 'primitives', 'sprite', 'sprites', 'stage',
  'costume', 'costumes', 'sound', 'sounds', 'palette', 'category',
  'categories', 'script', 'scripts', 'mode', 'display', 'toggle', 'enable',
  'disable', 'report', 'process', 'variable', 'variables', 'library',
  'libraries',
]);

const NON_OVERRIDE_KINDS = new Set(['prototype-chain', 'top-var']);

const MAX_FINDINGS = 20;
const MAX_DETAIL_ITEMS = 8;

// --- OUR inventory ----------------------------------------------------------

function addKeyword(set, raw) {
  const kw = String(raw || '').toLowerCase().trim();
  if (!kw) return;
  if (STOPWORDS.has(kw)) return;
  set.add(kw);
}

// Build feature groups from known-custom.json. Entries sharing a non-null
// `feature` field are merged into one group; entries with feature === null
// each stand alone, keyed by their own override key. Groups whose keyword
// set ends up empty (all stopwords, or no keywords at all) are dropped.
function buildGroups(knownCustom) {
  const entries = (knownCustom && knownCustom.entries) || {};
  const byFeature = new Map(); // feature -> { label, keys: Set, keywords: Set }
  const standalone = [];

  for (const key of Object.keys(entries)) {
    const entry = entries[key] || {};
    const feature = entry.feature;
    const rawKeywords = Array.isArray(entry.keywords) ? entry.keywords : [];

    if (feature) {
      if (!byFeature.has(feature)) {
        byFeature.set(feature, { label: feature, keys: new Set(), keywords: new Set() });
      }
      const group = byFeature.get(feature);
      group.keys.add(key);
      for (const kw of rawKeywords) addKeyword(group.keywords, kw);
    } else {
      const keywords = new Set();
      for (const kw of rawKeywords) addKeyword(keywords, kw);
      standalone.push({ label: key, keys: new Set([key]), keywords, curated: false });
    }
  }

  const groups = [...standalone, ...byFeature.values()].map((g) => ({
    label: g.label,
    keys: Array.from(g.keys).sort(),
    keywords: g.keywords,
    // Hand-curated feature groups earn the sensitive 1-keyword match rule;
    // auto-bootstrapped singletons need >=2 distinct keyword hits (see
    // matchGroupToTokens) or they drown the report in coincidences.
    curated: g.curated !== false,
  }));

  return groups.filter((g) => g.keywords.size > 0);
}

// --- THEIR inventory ---------------------------------------------------------

// Set-difference on trimmed, non-empty lines: lines present in `targetText`
// but not in `currentText`. HISTORY.md is prepend-style (new entries land at
// the top) so new lines cluster together, but a plain set difference is
// robust to that without depending on it.
function diffHistoryLines(git, currentSha, targetSha) {
  const targetText = git.showFile(targetSha, 'HISTORY.md') || '';
  const currentText = git.showFile(currentSha, 'HISTORY.md') || '';

  const currentLines = new Set(
    currentText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  );

  const items = [];
  for (const rawLine of targetText.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (currentLines.has(line)) continue;
    items.push({ kind: 'changelog', text: line });
  }
  return items;
}

function newSymbolItems(upstreamCurrent, upstreamTarget) {
  const items = [];
  for (const [key, def] of upstreamTarget.byKey) {
    if (def && NON_OVERRIDE_KINDS.has(def.kind)) continue;
    if (upstreamCurrent.byKey.has(key)) continue;
    items.push({
      kind: 'symbol',
      text: key,
      file: def ? def.file : undefined,
      line: def ? def.line : undefined,
    });
  }
  return items;
}

function newFileItems(upstreamCurrent, upstreamTarget) {
  const currentSet = new Set(upstreamCurrent.srcFileList || []);
  const items = [];
  for (const f of upstreamTarget.srcFileList || []) {
    if (currentSet.has(f)) continue;
    items.push({ kind: 'file', text: f });
  }
  return items;
}

// --- tokenization -------------------------------------------------------------

function camelSplit(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((w) => w.toLowerCase())
    .filter(Boolean);
}

function tokenizeChangelog(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

function tokenizeSymbol(key) {
  const prop = key.includes('.') ? key.slice(key.lastIndexOf('.') + 1) : key;
  return camelSplit(prop).filter((w) => !STOPWORDS.has(w));
}

function tokenizeFile(filePath) {
  const base = filePath.split('/').pop().replace(/\.js$/i, '');
  return camelSplit(base).filter((w) => !STOPWORDS.has(w));
}

function tokensFor(item) {
  if (item.kind === 'changelog') return tokenizeChangelog(item.text);
  if (item.kind === 'symbol') return tokenizeSymbol(item.text);
  return tokenizeFile(item.text);
}

// --- matching -------------------------------------------------------------

// A group matches an item when >=1 group keyword equals an item token AND
// (to cut noise) either the matched keyword is >=4 chars, or >=2 distinct
// keywords match. Auto-bootstrapped singleton groups (curated === false) are
// held to the stricter bar — >=2 distinct matched keywords — because a lone
// generic word matching one changelog line is nearly always coincidence.
// Returns the sorted list of matched keywords, or null.
function matchGroupToTokens(group, tokens) {
  const tokenSet = new Set(tokens);
  const matched = [];
  for (const kw of group.keywords) {
    if (tokenSet.has(kw)) matched.push(kw);
  }
  if (matched.length === 0) return null;
  const qualifies =
    group.curated === false
      ? matched.length >= 2
      : matched.some((kw) => kw.length >= 4) || matched.length >= 2;
  if (!qualifies) return null;
  return matched.sort();
}

// --- rendering -------------------------------------------------------------

function slugify(label) {
  const slug = String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'group';
}

function formatMatchLine(m) {
  if (m.kind === 'changelog') return `[changelog] ${m.text}`;
  if (m.kind === 'symbol') return `[symbol] ${m.text} (${m.file}:${m.line})`;
  if (m.kind === 'file') return `[file] ${m.text}`;
  return `[?] ${m.text}`;
}

function resolveWhere(ctx, key) {
  const overridesByKey = ctx.overrides && ctx.overrides.byKey;
  if (!overridesByKey || typeof overridesByKey.get !== 'function') return null;
  const defs = overridesByKey.get(key);
  if (!defs || defs.length === 0) return null;
  const def = defs[0];
  if (!def || !def.file) return null;
  return { file: def.file, line: def.line };
}

function buildFinding(ctx, groupResult) {
  const matchedKeywords = new Set();
  for (const m of groupResult.matches) {
    for (const kw of m.matchedKeywords) matchedKeywords.add(kw);
  }
  const matchedKeywordsSorted = Array.from(matchedKeywords).sort();

  const detailLines = groupResult.matches.slice(0, MAX_DETAIL_ITEMS).map(formatMatchLine);
  detailLines.push(
    `Run: claude "/compare-feature ${groupResult.label}" for a full theirs-vs-ours breakdown.`
  );

  const finding = {
    id: `similarity:${slugify(groupResult.label)}`,
    severity: 'warning',
    category: 'SIMILAR-FEATURE',
    key: groupResult.label,
    message:
      `upstream target contains changes conceptually similar to our custom ` +
      `feature ${groupResult.label} (matched: ${matchedKeywordsSorted.join(', ')})`,
    details: detailLines.join('\n'),
  };

  const where = resolveWhere(ctx, groupResult.keys[0]);
  if (where) finding.where = where;

  return finding;
}

function writeSimilarFeaturesJson(ctx, groupResults) {
  fs.mkdirSync(ctx.reportDir, { recursive: true });
  const outPath = path.join(ctx.reportDir, 'similar-features.json');
  const payload = {
    generatedFor: { currentSha: ctx.currentSha, targetSha: ctx.targetSha },
    groups: groupResults,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  return outPath;
}

// --- entry point -------------------------------------------------------------

async function run(ctx) {
  if (ctx.mode !== 'against') return [];

  const groups = buildGroups(ctx.knownCustom);
  if (groups.length === 0) {
    writeSimilarFeaturesJson(ctx, []);
    return [];
  }

  const changelogItems = diffHistoryLines(ctx.git, ctx.currentSha, ctx.targetSha);
  const symbolItems = newSymbolItems(ctx.upstreamCurrent, ctx.upstreamTarget);
  const fileItems = newFileItems(ctx.upstreamCurrent, ctx.upstreamTarget);

  const items = [...changelogItems, ...symbolItems, ...fileItems].map((item) => ({
    ...item,
    tokens: tokensFor(item),
  }));

  const groupResults = groups.map((group) => {
    const matches = [];
    for (const item of items) {
      const matchedKeywords = matchGroupToTokens(group, item.tokens);
      if (!matchedKeywords) continue;
      matches.push({
        kind: item.kind,
        text: item.text,
        file: item.file,
        line: item.line,
        matchedKeywords,
      });
    }
    return {
      label: group.label,
      keys: group.keys,
      keywords: Array.from(group.keywords).sort(),
      matches,
    };
  });

  writeSimilarFeaturesJson(ctx, groupResults);

  const withMatches = groupResults
    .filter((g) => g.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length);

  const capped = withMatches.length > MAX_FINDINGS;
  const kept = withMatches.slice(0, MAX_FINDINGS);

  const findings = kept.map((g) => buildFinding(ctx, g));

  if (capped) {
    const dropped = withMatches.length - MAX_FINDINGS;
    findings.push({
      id: 'similarity:capped',
      severity: 'info',
      category: 'SIMILAR-FEATURE',
      key: '(capped)',
      message:
        `${dropped} additional similar-feature group${dropped === 1 ? '' : 's'} ` +
        `matched but were not reported individually (cap of ${MAX_FINDINGS}); ` +
        `see similar-features.json for the full list.`,
    });
  }

  return findings;
}

module.exports = {
  run,
  // exported for tests / tooling
  STOPWORDS,
  buildGroups,
  diffHistoryLines,
  newSymbolItems,
  newFileItems,
  tokenizeChangelog,
  tokenizeSymbol,
  tokenizeFile,
  matchGroupToTokens,
};
