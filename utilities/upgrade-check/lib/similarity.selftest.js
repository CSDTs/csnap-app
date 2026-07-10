#!/usr/bin/env node
'use strict';

// Runnable self-test for lib/similarity.js.
// Usage: node lib/similarity.selftest.js   (run from utilities/upgrade-check/)
//
// Test 1 (null test): currentSha === targetSha at a real, locally-available
// commit -> zero real change, so zero SIMILAR-FEATURE findings, but
// similar-features.json must still be written (with empty-match groups).
//
// Test 2 (synthetic): fabricate an upstreamTarget with one new symbol
// (`IDE_Morph.prototype.startTutorialWalkthrough`) and stub git.showFile so
// HISTORY.md at targetSha gains one new line mentioning "tutorial". Expect
// >=1 SIMILAR-FEATURE finding whose matched keywords include 'tutorial' and
// whose details mention both the new symbol and the new changelog line.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { execSync } = require('child_process');

const createGit = require('./git');
const { extractUpstreamAt } = require('./extract-upstream');
const { extractCsnapOverrides } = require('./extract-overrides');
const similarity = require('./similarity');

const KNOWN_SHA = '53707ff0d4998095d867be2258f82ad61eb67e12';

function loadKnownCustom(repoRoot) {
  const p = path.join(repoRoot, 'utilities', 'upgrade-check', 'known-custom.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function mkReportDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `csnap-similarity-selftest-${label}-`));
  return dir;
}

async function testNull(repoRoot, git, knownCustom, overrides) {
  console.log('Test 1: null test (currentSha === targetSha, real known-custom.json)');

  const upstream = extractUpstreamAt(git, KNOWN_SHA, repoRoot);
  const reportDir = mkReportDir('null');

  const ctx = {
    repoRoot,
    mode: 'against',
    git,
    currentSha: KNOWN_SHA,
    targetSha: KNOWN_SHA,
    reportDir,
    knownCustom,
    overrides,
    upstreamCurrent: upstream,
    upstreamTarget: upstream,
  };

  const findings = await similarity.run(ctx);
  const similarFindings = findings.filter((f) => f.category === 'SIMILAR-FEATURE' && f.severity !== 'info');

  console.log(`  SIMILAR-FEATURE findings: ${similarFindings.length} (expected: 0)`);
  if (similarFindings.length !== 0) {
    console.error('  ERROR: expected zero SIMILAR-FEATURE findings for the null test');
    similarFindings.forEach((f) => console.error(`    ${f.key}: ${f.message}`));
    process.exit(1);
  }

  const jsonPath = path.join(reportDir, 'similar-features.json');
  assert.ok(fs.existsSync(jsonPath), 'expected similar-features.json to be written');
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.ok(Array.isArray(payload.groups), 'expected payload.groups to be an array');
  assert.ok(payload.groups.length > 0, 'expected at least one group derived from known-custom.json');
  for (const g of payload.groups) {
    assert.strictEqual(g.matches.length, 0, `expected group ${g.label} to have zero matches in the null test`);
  }
  assert.strictEqual(payload.generatedFor.currentSha, KNOWN_SHA);
  assert.strictEqual(payload.generatedFor.targetSha, KNOWN_SHA);

  console.log(`  similar-features.json written with ${payload.groups.length} groups, all empty. PASS`);

  // A few sanity samples of what buildGroups produced from the real data.
  const groups = similarity.buildGroups(knownCustom);
  console.log(`  buildGroups() -> ${groups.length} groups from known-custom.json; sample:`);
  // The tutorial entries are hand-curated into one 'tutorial-mode' feature
  // group in known-custom.json (feature field), so they merge rather than
  // standing alone — and the merged group keeps the sensitive match rule.
  const tutorialGroup = groups.find((g) => g.label === 'tutorial-mode');
  assert.ok(tutorialGroup, "expected the curated 'tutorial-mode' feature group");
  assert.ok(tutorialGroup.curated, 'feature groups must be marked curated');
  assert.ok(
    tutorialGroup.keys.includes('IDE_Morph.prototype.toggleTutorialMode'),
    'tutorial-mode group should contain toggleTutorialMode'
  );
  console.log(`    ${tutorialGroup.label} -> keys: ${tutorialGroup.keys.length}, keywords: [${Array.from(tutorialGroup.keywords).join(', ')}]`);
  for (const g of groups.slice(0, 5)) {
    console.log(`    ${g.label} -> keys: ${g.keys.length}, keywords: [${Array.from(g.keywords).join(', ')}]`);
  }

  fs.rmSync(reportDir, { recursive: true, force: true });
  console.log('  PASS');
  console.log('');
}

async function testSynthetic(repoRoot, git, knownCustom, overrides) {
  console.log('Test 2: synthetic test (fake new symbol + fake HISTORY.md line)');

  const upstreamCurrent = extractUpstreamAt(git, KNOWN_SHA, repoRoot);

  // Clone the current maps/lists and inject one fake new symbol.
  const fakeByKey = new Map(upstreamCurrent.byKey);
  const fakeKey = 'IDE_Morph.prototype.startTutorialWalkthrough';
  fakeByKey.set(fakeKey, {
    file: 'src/gui.js',
    line: 1,
    prop: 'startTutorialWalkthrough',
    object: 'IDE_Morph',
    kind: 'prototype-method',
    key: fakeKey,
  });

  const upstreamTarget = {
    byKey: fakeByKey,
    files: upstreamCurrent.files,
    srcFileList: upstreamCurrent.srcFileList.slice(),
  };

  const realHistory = git.showFile(KNOWN_SHA, 'HISTORY.md') || '';
  const fakeHistory = realHistory + '\n* new interactive tutorial player in the IDE\n';
  const fakeTargetSha = 'FAKE-TARGET-SHA';

  // Stub git: only showFile('HISTORY.md') differs by sha; everything else
  // delegates to the real git module so listTree/etc still work if touched.
  const stubGit = Object.assign({}, git, {
    showFile(sha, filePath) {
      if (filePath === 'HISTORY.md') {
        if (sha === fakeTargetSha) return fakeHistory;
        return realHistory;
      }
      return git.showFile(sha, filePath);
    },
  });

  const reportDir = mkReportDir('synthetic');

  const ctx = {
    repoRoot,
    mode: 'against',
    git: stubGit,
    currentSha: KNOWN_SHA,
    targetSha: fakeTargetSha,
    reportDir,
    knownCustom,
    overrides,
    upstreamCurrent,
    upstreamTarget,
  };

  const findings = await similarity.run(ctx);
  const similarFindings = findings.filter((f) => f.category === 'SIMILAR-FEATURE' && f.severity === 'warning');

  console.log(`  SIMILAR-FEATURE findings: ${similarFindings.length} (expected: >= 1)`);
  if (similarFindings.length < 1) {
    console.error('  ERROR: expected at least one SIMILAR-FEATURE finding');
    process.exit(1);
  }

  const tutorialFinding = similarFindings.find((f) =>
    f.message.toLowerCase().includes('tutorial')
  );
  assert.ok(tutorialFinding, 'expected a finding whose message mentions "tutorial"');
  console.log(`  matched finding key: ${tutorialFinding.key}`);
  console.log(`  message: ${tutorialFinding.message}`);

  assert.ok(
    /matched: [^)]*tutorial/i.test(tutorialFinding.message),
    `expected matched keywords in message to include 'tutorial', got: ${tutorialFinding.message}`
  );

  assert.ok(
    tutorialFinding.details.includes(fakeKey),
    `expected details to mention the fake symbol ${fakeKey}\ndetails:\n${tutorialFinding.details}`
  );
  assert.ok(
    tutorialFinding.details.includes('new interactive tutorial player in the IDE'),
    `expected details to mention the fake changelog line\ndetails:\n${tutorialFinding.details}`
  );
  assert.ok(
    tutorialFinding.details.includes('/compare-feature'),
    'expected details to include the /compare-feature pointer'
  );

  const jsonPath = path.join(reportDir, 'similar-features.json');
  assert.ok(fs.existsSync(jsonPath), 'expected similar-features.json to be written');
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const tutorialGroup = payload.groups.find((g) => g.label === tutorialFinding.key);
  assert.ok(tutorialGroup, 'expected the matched group to be present in similar-features.json');
  assert.ok(tutorialGroup.matches.length >= 2, 'expected the group to have both the symbol and changelog matches');

  fs.rmSync(reportDir, { recursive: true, force: true });
  console.log('  PASS');
  console.log('');
}

