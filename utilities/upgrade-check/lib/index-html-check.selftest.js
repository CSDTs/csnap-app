#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const createGit = require('./git');
const { run } = require('./index-html-check');

async function selftest() {
  const repoRoot = path.resolve(__dirname, '../../..');
  const git = createGit(repoRoot);

  // Detect current vendored SHA
  const { sha: currentSha } = git.detectVendoredSha();
  const targetSha = currentSha;

  console.log(`Testing index-html-check with SHA ${currentSha.slice(0, 12)}`);
  console.log('');

  // Test 1: Real index.html against itself
  console.log('Test 1: Real index.html (target === current)');
  const ctx1 = {
    repoRoot,
    mode: 'against',
    git,
    currentSha,
    targetSha,
  };

  const findings1 = run(ctx1);
  const errors1 = findings1.filter(f => f.category === 'INDEX-MISSING-FILE' && f.severity === 'error');
  const newSrcs1 = findings1.filter(f => f.category === 'NEW-UPSTREAM-SRC');
  const loadOrderErrors1 = findings1.filter(f => f.category === 'LOAD-ORDER' && f.severity === 'error');
  const staleVersions1 = findings1.filter(f => f.category === 'STALE-VERSION');

  console.log(`  INDEX-MISSING-FILE errors: ${errors1.length} (expected: 0)`);
  if (errors1.length > 0) {
    console.error('  ERROR: Found unexpected missing file errors:');
    errors1.forEach(f => console.error(`    ${f.key}: ${f.message}`));
    process.exit(1);
  }

  console.log(`  NEW-UPSTREAM-SRC warnings: ${newSrcs1.length} (expected: 0)`);
  if (newSrcs1.length > 0) {
    console.error('  ERROR: Found unexpected new upstream source warnings:');
    newSrcs1.forEach(f => console.error(`    ${f.key}: ${f.message}`));
    process.exit(1);
  }

  console.log(`  LOAD-ORDER errors: ${loadOrderErrors1.length} (expected: 0)`);
  if (loadOrderErrors1.length > 0) {
    console.error('  ERROR: Found unexpected load order errors:');
    loadOrderErrors1.forEach(f => console.error(`    ${f.key}: ${f.message}`));
    process.exit(1);
  }

  if (staleVersions1.length > 0) {
    console.log(`  STALE-VERSION warnings: ${staleVersions1.length} (these are OK, printing them)`);
    staleVersions1.forEach(f => {
      console.log(`    ${f.key}: ${f.message}`);
    });
  } else {
    console.log(`  STALE-VERSION warnings: 0`);
  }

  console.log('  PASS');
  console.log('');

  // Test 2: Synthetic tests
  console.log('Test 2: Synthetic index.html checks');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csnap-selftest-'));
  const tmpIndexPath = path.join(tmpDir, 'index.html');

  try {
    // Test 2a: Missing snap/src file
    const synthIndex2a = `<!doctype html>
<html>
<head>
  <script src="./snap/src/notreal.js?version=2025-08-23"></script>
</head>
<body></body>
</html>`;

    fs.writeFileSync(tmpIndexPath, synthIndex2a, 'utf8');

    const ctx2a = {
      repoRoot,
      mode: 'against',
      git,
      currentSha,
      targetSha,
      indexHtmlPath: tmpIndexPath,
    };

    const findings2a = run(ctx2a);
    const missing2a = findings2a.filter(f => f.category === 'INDEX-MISSING-FILE' && f.key === 'notreal.js');
    console.log(`  Test 2a (missing snap/src file): ${missing2a.length > 0 ? 'PASS' : 'FAIL'}`);
    if (missing2a.length === 0) {
      console.error('  ERROR: Should have found INDEX-MISSING-FILE for notreal.js');
      process.exit(1);
    }

    // Test 2b: LOAD-ORDER violation
    const synthIndex2b = `<!doctype html>
<html>
<head>
  <script src="./csnap/gui.js"></script>
  <script src="./snap/src/gui.js?version=2025-08-23"></script>
</head>
<body></body>
</html>`;

    fs.writeFileSync(tmpIndexPath, synthIndex2b, 'utf8');

    const ctx2b = {
      repoRoot,
      mode: 'against',
      git,
      currentSha,
      targetSha,
      indexHtmlPath: tmpIndexPath,
    };

    const findings2b = run(ctx2b);
    const loadOrder2b = findings2b.filter(f => f.category === 'LOAD-ORDER' && f.key === 'gui.js');
    console.log(`  Test 2b (LOAD-ORDER violation): ${loadOrder2b.length > 0 ? 'PASS' : 'FAIL'}`);
    if (loadOrder2b.length === 0) {
      console.error('  ERROR: Should have found LOAD-ORDER error for gui.js');
      process.exit(1);
    }

    // Test 2c: Missing cache-bust version
    const synthIndex2c = `<!doctype html>
<html>
<head>
  <script src="./snap/src/gui.js"></script>
</head>
<body></body>
</html>`;

    fs.writeFileSync(tmpIndexPath, synthIndex2c, 'utf8');

    const ctx2c = {
      repoRoot,
      mode: 'against',
      git,
      currentSha,
      targetSha,
      indexHtmlPath: tmpIndexPath,
    };

    const findings2c = run(ctx2c);
    const noVersion2c = findings2c.filter(f => f.category === 'STALE-VERSION' && f.key === 'gui.js');
    console.log(`  Test 2c (missing version): ${noVersion2c.length > 0 ? 'PASS' : 'FAIL'}`);
    if (noVersion2c.length === 0) {
      console.error('  ERROR: Should have found STALE-VERSION warning for missing version');
      process.exit(1);
    }

    console.log('  All synthetic tests passed');
    console.log('');

    console.log('ALL INDEX-HTML SELFTESTS PASSED');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

selftest().catch(err => {
  console.error('Selftest failed:', err);
  process.exit(1);
});
