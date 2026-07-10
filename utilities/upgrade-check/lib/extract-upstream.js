'use strict';

// Upstream definition index for upgrade-check. Plain CommonJS.
//
// Builds a key -> definition index of upstream Snap! `src/*.js`, either from a
// git ref (via git.showFile) or, when the sha is null, from the working-tree
// `snap/src/`. The def records are exactly what extract-overrides produces.

const fs = require('fs');
const path = require('path');
const { extractDefinitions } = require('./extract-overrides');

// Upstream src files we never parse (binary-ish / minified / hash tables).
const UPSTREAM_SKIP = new Set(['sha512.js']);

// Kinds that are not real override keys (inheritance wiring, top-level vars);
// excluded from byKey so the upstream key namespace matches the check-mode set.
const NON_OVERRIDE_KINDS = new Set(['prototype-chain', 'top-var']);

function isParseableSrc(base) {
  if (!base.endsWith('.js')) return false;
  if (base.endsWith('.min.js')) return false;
  if (UPSTREAM_SKIP.has(base)) return false;
  return true;
}

// src/*.js file basenames present in the working-tree snap/src/.
function srcFilesFromWorkingTree(repoRoot) {
  const srcDir = path.join(repoRoot, 'snap', 'src');
  return fs
    .readdirSync(srcDir)
    .filter(isParseableSrc)
    .sort();
}

// src/*.js file basenames present at a git ref (top-level src/ blobs only).
function srcFilesFromRef(git, sha) {
  const tree = git.listTree(sha, 'src');
  const names = [];
  for (const p of tree.keys()) {
    if (!p.startsWith('src/')) continue;
    const base = p.slice('src/'.length);
    if (base.includes('/')) continue; // only top-level src/*.js
    if (!isParseableSrc(base)) continue;
    names.push(base);
  }
  return names.sort();
}

// Build the upstream definition index. `shaOrNull === null` reads the working
// tree; otherwise every file is read at `sha` via git.showFile.
//
// Returns { byKey: Map<key, def>, files: Map<'src/x.js', fileResult>,
//           srcFileList: ['src/x.js', ...] } where fileResult is
// { definitions, sideEffects, degraded, missing }.
function extractUpstreamAt(git, shaOrNull, repoRoot) {
  const fromTree = shaOrNull === null;
  const names = fromTree
    ? srcFilesFromWorkingTree(repoRoot)
    : srcFilesFromRef(git, shaOrNull);

  const byKey = new Map();
  const files = new Map();
  const srcFileList = [];

  for (const name of names) {
    const label = `src/${name}`;
    srcFileList.push(label);

    let source;
    if (fromTree) {
      source = fs.readFileSync(path.join(repoRoot, 'snap', 'src', name), 'utf8');
    } else {
      source = git.showFile(shaOrNull, label);
    }

    if (source === null) {
      // File listed in tree but unreadable (shouldn't normally happen) — treat
      // as missing so callers can classify FILE-REMOVED consistently.
      files.set(label, {
        definitions: [],
        sideEffects: [],
        degraded: false,
        missing: true,
      });
      continue;
    }

    const result = extractDefinitions(source, label);
    files.set(label, {
      definitions: result.definitions,
      sideEffects: result.sideEffects,
      degraded: result.degraded,
      missing: false,
    });

    for (const def of result.definitions) {
      if (NON_OVERRIDE_KINDS.has(def.kind)) continue;
      // last-wins: if a key is defined twice upstream keep the LAST record.
      byKey.set(def.key, def);
    }
  }

  return { byKey, files, srcFileList };
}

module.exports = { extractUpstreamAt, UPSTREAM_SKIP, NON_OVERRIDE_KINDS };