async function testCapAndTokenizers() {
  console.log('Test 3: unit checks (tokenizers, matcher, stopword filtering)');

  // 'toggle' and 'mode' are Snap!-domain stopwords; only 'tutorial' survives.
  assert.deepStrictEqual(
    similarity.tokenizeSymbol('IDE_Morph.prototype.toggleTutorialMode'),
    ['tutorial']
  );
  // 'new' is a stopword, so it is filtered out; 'onboarding'/'wizard' remain.
  assert.deepStrictEqual(similarity.tokenizeFile('src/newOnboardingWizard.js'), [
    'onboarding',
    'wizard',
  ]);
  assert.ok(similarity.tokenizeChangelog('* Added a brand NEW Tutorial system').includes('tutorial'));
  assert.ok(!similarity.tokenizeChangelog('the and for via').length, 'stopwords/short words should be dropped');

  // Matcher: single short keyword should NOT qualify on its own.
  const shortGroup = { keywords: new Set(['fit']) };
  assert.strictEqual(similarity.matchGroupToTokens(shortGroup, ['fit', 'other']), null);

  // Matcher: single keyword >=4 chars qualifies.
  const longGroup = { keywords: new Set(['tutorial']) };
  assert.deepStrictEqual(similarity.matchGroupToTokens(longGroup, ['tutorial', 'mode']), ['tutorial']);

  // Matcher: two short keywords together qualify.
  const twoShortGroup = { keywords: new Set(['fit', 'stl']) };
  assert.deepStrictEqual(
    similarity.matchGroupToTokens(twoShortGroup, ['fit', 'stl', 'export']),
    ['fit', 'stl']
  );

  console.log('  PASS');
  console.log('');
}

async function selftest() {
  const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  const git = createGit(repoRoot);
  const knownCustom = loadKnownCustom(repoRoot);
  const overrides = extractCsnapOverrides(repoRoot);

  await testCapAndTokenizers();
  await testNull(repoRoot, git, knownCustom, overrides);
  await testSynthetic(repoRoot, git, knownCustom, overrides);

  console.log('ALL SIMILARITY SELFTESTS PASSED');
}

selftest().catch((err) => {
  console.error('Selftest failed:', err);
  process.exit(1);
});
