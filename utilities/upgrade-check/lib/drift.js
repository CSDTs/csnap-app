'use strict';

// drift.js — the single implementation of override classification and drift
// detection for upgrade-check. Called by check-upgrade.js in BOTH modes:
//
//  - 'check'   mode: existence classification of every csnap override against
//                    the working-tree upstream index (ctx.upstreamCurrent).
//  - 'against' mode: same existence pass PLUS a source drift comparison of the
//                    currently-vendored upstream body against a target ref
//                    (ctx.upstreamTarget), emitting DRIFTED / SIGNATURE-CHANGED
//                    / REMOVED / FILE-REMOVED / NEW-UPSTREAM-COLLISION findings
//                    and writing per-method diff artifacts under reportDir.
//
// run(ctx) returns Finding[] and stashes raw results on ctx.driftResults
// ({ summary, perKey }) for the later merge-assist module to consume.

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

// Kinds that are not real override keys and must be skipped when classifying.
const NON_OVERRIDE_KINDS = new Set(['prototype-chain', 'top-var']);

// Value-type tags that denote a callable (params array is meaningful).
const FUNCTION_VALUE_TYPES = new Set(['function', 'async-function', 'arrow']);

// --- eligibility ----------------------------------------------------------

// Definitions eligible for classification: real override kinds, excluding
// tutorials.js (which is wholly custom and scanned separately).
function classifiableDefs(overrides) {
  const out = [];
  for (const res of Object.values(overrides.files)) {
    for (const def of res.definitions) {
      if (NON_OVERRIDE_KINDS.has(def.kind)) continue;
      if (def.file === 'csnap/tutorials.js') continue;
      out.push(def);
    }
  }
  return out;
}

// De-dupe by key keeping the LAST definition (JS last-wins is what actually
// runs). Insertion order follows first occurrence; values are the last record.
function lastDefByKey(overrides) {
  const map = new Map();
  for (const def of classifiableDefs(overrides)) {
    map.set(def.key, def);
  }
  return map;
}

function hasEntry(knownCustom, key) {
  return Object.prototype.hasOwnProperty.call(knownCustom.entries, key);
}

// --- normalisation --------------------------------------------------------

// Normalise a JS snippet for semantic comparison: drop comments and collapse
// insignificant whitespace, preserving string/template literal contents. The
// acorn tokenizer skips comments and emits each literal as a single token, so
// joining token source-slices with a single space gives both for free.
function normalizeJs(source) {
  try {
    const parts = [];
    const tokenizer = acorn.tokenizer(source, {
      ecmaVersion: 'latest',
      allowReserved: true,
    });
    for (const tok of tokenizer) {
      if (tok.type === acorn.tokTypes.eof) break;
      parts.push(source.slice(tok.start, tok.end));
    }
    if (parts.length) return parts.join(' ');
  } catch (err) {
    // fall through to the regex fallback
  }
  // Fallback: strip comments, then collapse whitespace runs.
  const noComments = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  return noComments.replace(/\s+/g, ' ').trim();
}

// Own top-level keys of the object literal on the RHS of an assignment snippet
// (e.g. `X.prototype.blocks = { forward: {...}, '%drc': {...} };`). Returns a
// Set of key names; empty set if the snippet cannot be parsed as such.
function objectLiteralKeys(sourceText) {
  const keys = new Set();
  if (!sourceText) return keys;
  let ast;
  try {
    ast = acorn.parse(sourceText, { ecmaVersion: 'latest', allowReserved: true });
  } catch (err) {
    return keys;
  }
  let objExpr = null;
  for (const stmt of ast.body) {
    if (
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'AssignmentExpression' &&
      stmt.expression.right.type === 'ObjectExpression'
    ) {
      objExpr = stmt.expression.right;
      break;
    }
  }
  if (!objExpr) return keys;
  for (const prop of objExpr.properties) {
    if (prop.type !== 'Property') continue;
    if (prop.key.type === 'Identifier') keys.add(prop.key.name);
    else if (prop.key.type === 'Literal') keys.add(String(prop.key.value));
  }
  return keys;
}

