'use strict';

// Runnable self-test for lib/git.js against this repo's known state.
// Usage: node lib/git.selftest.js   (run from utilities/upgrade-check/)
// Does NOT call fetchSnap() or touch the network — relies on refs already
// present locally.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const createGit = require('./git');

const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const git = createGit(repoRoot);

const tmpFiles = [];
function tmpFile(name, content) {
  const p = path.join(os.tmpdir(), `upgrade-check-selftest-${process.pid}-${name}`);
  fs.writeFileSync(p, content);
  tmpFiles.push(p);
  return p;
}

try {
  // --- detectVendoredSha ---
  const detected = git.detectVendoredSha();
  assert.ok(
    detected.sha.startsWith('53707ff0'),
    `expected detected sha to start with 53707ff0, got ${detected.sha}`
  );
  assert.strictEqual(detected.verified, true, 'expected detectVendoredSha().verified === true');
  console.log('OK detectVendoredSha ->', detected);

  // --- resolveTargetRef ---
  const master = git.resolveTargetRef('master');
  assert.strictEqual(master.refName, 'snap/master');
  assert.match(master.sha, /^[0-9a-f]{40}$/);
  console.log('OK resolveTargetRef(master) ->', master);

  const bySha = git.resolveTargetRef('53707ff0');
  assert.ok(bySha.sha.startsWith('53707ff0'), `expected sha to start with 53707ff0, got ${bySha.sha}`);
  console.log('OK resolveTargetRef(53707ff0) ->', bySha);

  // --- showFile ---
  const guiJs = git.showFile(detected.sha, 'src/gui.js');
  assert.ok(typeof guiJs === 'string' && guiJs.length > 0, 'expected non-empty src/gui.js content');
  assert.ok(guiJs.includes('IDE_Morph'), 'expected src/gui.js to mention IDE_Morph');
  console.log('OK showFile(sha, src/gui.js) length =', guiJs.length);

  const missing = git.showFile(detected.sha, 'src/nope-does-not-exist.js');
  assert.strictEqual(missing, null, 'expected showFile to return null for missing path');
  console.log('OK showFile(sha, missing path) -> null');

  // --- listTree ---
  const tree = git.listTree(detected.sha, 'libraries');
  assert.ok(tree.size > 0, 'expected non-empty libraries tree');
  assert.ok(tree.has('libraries/beetle/beetle.js'), 'expected libraries/beetle/beetle.js in tree');
  console.log('OK listTree(sha, libraries) size =', tree.size);

  // --- lastChangeDate ---
  const date = git.lastChangeDate(detected.sha, 'src/gui.js');
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
  console.log('OK lastChangeDate(sha, src/gui.js) ->', date);

  // --- diffNoIndex ---
  const a1 = tmpFile('a1.txt', 'line1\nline2\nline3\n');
  const a2 = tmpFile('a2.txt', 'line1\nCHANGED\nline3\n');
  const diffOut = git.diffNoIndex(a1, a2);
  assert.ok(diffOut.includes('@@'), 'expected diff output to contain a hunk header');
  console.log('OK diffNoIndex(different files) contains @@');

  const same1 = tmpFile('same1.txt', 'identical\ncontent\n');
  const same2 = tmpFile('same2.txt', 'identical\ncontent\n');
  const noDiff = git.diffNoIndex(same1, same2);
  assert.strictEqual(noDiff, '', 'expected empty diff for identical files');
  console.log('OK diffNoIndex(identical files) -> ""');

  // --- mergeFile: clean 3-way ---
  // NOTE: edits on directly adjacent lines (no unchanged line of context
  // between them) are treated as a conflict by git's merge algorithm even
  // when they touch different lines — this is standard diff3/RCS-merge
  // behavior, not a bug in mergeFile(). Use non-adjacent edits so this case
  // is genuinely clean.
  const base1 = tmpFile('base1.txt', 'a\nb\nx\nc\n');
  const ours1 = tmpFile('ours1.txt', 'a\nB\nx\nc\n');
  const theirs1 = tmpFile('theirs1.txt', 'a\nb\nx\nC\n');
  const cleanMerge = git.mergeFile(ours1, base1, theirs1, {
    ours: 'ours',
    base: 'base',
    theirs: 'theirs',
  });
  assert.strictEqual(cleanMerge.conflicted, false, 'expected clean merge to not conflict');
  assert.ok(cleanMerge.merged.includes('B'), 'expected merged content to include B');
  assert.ok(cleanMerge.merged.includes('C'), 'expected merged content to include C');
  console.log('OK mergeFile(clean 3-way) -> conflicted=false, merged has B and C');

  // --- mergeFile: conflicting edit ---
  const base2 = tmpFile('base2.txt', 'a\nb\nc\n');
  const ours2 = tmpFile('ours2.txt', 'a\nX\nc\n');
  const theirs2 = tmpFile('theirs2.txt', 'a\nY\nc\n');
  const conflictMerge = git.mergeFile(ours2, base2, theirs2, {
    ours: 'ours',
    base: 'base',
    theirs: 'theirs',
  });
  assert.strictEqual(conflictMerge.conflicted, true, 'expected conflicting merge to report conflicted');
  assert.ok(conflictMerge.merged.includes('<<<<<<<'), 'expected conflict markers in merged output');
  console.log('OK mergeFile(conflicting edit) -> conflicted=true, merged has <<<<<<<');

  console.log('ALL GIT SELFTESTS PASSED');
} finally {
  for (const p of tmpFiles) {
    try {
      fs.unlinkSync(p);
    } catch (err) {
      // ignore
    }
  }
}
