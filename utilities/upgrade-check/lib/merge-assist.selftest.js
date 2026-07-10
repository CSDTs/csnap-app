'use strict';

// Runnable self-test for lib/merge-assist.js against a fabricated ctx (no
// real drift data required). Usage: node lib/merge-assist.selftest.js
// (run from utilities/upgrade-check/). Does NOT touch the network.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const createGit = require('./git');
const mergeAssist = require('./merge-assist');

const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const git = createGit(repoRoot);

const reportDir = path.join(
  os.tmpdir(),
  `upgrade-check-merge-assist-selftest-${process.pid}`
);

function def(overrides) {
  return {
    file: 'csnap/fake.js',
    object: 'Foo',
    prop: overrides.prop,
    key: `Foo.prototype.${overrides.prop}`,
    kind: 'prototype-method',
    line: 12,
    sourceText: overrides.sourceText,
  };
}

// --- fixtures ---------------------------------------------------------------

// Clean case: ours and theirs edit different, non-adjacent lines (adjacent
// edits are always a conflict for git merge-file — see git.selftest.js).
const base1 = [
  'Foo.prototype.cleanCase = function () {',
  '    var a = 1;',
  '    var b = 2;',
  '    var c = 3;',
  '    var d = 4;',
  '    var e = 5;',
  '};',
].join('\n');
const ours1 = base1.replace('var b = 2;', 'var b = 20; // ours');
const theirs1 = base1.replace('var d = 4;', 'var d = 40; // theirs');

// Conflict case: ours and theirs both edit the SAME line differently.
const base2 = [
  'Foo.prototype.conflictCase = function () {',
  '    var a = 1;',
  '    var b = 2;',
  '    var c = 3;',
  '};',
].join('\n');
const ours2 = base2.replace('var b = 2;', 'var b = 200; // ours');
const theirs2 = base2.replace('var b = 2;', 'var b = 999; // theirs');

// Re-registration case: ours is an unmodified copy of base (pure re-copy);
// only upstream (theirs) changed.
const base3 = [
  'Foo.prototype.reregCase = function () {',
  '    var a = 1;',
  '    var b = 2;',
  '};',
].join('\n');
const ours3 = base3;
const theirs3 = base3.replace('var b = 2;', 'var b = 2000; // theirs changed this');

const perKey = new Map();
perKey.set('Foo.prototype.cleanCase', {
  def: def({ prop: 'cleanCase', sourceText: ours1 }),
  status: 'drifted',
  upstreamOldText: base1,
  upstreamNewText: theirs1,
  upstreamFile: 'src/fake.js',
});
perKey.set('Foo.prototype.conflictCase', {
  def: def({ prop: 'conflictCase', sourceText: ours2 }),
  status: 'drifted',
  upstreamOldText: base2,
  upstreamNewText: theirs2,
  upstreamFile: 'src/fake.js',
});
perKey.set('Foo.prototype.reregCase', {
  def: def({ prop: 'reregCase', sourceText: ours3 }),
  status: 'drifted',
  upstreamOldText: base3,
  upstreamNewText: theirs3,
  upstreamFile: 'src/fake.js',
});
// A non-drifted entry must be ignored entirely.
perKey.set('Foo.prototype.unchangedCase', {
  def: def({ prop: 'unchangedCase', sourceText: 'x' }),
  status: 'unchanged',
  upstreamOldText: 'x',
  upstreamNewText: 'x',
  upstreamFile: 'src/fake.js',
});

const ctx = {
  repoRoot,
  mode: 'against',
  git,
  currentSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  targetSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  targetRefName: 'fake-target',
  reportDir,
  driftResults: { summary: {}, perKey },
};

