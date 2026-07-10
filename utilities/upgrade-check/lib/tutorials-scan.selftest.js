#!/usr/bin/env node
'use strict';

// Selftest for lib/tutorials-scan.js. Run from utilities/upgrade-check/:
//   node lib/tutorials-scan.selftest.js

const path = require('path');
const createGit = require('./git');
const { extractCsnapOverrides } = require('./extract-overrides');
const { extractUpstreamAt } = require('./extract-upstream');
const { run } = require('./tutorials-scan');

function assert(cond, msg) {
  if (!cond) {
    console.error(`  ASSERT FAILED: ${msg}`);
    process.exit(1);
  }
}

function isWellFormed(f) {
  return (
    f &&
    typeof f.id === 'string' &&
    (f.severity === 'error' || f.severity === 'warning' || f.severity === 'info') &&
    f.category === 'TUTORIALS-MISSING-SYMBOL' &&
    typeof f.key === 'string' &&
    f.where &&
    f.where.file === 'csnap/tutorials.js' &&
    typeof f.where.line === 'number' &&
    typeof f.message === 'string'
  );
}

function main() {
  const repoRoot = path.resolve(__dirname, '../../..');
  const git = createGit(repoRoot);

  // ============================================================
  // Part 1: REAL tutorials.js against the working-tree upstream.
  // ============================================================
  console.log('=== Part 1: REAL csnap/tutorials.js (check mode, working tree) ===');
  const overrides = extractCsnapOverrides(repoRoot);
  const upstreamCurrent = extractUpstreamAt(git, null, repoRoot);

  const realCtx = {
    repoRoot,
    mode: 'check',
    git,
    overrides,
    upstreamCurrent,
  };

  const realFindings = run(realCtx);
  assert(Array.isArray(realFindings), 'run() returns an array');
  realFindings.forEach((f, i) =>
    assert(isWellFormed(f), `real finding #${i} well-formed: ${JSON.stringify(f)}`)
  );

  if (realFindings.length === 0) {
    console.log('  No findings on real tutorials.js (clean against working tree).');
  } else {
    console.log(`  >>> ${realFindings.length} REAL FINDING(S) — investigate: <<<`);
    for (const f of realFindings) {
      console.log(
        `    [${f.severity}] ${f.key}  (line ${f.where.line})\n      ${f.message}`
      );
    }
  }

  // Deep mode on the real file (should stay quiet or produce only warnings).
  const realDeep = run({ ...realCtx, deepTutorials: true });
  realDeep.forEach((f, i) =>
    assert(isWellFormed(f), `real deep finding #${i} well-formed`)
  );
  const deepOnly = realDeep.filter((f) => f.severity === 'warning');
  console.log(`  Deep-mode warnings on real file: ${deepOnly.length}`);
  for (const f of deepOnly) {
    console.log(`    [warning] ${f.key} (line ${f.where.line})`);
  }
  console.log('');

  // ============================================================
  // Part 2: SYNTHETIC ctx with a tiny model + fabricated source.
  // ============================================================
  console.log('=== Part 2: SYNTHETIC cases ===');

  // Tiny hand-built upstream model: files is a Map<label, {definitions}>.
  const synthDefs = [
    // Parent constructor + a real method.
    { kind: 'constructor', object: null, prop: 'ParentMorph', key: 'ParentMorph' },
    {
      kind: 'prototype-method',
      object: 'ParentMorph',
      prop: 'inheritedMethod',
      key: 'ParentMorph.prototype.inheritedMethod',
    },
    // Child constructor, real method, inherits from Parent via chain.
    { kind: 'constructor', object: null, prop: 'ChildMorph', key: 'ChildMorph' },
    {
      kind: 'prototype-method',
      object: 'ChildMorph',
      prop: 'realMethod',
      key: 'ChildMorph.prototype.realMethod',
    },
    {
      kind: 'prototype-chain',
      object: 'ChildMorph',
      prop: 'prototype',
      chainParent: 'ParentMorph',
      key: 'ChildMorph.prototype',
    },
    // A static.
    {
      kind: 'static-prop',
      object: 'ChildMorph',
      prop: 'aStatic',
      key: 'ChildMorph.aStatic',
    },
  ];
  const synthUpstream = {
    files: new Map([['src/synth.js', { definitions: synthDefs }]]),
    byKey: new Map(),
    srcFileList: ['src/synth.js'],
  };
  const synthOverrides = { files: {}, byKey: new Map(), duplicates: [] };

  function synthRun(src, extra) {
    return run({
      repoRoot,
      mode: 'check',
      git,
      overrides: synthOverrides,
      upstreamCurrent: synthUpstream,
      tutorialsSource: src,
      ...extra,
    });
  }
  const hasKey = (fs_, k) => fs_.some((f) => f.key === k);

  // (a) valid X.prototype.realMethod() -> no finding.
  let r = synthRun('ChildMorph.prototype.realMethod();\n');
  assert(!hasKey(r, 'ChildMorph.prototype.realMethod'), '(a) valid proto method not flagged');
  console.log('  (a) valid X.prototype.realMethod() -> no finding: PASS');

  // (b) X.prototype.goneMethod() -> finding.
  r = synthRun('ChildMorph.prototype.goneMethod();\n');
  assert(hasKey(r, 'ChildMorph.prototype.goneMethod'), '(b) missing proto method flagged');
  assert(
    r.find((f) => f.key === 'ChildMorph.prototype.goneMethod').severity === 'error',
    '(b) severity error'
  );
  console.log('  (b) X.prototype.goneMethod() -> finding: PASS');

  // (c) inherited method via chain -> no finding.
  r = synthRun('ChildMorph.prototype.inheritedMethod();\n');
  assert(
    !hasKey(r, 'ChildMorph.prototype.inheritedMethod'),
    '(c) inherited method not flagged'
  );
  console.log('  (c) inherited method via chain -> no finding: PASS');

  // (d) new UnknownMorph() -> finding.
  r = synthRun('var x = new UnknownMorph();\n');
  assert(hasKey(r, 'UnknownMorph'), '(d) unknown constructor flagged');
  console.log('  (d) new UnknownMorph() -> finding: PASS');

  // (e) new Map() -> no finding.
  r = synthRun('var m = new Map();\n');
  assert(!hasKey(r, 'Map'), '(e) JS global Map not flagged');
  console.log('  (e) new Map() -> no finding: PASS');

  // (f) assignment X.prototype.newThing = function(){} -> no finding, AND a
  //     later read of it passes because the write defines it locally.
  r = synthRun(
    'ChildMorph.prototype.newThing = function () { return 1; };\n' +
      'ChildMorph.prototype.newThing();\n'
  );
  assert(!hasKey(r, 'ChildMorph.prototype.newThing'), '(f) defined-then-read not flagged');
  console.log('  (f) write position + later read -> no finding: PASS');

  // (f2) sanity: a pure write with no definition merged is still not flagged
  //      (write position skipped) even for an otherwise-missing member.
  r = synthRun('ChildMorph.prototype.brandNew = 42;\n');
  assert(!hasKey(r, 'ChildMorph.prototype.brandNew'), '(f2) pure write not flagged');
  console.log('  (f2) pure write of missing member -> no finding: PASS');

  // (g) deep heuristic: this.missingMethod() inside a prototype method.
  const deepSrc =
    'ChildMorph.prototype.tut = function () {\n' +
    '  this.realMethod();\n' +
    '  this.missingMethod();\n' +
    '};\n';
  const noDeep = synthRun(deepSrc);
  assert(!hasKey(noDeep, 'this.missingMethod'), '(g) deep off -> no this-call finding');
  console.log('  (g) deepTutorials off -> this.missingMethod() not flagged: PASS');

  const withDeep = synthRun(deepSrc, { deepTutorials: true });
  const deepHit = withDeep.find((f) => f.key === 'this.missingMethod');
  assert(deepHit, '(g) deep on -> this.missingMethod() flagged');
  assert(deepHit.severity === 'warning', '(g) deep finding is a warning');
  assert(
    !hasKey(withDeep, 'this.realMethod'),
    '(g) deep on -> this.realMethod() (exists) not flagged'
  );
  console.log('  (g) deepTutorials on -> this.missingMethod() warning only: PASS');

  // (h) dedupe: repeated missing reference collapses to one finding w/ count.
  r = synthRun(
    'ChildMorph.prototype.goneMethod();\nChildMorph.prototype.goneMethod();\n'
  );
  const dupHits = r.filter((f) => f.key === 'ChildMorph.prototype.goneMethod');
  assert(dupHits.length === 1, '(h) dedupe collapses to one finding');
  assert(/2 occurrences/.test(dupHits[0].message), '(h) occurrence count mentioned');
  assert(dupHits[0].where.line === 1, '(h) first line wins');
  console.log('  (h) dedupe by key (first line wins, count mentioned): PASS');

  // (i) X not a known constructor -> X.prototype.y and X.y skipped (local var).
  r = synthRun('someLocal.prototype.whatever();\nsomeLocal.field;\n');
  assert(r.length === 0, '(i) non-constructor identifier skipped');
  console.log('  (i) unknown identifier (local var) -> no finding: PASS');

  // (j) static member read resolves; unknown static flagged.
  r = synthRun('var a = ChildMorph.aStatic;\nvar b = ChildMorph.noStatic;\n');
  assert(!hasKey(r, 'ChildMorph.aStatic'), '(j) real static not flagged');
  assert(hasKey(r, 'ChildMorph.noStatic'), '(j) missing static flagged');
  console.log('  (j) static resolution (real ok, missing flagged): PASS');

  console.log('');
  console.log('ALL TUTORIALS-SCAN SELFTESTS PASSED');
}

main();
