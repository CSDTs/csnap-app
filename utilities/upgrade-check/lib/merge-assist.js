'use strict';

// merge-assist.js — three-way merge proposals for DRIFTED overrides.
//
// Only meaningful in 'against' mode: for every override whose upstream body
// drifted between the currently-vendored sha and the target ref, this module
// attempts a three-way merge of (base = old upstream body, ours = csnap
// override body, theirs = new upstream body) via `git merge-file`, writes the
// result as a PROPOSED patch under reportDir/merged/ (the tool never edits
// csnap/ or snap/ itself), and emits CLEAN-MERGE / MERGE-CONFLICT findings.
//
// It additionally flags cases where BOTH sides genuinely changed the method
// (our override diverges from the old upstream body, not just a straight
// copy) with a NEEDS-VISUAL-REVIEW finding — a clean textual merge can still
// collide behaviorally/visually and is worth a manual look at the relevant
// UI surface after upgrading.
//
// run(ctx) reads ctx.driftResults (stashed by lib/drift.js) and returns
// Finding[]; it does not mutate driftResults.

const fs = require('fs');
const path = require('path');
const { normalizeJs, methodSlug } = require('./drift');

function ensureTrailingNewline(text) {
  if (!text) return '';
  return text.endsWith('\n') ? text : text + '\n';
}

function shaShort(sha) {
  return sha ? sha.slice(0, 10) : '?';
}

// Owner-class -> UI surface mapping for NEEDS-VISUAL-REVIEW grouping. First
// match wins on def.object; if that yields nothing, fall back to sniffing the
// upstream file basename for the same families.
function surfaceFor(def, upstreamFile) {
  const object = (def && def.object) || '';
  const prop = (def && def.prop) || '';

  function fromObject(obj) {
    if (obj === 'IDE_Morph') {
      if (/ControlBar|controlBar/.test(prop)) return 'Control bar';
      if (/Corral/.test(prop)) return 'Sprite corral';
      if (/Palette|palette/.test(prop)) return 'Palette';
      return 'IDE shell';
    }
    if (obj === 'StageMorph') return 'Stage';
    if (obj === 'SpriteMorph') return 'Sprites/blocks';
    if (obj.endsWith('DialogMorph')) return 'Dialogs';
    if (obj === 'Cloud') return 'Cloud/backend';
    if (obj === 'SnapSerializer') return 'Serialization (invisible — test save/load)';
    return null;
  }

  const byObject = fromObject(object);
  if (byObject) return byObject;

  if (upstreamFile) {
    const base = upstreamFile.split('/').pop() || '';
    if (/gui/i.test(base)) return 'IDE shell';
    if (/stage/i.test(base)) return 'Stage';
    if (/sprite|objects/i.test(base)) return 'Sprites/blocks';
    if (/dialog/i.test(base)) return 'Dialogs';
    if (/cloud/i.test(base)) return 'Cloud/backend';
    if (/store/i.test(base)) return 'Serialization (invisible — test save/load)';
  }

  return 'Other';
}