try {
  // --- 'check' mode short-circuit: run(ctx) returns [] when mode !== 'against' ---
  const checkModeFindings = mergeAssist.run({ ...ctx, mode: 'check' });
  assert.deepStrictEqual(checkModeFindings, [], "expected run() to return [] outside 'against' mode");
  console.log("OK run() -> [] outside 'against' mode");

  // --- against mode: the real pass ---
  const findings = mergeAssist.run(ctx);

  const byKey = new Map();
  for (const f of findings) {
    if (!byKey.has(f.key)) byKey.set(f.key, []);
    byKey.get(f.key).push(f);
  }

  // unchanged entries never produce findings.
  assert.ok(!byKey.has('Foo.prototype.unchangedCase'), 'expected no findings for a non-drifted key');
  console.log('OK unchanged key produced no findings');

  // --- clean case ---
  const clean = byKey.get('Foo.prototype.cleanCase') || [];
  const cleanMerge = clean.find((f) => f.category === 'CLEAN-MERGE');
  const cleanVisual = clean.find((f) => f.category === 'NEEDS-VISUAL-REVIEW');
  assert.ok(cleanMerge, 'expected a CLEAN-MERGE finding for cleanCase');
  assert.strictEqual(cleanMerge.severity, 'info', 'expected CLEAN-MERGE severity info');
  assert.ok(/proposal ready for review/.test(cleanMerge.message), 'expected clean-merge message wording');
  assert.ok(cleanMerge.artifacts && cleanMerge.artifacts.merged, 'expected merged artifact on CLEAN-MERGE finding');
  assert.ok(cleanVisual, 'expected a NEEDS-VISUAL-REVIEW finding for cleanCase (both sides changed)');
  assert.strictEqual(cleanVisual.surface, 'Other', `expected surface 'Other' for object Foo, got ${cleanVisual.surface}`);
  console.log('OK cleanCase -> CLEAN-MERGE + NEEDS-VISUAL-REVIEW, surface =', cleanVisual.surface);

  const cleanMergedAbs = path.join(reportDir, cleanMerge.artifacts.merged);
  assert.ok(fs.existsSync(cleanMergedAbs), `expected merged artifact to exist at ${cleanMergedAbs}`);
  const cleanMergedText = fs.readFileSync(cleanMergedAbs, 'utf8');
  assert.ok(cleanMergedText.includes('// key: Foo.prototype.cleanCase'), 'expected key header line');
  assert.ok(cleanMergedText.includes('PROPOSED merged override'), 'expected PROPOSED merged override header');
  assert.ok(cleanMergedText.includes('var b = 20'), 'expected ours edit present in clean merge');
  assert.ok(cleanMergedText.includes('var d = 40'), 'expected theirs edit present in clean merge');
  assert.ok(!cleanMergedText.includes('<<<<<<<'), 'expected no conflict markers in clean merge');
  console.log('OK cleanCase merged artifact header + content verified');

  // --- conflict case ---
  const conflict = byKey.get('Foo.prototype.conflictCase') || [];
  const conflictMerge = conflict.find((f) => f.category === 'MERGE-CONFLICT');
  const conflictVisual = conflict.find((f) => f.category === 'NEEDS-VISUAL-REVIEW');
  assert.ok(conflictMerge, 'expected a MERGE-CONFLICT finding for conflictCase');
  assert.strictEqual(conflictMerge.severity, 'warning', 'expected MERGE-CONFLICT severity warning');
  assert.ok(/diff3 markers/.test(conflictMerge.message), 'expected conflict message wording');
  assert.ok(conflictVisual, 'expected a NEEDS-VISUAL-REVIEW finding for conflictCase too (both sides changed)');
  console.log('OK conflictCase -> MERGE-CONFLICT + NEEDS-VISUAL-REVIEW');

  const conflictMergedAbs = path.join(reportDir, conflictMerge.artifacts.merged);
  assert.ok(fs.existsSync(conflictMergedAbs), `expected merged artifact to exist at ${conflictMergedAbs}`);
  const conflictMergedText = fs.readFileSync(conflictMergedAbs, 'utf8');
  assert.ok(conflictMergedText.includes('CONFLICTED'), 'expected CONFLICTED note in header');
  assert.ok(conflictMergedText.includes('<<<<<<<'), 'expected conflict markers in body');
  console.log('OK conflictCase merged artifact header + conflict markers verified');

  // --- re-registration case ---
  const rereg = byKey.get('Foo.prototype.reregCase') || [];
  const reregMerge = rereg.find((f) => f.category === 'CLEAN-MERGE');
  const reregVisual = rereg.find((f) => f.category === 'NEEDS-VISUAL-REVIEW');
  assert.ok(reregMerge, 'expected a CLEAN-MERGE finding for reregCase (ours === base merges cleanly)');
  assert.ok(
    /unmodified copy of the old upstream method/.test(reregMerge.message),
    'expected re-registration note in message'
  );
  assert.ok(!reregVisual, 'expected NO NEEDS-VISUAL-REVIEW for a pure re-registration (ours === base)');
  console.log('OK reregCase -> CLEAN-MERGE with re-registration note, no NEEDS-VISUAL-REVIEW');

  // --- tmp cleanup: no leftover tmp/ dir under reportDir ---
  assert.ok(!fs.existsSync(path.join(reportDir, 'tmp')), 'expected reportDir/tmp to be cleaned up');
  console.log('OK reportDir/tmp cleaned up after run()');

  console.log('ALL MERGE-ASSIST SELFTESTS PASSED');
} finally {
  try {
    fs.rmSync(reportDir, { recursive: true, force: true });
  } catch (err) {
    // ignore
  }
}
