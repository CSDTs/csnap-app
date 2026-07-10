'use strict';

// Runnable self-test for lib/libraries-check.js against this repo's known
// state. Usage: node lib/libraries-check.selftest.js  (run from
// utilities/upgrade-check/). Relies on refs already present locally (does
// not call fetchSnap()).

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const createGit = require('./git');
const librariesCheck = require('./libraries-check');

const repoRoot = path.resolve(__dirname, '../../..');
const git = createGit(repoRoot);

const CURRENT_SHA = '53707ff0d4998095d867be2258f82ad61eb67e12';

function freshReportDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `libraries-check-selftest-${label}-`));
  return dir;
}

function assertShapeOk(findings) {
  assert.ok(Array.isArray(findings), 'run() should return an array');
  for (const f of findings) {
    assert.ok(f.id, `finding missing id: ${JSON.stringify(f)}`);
    assert.ok(f.severity, `finding missing severity: ${JSON.stringify(f)}`);
    assert.ok(f.category, `finding missing category: ${JSON.stringify(f)}`);
    assert.ok(f.message, `finding missing message: ${JSON.stringify(f)}`);
    assert.ok(
      ['error', 'warning', 'info'].includes(f.severity),
      `finding has bogus severity: ${f.severity}`
    );
    if (f.artifacts && f.artifacts.diff) {
      const abs = path.join(reportDirForAssert, f.artifacts.diff);
      assert.ok(fs.existsSync(abs), `artifact diff missing on disk: ${abs}`);
    }
  }
}

let reportDirForAssert; // set per-test before assertShapeOk runs

function printFindings(findings) {
  for (const f of findings) {
    console.log(`  [${f.severity}] ${f.category} ${f.id} — ${f.message}`);
  }
}

// --- 'check' mode short-circuit --------------------------------------------

{
  const ctx = {
    repoRoot,
    mode: 'check',
    git,
    currentSha: CURRENT_SHA,
    reportDir: freshReportDir('checkmode'),
  };
  const findings = librariesCheck.run(ctx);
  assert.deepStrictEqual(findings, [], "'check' mode must return []");
  console.log("OK 'check' mode short-circuits to []");
}

// --- NULL TEST: current === target -----------------------------------------

{
  const reportDir = freshReportDir('null');
  reportDirForAssert = reportDir;
  const ctx = {
    repoRoot,
    mode: 'against',
    git,
    currentSha: CURRENT_SHA,
    targetSha: CURRENT_SHA,
    targetRefName: 'null-test',
    reportDir,
  };
  const findings = librariesCheck.run(ctx);
  assertShapeOk(findings);

  console.log(`\nNULL TEST findings (current == target, ${findings.length} total):`);
  printFindings(findings);

  const beetleSummary = findings.find((f) => f.id === 'lib-beetle:summary');
  assert.ok(beetleSummary, 'expected a beetle summary finding');
  assert.strictEqual(beetleSummary.severity, 'info', 'null test beetle summary should be info');
  assert.match(beetleSummary.message, /unchanged/);

  const nonBeetleNonJson = findings.filter(
    (f) => !f.id.startsWith('lib-beetle:') && f.id !== 'lib-new:LIBRARIES.json'
  );
  assert.deepStrictEqual(
    nonBeetleNonJson,
    [],
    `expected zero CHANGED/NEW/REMOVED-derived findings in null test, got: ${JSON.stringify(nonBeetleNonJson, null, 2)}`
  );

  assert.ok(!fs.existsSync(path.join(reportDir, 'tmp')), 'tmp dir should be cleaned up (null test)');
  console.log('OK null test: only beetle summary (info, unchanged) [+ optional LIBRARIES.json finding]');
}

// --- REAL-DELTA TEST: current -> resolved 41c6ed9e --------------------------

{
  const reportDir = freshReportDir('delta');
  reportDirForAssert = reportDir;
  const target = git.resolveTargetRef('41c6ed9e');
  const ctx = {
    repoRoot,
    mode: 'against',
    git,
    currentSha: CURRENT_SHA,
    targetSha: target.sha,
    targetRefName: target.refName,
    reportDir,
  };

  const cur = git.listTree(ctx.currentSha, 'libraries');
  const tgt = git.listTree(ctx.targetSha, 'libraries');
  let changed = 0;
  let added = 0;
  let removed = 0;
  for (const [p, e] of cur) {
    if (!tgt.has(p)) removed++;
    else if (tgt.get(p).oid !== e.oid) changed++;
  }
  for (const p of tgt.keys()) {
    if (!cur.has(p)) added++;
  }
  console.log(
    `\nREAL-DELTA TEST classification vs ${ctx.targetSha.slice(0, 10)} (${target.refName}): ` +
      `changed=${changed} new=${added} removed=${removed}`
  );

  const findings = librariesCheck.run(ctx);
  assertShapeOk(findings);

  console.log(`REAL-DELTA TEST findings (${findings.length} total):`);
  printFindings(findings);

  assert.ok(Array.isArray(findings), 'run() should return an array');

  const beetleSummary = findings.find((f) => f.id === 'lib-beetle:summary');
  assert.ok(beetleSummary, 'expected a beetle summary finding in real-delta test too');

  assert.ok(!fs.existsSync(path.join(reportDir, 'tmp')), 'tmp dir should be cleaned up (real-delta test)');
  console.log('OK real-delta test ran to completion with well-formed findings');
}

console.log('\nALL LIBRARIES SELFTESTS PASSED');