// --- diff artifacts -------------------------------------------------------

// Slugify a method to a diff filename base: <fileBase>--<Object>.<prop>, e.g.
// gui--IDE_Morph.createControlBar (upstream file without src/ and .js; the
// 'prototype' segment is intentionally dropped by using object.prop).
function methodSlug(def, upstreamFile) {
  const fileBase = upstreamFile.replace(/^src\//, '').replace(/\.js$/, '');
  const name = def.object ? `${def.object}.${def.prop}` : def.prop;
  return `${fileBase}--${name}`.replace(/[^\w.$-]/g, '_');
}

function ensureTrailingNewline(text) {
  if (!text) return '';
  return text.endsWith('\n') ? text : text + '\n';
}

// Write a diff artifact (old upstream body -> new upstream body, un-normalised)
// with a small header comment block. Returns the report-dir-relative path.
function writeMethodDiff(ctx, def, oldText, newText, upstreamFile) {
  const slug = methodSlug(def, upstreamFile);
  const tmpDir = path.join(ctx.reportDir, 'tmp');
  const methodsDir = path.join(ctx.reportDir, 'diffs', 'methods');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(methodsDir, { recursive: true });

  const oldPath = path.join(tmpDir, slug + '.old');
  const newPath = path.join(tmpDir, slug + '.new');
  fs.writeFileSync(oldPath, ensureTrailingNewline(oldText));
  fs.writeFileSync(newPath, ensureTrailingNewline(newText));

  let diff;
  try {
    diff = ctx.git.diffNoIndex(oldPath, newPath);
  } finally {
    try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
    try { fs.unlinkSync(newPath); } catch (e) { /* ignore */ }
  }

  const shaLine =
    `${ctx.currentSha ? ctx.currentSha.slice(0, 10) : '?'} -> ` +
    `${ctx.targetSha ? ctx.targetSha.slice(0, 10) : '?'}`;
  const header = [
    `# key: ${def.key}`,
    `# csnap override: ${def.file}:${def.line}`,
    `# upstream file: ${upstreamFile}`,
    `# ${shaLine}`,
    '',
    '',
  ].join('\n');

  const rel = path.join('diffs', 'methods', slug + '.diff');
  fs.writeFileSync(path.join(ctx.reportDir, rel), header + diff);
  return rel;
}

// --- findings helpers -----------------------------------------------------

function customFinding(def) {
  return {
    id: `custom:${def.file}/${def.key}`,
    severity: 'info',
    category: 'CUSTOM',
    key: def.key,
    where: { file: def.file, line: def.line },
    message: 'acknowledged custom override (not present upstream)',
  };
}

function unrecognizedFinding(def) {
  return {
    id: `unrecognized:${def.file}/${def.key}`,
    severity: 'error',
    category: 'UNRECOGNIZED',
    key: def.key,
    where: { file: def.file, line: def.line },
    message:
      `override '${def.key}' has no upstream counterpart and is not in ` +
      `known-custom.json — it is either a stale/typo'd override or an ` +
      `unacknowledged custom extension`,
    details:
      `Fix by correcting the target (if the upstream symbol was renamed/` +
      `removed) or, if it is intentional custom code, record it with ` +
      `--write-known-custom (or add it to known-custom.json by hand).`,
  };
}

// --- main -----------------------------------------------------------------

function run(ctx) {
  const findings = [];
  const summary = {
    ok: 0,
    unchanged: 0,
    drifted: 0,
    removed: 0,
    fileRemoved: 0,
    custom: 0,
    unrecognized: 0,
    collisions: 0,
  };
  const perKey = new Map();
  ctx.driftResults = { summary, perKey };

  const isAgainst = ctx.mode === 'against';
  const current = ctx.upstreamCurrent;
  const target = ctx.upstreamTarget || null;

  try {
    classifyAll();
  } finally {
    // Scratch dir used for diff artifacts must not survive an exception.
    if (ctx.reportDir) {
      try {
        fs.rmSync(path.join(ctx.reportDir, 'tmp'), { recursive: true, force: true });
      } catch (e) {
        /* ignore */
      }
    }
  }

  // ---- mode-independent findings ------------------------------------
  emitDuplicateFindings(ctx, findings);
  emitSideEffectFindings(ctx, findings);

  return findings;

  function classifyAll() {
  for (const def of lastDefByKey(ctx.overrides).values()) {
    const cur = current.byKey.get(def.key);

    // ---- key absent at the current vendored ref -----------------------
    if (!cur) {
      if (!hasEntry(ctx.knownCustom, def.key)) {
        summary.unrecognized++;
        findings.push(unrecognizedFinding(def));
        perKey.set(def.key, {
          def,
          status: 'unrecognized',
          upstreamOldText: null,
          upstreamNewText: null,
          upstreamFile: null,
        });
        continue;
      }

      summary.custom++;
      findings.push(customFinding(def));

      let upstreamNewText = null;
      let upstreamFile = null;
      if (isAgainst && target && target.byKey.has(def.key)) {
        // Upstream newly ADDED a symbol our custom extension shadows.
        const up = target.byKey.get(def.key);
        upstreamNewText = up.sourceText;
        upstreamFile = up.file;
        summary.collisions++;
        findings.push({
          id: `collision:${def.file}/${def.key}`,
          severity: 'warning',
          category: 'NEW-UPSTREAM-COLLISION',
          key: def.key,
          where: { file: def.file, line: def.line },
          upstreamFile: up.file,
          message:
            `custom override '${def.key}' (${def.file}:${def.line}) now ` +
            `collides with a NEW upstream symbol at ${up.file}:${up.line} — ` +
            `the target upstream adds this key; reconcile or de-shadow it`,
        });
      }

      perKey.set(def.key, {
        def,
        status: 'custom',
        upstreamOldText: null,
        upstreamNewText,
        upstreamFile,
      });
      continue;
    }

    // ---- key present at the current vendored ref ----------------------
    summary.ok++;

    if (!isAgainst) {
      perKey.set(def.key, {
        def,
        status: 'ok',
        upstreamOldText: cur.sourceText,
        upstreamNewText: null,
        upstreamFile: cur.file,
      });
      continue;
    }

    // against mode: compare current upstream body vs target upstream body.
    const tgt = target.byKey.get(def.key);

    if (!tgt) {
      // Absent at target: removed method, or the whole file was removed.
      const targetFile = target.files.get(cur.file);
      const fileMissing = !targetFile || targetFile.missing;
      const diffRel = writeMethodDiff(ctx, def, cur.sourceText, '', cur.file);

      if (fileMissing) {
        summary.fileRemoved++;
        findings.push({
          id: `file-removed:${cur.file}/${def.key}`,
          severity: 'error',
          category: 'FILE-REMOVED',
          key: def.key,
          where: { file: def.file, line: def.line },
          upstreamFile: cur.file,
          message:
            `upstream file ${cur.file} is GONE at target — override ` +
            `'${def.key}' (${def.file}:${def.line}) has no base to patch`,
          artifacts: { diff: diffRel },
        });
      } else {
        summary.removed++;
        findings.push({
          id: `removed:${cur.file}/${def.key}`,
          severity: 'error',
          category: 'REMOVED',
          key: def.key,
          where: { file: def.file, line: def.line },
          upstreamFile: cur.file,
          message:
            `upstream symbol '${def.key}' was REMOVED at target (still in ` +
            `${cur.file} today) — override ${def.file}:${def.line} will patch ` +
            `nothing; see diff`,
          artifacts: { diff: diffRel },
        });
      }

      perKey.set(def.key, {
        def,
        status: fileMissing ? 'file-removed' : 'removed',
        upstreamOldText: cur.sourceText,
        upstreamNewText: null,
        upstreamFile: cur.file,
      });
      continue;
    }

    // Present at both refs: compare normalised upstream source.
    const oldText = cur.sourceText;
    const newText = tgt.sourceText;
    if (normalizeJs(oldText) === normalizeJs(newText)) {
      summary.unchanged++;
      perKey.set(def.key, {
        def,
        status: 'unchanged',
        upstreamOldText: oldText,
        upstreamNewText: newText,
        upstreamFile: cur.file,
      });
      continue;
    }

    // DRIFTED — upstream body changed; our override needs re-porting.
    summary.drifted++;
    const diffRel = writeMethodDiff(ctx, def, oldText, newText, cur.file);
    findings.push({
      id: `drift:${cur.file}/${def.key}`,
      severity: 'warning',
      category: 'DRIFTED',
      key: def.key,
      where: { file: def.file, line: def.line },
      upstreamFile: cur.file,
      message:
        `upstream '${def.key}' changed between ${ctx.currentSha.slice(0, 10)} ` +
        `and ${ctx.targetSha.slice(0, 10)} — re-port override ` +
        `${def.file}:${def.line}`,
      artifacts: { diff: diffRel },
    });

    // Signature change (function-valued kinds only): compare param lists.
    if (
      FUNCTION_VALUE_TYPES.has(cur.valueType) &&
      FUNCTION_VALUE_TYPES.has(tgt.valueType) &&
      Array.isArray(cur.params) &&
      Array.isArray(tgt.params) &&
      cur.params.join(',') !== tgt.params.join(',')
    ) {
      findings.push({
        id: `signature:${cur.file}/${def.key}`,
        severity: 'error',
        category: 'SIGNATURE-CHANGED',
        key: def.key,
        where: { file: def.file, line: def.line },
        upstreamFile: cur.file,
        message:
          `signature of '${def.key}' changed: (${cur.params.join(', ')}) -> ` +
          `(${tgt.params.join(', ')}) — override ${def.file}:${def.line} may ` +
          `pass/expect the wrong arguments`,
      });
    }

    // Object-merge overrides: a key we splice in may now clash with a key the
    // target upstream object itself defines.
    if (def.kind === 'object-merge' && Array.isArray(def.addedKeys)) {
      const targetKeys = objectLiteralKeys(newText);
      for (const addedKey of def.addedKeys) {
        if (targetKeys.has(addedKey)) {
          summary.collisions++;
          findings.push({
            id: `collision:${cur.file}/${def.key}#${addedKey}`,
            severity: 'warning',
            category: 'NEW-UPSTREAM-COLLISION',
            key: def.key,
            where: { file: def.file, line: def.line },
            upstreamFile: cur.file,
            message:
              `object-merge override '${def.key}' (${def.file}:${def.line}) ` +
              `adds key '${addedKey}', which the target upstream ${cur.file} ` +
              `now defines itself — our value will shadow upstream's`,
          });
        }
      }
    }

    perKey.set(def.key, {
      def,
      status: 'drifted',
      upstreamOldText: oldText,
      upstreamNewText: newText,
      upstreamFile: cur.file,
    });
  }
  }
}

// Duplicate override keys across csnap: last-wins in JS, worth a warning.
function emitDuplicateFindings(ctx, findings) {
  for (const key of ctx.overrides.duplicates) {
    const defs = ctx.overrides.byKey.get(key) || [];
    const locs = defs
      .filter((d) => !NON_OVERRIDE_KINDS.has(d.kind))
      .map((d) => `${d.file}:${d.line}`)
      .join(', ');
    findings.push({
      id: `duplicate:${key}`,
      severity: 'warning',
      category: 'DUPLICATE-OVERRIDE',
      key,
      message: `override '${key}' is defined ${defs.length} times (${locs}); last definition wins`,
    });
  }
}

// Real load-time side-effect statements (appendix material).
function emitSideEffectFindings(ctx, findings) {
  for (const res of Object.values(ctx.overrides.files)) {
    for (const se of res.sideEffects) {
      findings.push({
        id: `side-effect:${se.file}:${se.line}`,
        severity: 'info',
        category: 'SIDE-EFFECT',
        key: null,
        where: { file: se.file, line: se.line },
        message: `top-level side-effect: ${se.snippet.replace(/\s+/g, ' ')}`,
      });
    }
  }
}

module.exports = { run, normalizeJs, objectLiteralKeys, methodSlug };