// Tiny line-diff helper: the first line of `a` (in order, trimmed) that does
// not appear anywhere (trimmed) in `b`. Not a real diff — just enough to give
// a one-line hint of "here's roughly where this side changed".
function firstDiffLine(a, b) {
  if (!a) return null;
  const bLines = new Set(
    String(b || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  );
  for (const line of a.split('\n')) {
    const t = line.trim();
    if (t && !bLines.has(t)) return t;
  }
  return null;
}

// --- merged artifact -------------------------------------------------------

function writeMergedArtifact(ctx, key, def, upstreamFile, mergeResult) {
  const slug = methodSlug(def, upstreamFile);
  const rel = path.join('merged', slug + '.js');
  const currentShaShort = shaShort(ctx.currentSha);
  const targetShaShort = shaShort(ctx.targetSha);

  const header = [
    `// key: ${key}`,
    '// PROPOSED merged override — this file is NOT wired into the build.',
    `// Review it, then paste the result into ${def.file}, replacing the`,
    `// override around line ${def.line}.`,
    `// merge status: ${mergeResult.conflicted ? 'CONFLICTED (has diff3 markers)' : 'clean'}`,
    `// base: upstream @ ${currentShaShort}   target: upstream @ ${targetShaShort}`,
    '',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(ctx.reportDir, rel), header + mergeResult.merged);
  return rel;
}

// --- main -------------------------------------------------------------------

function run(ctx) {
  if (ctx.mode !== 'against') return [];
  const drift = ctx.driftResults;
  if (!drift) return [];

  const findings = [];
  const tmpDir = path.join(ctx.reportDir, 'tmp');
  const mergedDir = path.join(ctx.reportDir, 'merged');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(mergedDir, { recursive: true });

  try {
    for (const [key, rec] of drift.perKey) {
      if (rec.status !== 'drifted') continue;

      const { def, upstreamOldText, upstreamNewText, upstreamFile } = rec;
      const base = upstreamOldText;
      const ours = def.sourceText;
      const theirs = upstreamNewText;

      const slug = methodSlug(def, upstreamFile);
      const basePath = path.join(tmpDir, slug + '.base');
      const oursPath = path.join(tmpDir, slug + '.ours');
      const theirsPath = path.join(tmpDir, slug + '.theirs');
      fs.writeFileSync(basePath, ensureTrailingNewline(base));
      fs.writeFileSync(oursPath, ensureTrailingNewline(ours));
      fs.writeFileSync(theirsPath, ensureTrailingNewline(theirs));

      const currentShaShort = shaShort(ctx.currentSha);
      const targetShaShort = shaShort(ctx.targetSha);

      let mergeResult;
      try {
        mergeResult = ctx.git.mergeFile(oursPath, basePath, theirsPath, {
          ours: `csnap override (${def.file})`,
          base: `upstream @ ${currentShaShort}`,
          theirs: `upstream @ ${targetShaShort}`,
        });
      } finally {
        try { fs.unlinkSync(basePath); } catch (e) { /* ignore */ }
        try { fs.unlinkSync(oursPath); } catch (e) { /* ignore */ }
        try { fs.unlinkSync(theirsPath); } catch (e) { /* ignore */ }
      }

      const mergedRel = writeMergedArtifact(ctx, key, def, upstreamFile, mergeResult);

      const isReRegistration = normalizeJs(ours) === normalizeJs(base);
      const category = mergeResult.conflicted ? 'MERGE-CONFLICT' : 'CLEAN-MERGE';
      const severity = mergeResult.conflicted ? 'warning' : 'info';

      let message = mergeResult.conflicted
        ? `three-way merge of '${key}' has diff3 markers where your edit and ` +
          `upstream's overlap — resolve manually, see ${mergedRel}`
        : `proposal ready for review at ${mergedRel}`;
      if (isReRegistration && !mergeResult.conflicted) {
        message +=
          ' — override is an unmodified copy of the old upstream method — ' +
          'consider simply re-copying the new upstream body';
      }

      findings.push({
        id: `merge:${def.file}/${key}`,
        severity,
        category,
        key,
        where: { file: def.file, line: def.line },
        upstreamFile,
        message,
        artifacts: { merged: mergedRel },
      });

      // NEEDS-VISUAL-REVIEW: both sides genuinely changed the method (our
      // override is not just an unmodified copy of the old upstream body).
      if (!isReRegistration) {
        const surface = surfaceFor(def, upstreamFile);
        const oursHint = firstDiffLine(ours, base);
        const theirsHint = firstDiffLine(theirs, base);
        const hints = [];
        if (oursHint) hints.push(`ours changed: ${oursHint}`);
        if (theirsHint) hints.push(`upstream changed: ${theirsHint}`);

        findings.push({
          id: `visual-review:${def.file}/${key}`,
          severity: 'warning',
          category: 'NEEDS-VISUAL-REVIEW',
          key,
          where: { file: def.file, line: def.line },
          upstreamFile,
          message:
            `both our override and upstream changed '${key}' — even a clean ` +
            `textual merge can collide visually/behaviorally; check ${surface} ` +
            `after upgrading`,
          details: hints.length ? hints.join('\n') : undefined,
          surface,
        });
      }
    }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }

  return findings;
}

module.exports = { run, surfaceFor, firstDiffLine };
