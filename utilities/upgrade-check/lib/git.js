'use strict';

// Git plumbing layer for upgrade-check. Plain CommonJS, node builtins only.
//
// Conventions this file encodes (see README.md "Git conventions"):
//  - Upstream Snap! lives as a git subtree at snap/; remote `snap` points at
//    github.com/jmoenig/Snap.git.
//  - On the `snap` remote (and inside squash-merge commits), tree paths are
//    ROOT-relative (`src/gui.js`), NOT `snap/src/gui.js`. Only `HEAD:snap/...`
//    lookups against *this* repo's HEAD need the `snap/` prefix.
//  - All reads at a ref go through `git show`/`git ls-tree` — never a checkout.

const { execFileSync, spawnSync } = require('child_process');

const MAX_BUFFER = 64 * 1024 * 1024;
const HEX_RE = /^[0-9a-f]{4,40}$/i;

// showFile() detects "path absent at ref" by matching git's English stderr
// text, so force the C locale — a localized git would break that contract
// for every module that relies on the null return.
const GIT_ENV = { ...process.env, LANG: 'C', LC_ALL: 'C' };

function createGit(repoRoot) {
  function raw(args, opts) {
    try {
      return execFileSync('git', args, {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: MAX_BUFFER,
        env: GIT_ENV,
        ...opts,
      });
    } catch (err) {
      const stderr = err.stderr ? err.stderr.toString() : '';
      throw new Error(
        `git ${args.join(' ')} failed: ${stderr.trim() || err.message}`
      );
    }
  }

  function run(args, opts) {
    // Non-throwing helper for callers that need to inspect the exit status.
    const result = spawnSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
      env: GIT_ENV,
      ...opts,
    });
    if (result.error) throw result.error;
    return result;
  }

  function fetchSnap() {
    try {
      raw(['remote', 'get-url', 'snap']);
    } catch (err) {
      throw new Error(
        "git remote 'snap' is not configured (expected it to point at " +
          'https://github.com/jmoenig/Snap.git). Add it with: ' +
          'git remote add snap https://github.com/jmoenig/Snap.git'
      );
    }
    raw(['fetch', 'snap', '--tags']);
  }

  function resolveTargetRef(ref) {
    const tried = [];

    if (HEX_RE.test(ref)) {
      const result = run(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
      tried.push(`sha:${ref}`);
      if (result.status === 0) {
        return { sha: result.stdout.trim(), refName: ref };
      }
    }

    const remoteRef = `refs/remotes/snap/${ref}`;
    tried.push(remoteRef);
    let result = run(['rev-parse', '--verify', '--quiet', `${remoteRef}^{commit}`]);
    if (result.status === 0) {
      return { sha: result.stdout.trim(), refName: `snap/${ref}` };
    }

    const tagRef = `refs/tags/${ref}`;
    tried.push(tagRef);
    result = run(['rev-parse', '--verify', '--quiet', `${tagRef}^{commit}`]);
    if (result.status === 0) {
      return { sha: result.stdout.trim(), refName: `tags/${ref}` };
    }

    throw new Error(
      `could not resolve target ref '${ref}'. Tried: ${tried.join(', ')}. ` +
        "Run 'git fetch snap --tags' if this ref was added upstream recently."
    );
  }

  const SQUASH_CHANGES_RE = /^Squashed 'snap\/' changes from [0-9a-f]+\.\.([0-9a-f]+)$/;
  const SQUASH_CONTENT_RE = /^Squashed 'snap\/' content from commit ([0-9a-f]+)$/;

  function verifyShaAgainstVendoredTree(sha) {
    // `git diff --quiet <commit> HEAD:snap` compares a commit against a
    // tree-ish; exit 0 = identical, exit 1 = differs, anything else = error.
    const result = run(['diff', '--quiet', sha, 'HEAD:snap']);
    if (result.status === 0) return true;
    if (result.status === 1) return false;
    throw new Error(
      `git diff --quiet ${sha} HEAD:snap failed unexpectedly (status ${result.status}): ${result.stderr}`
    );
  }

  function detectVendoredSha() {
    let subject;
    try {
      subject = raw(['log', '--grep', "^Squashed 'snap/'", '-1', '--format=%s']).trim();
    } catch (err) {
      subject = '';
    }

    if (subject) {
      const match = SQUASH_CHANGES_RE.exec(subject) || SQUASH_CONTENT_RE.exec(subject);
      if (match) {
        const abbrev = match[1];
        const expand = run(['rev-parse', '--verify', '--quiet', `${abbrev}^{commit}`]);
        if (expand.status === 0) {
          const sha = expand.stdout.trim();
          const verified = verifyShaAgainstVendoredTree(sha);
          return { sha, verified };
        }
        // sha object missing locally (e.g. shallow clone / no fetch yet) -> fall through
      }
    }

    // Fallback: match the current snap/ tree oid against commits reachable
    // from the snap remote's master, in case the squash-subject sha isn't
    // available locally.
    let treeWanted;
    try {
      treeWanted = raw(['rev-parse', 'HEAD:snap']).trim();
    } catch (err) {
      throw new Error(
        "could not determine vendored upstream sha: no 'Squashed \\'snap/\\'' " +
          "commit found in history and HEAD:snap could not be resolved. " +
          "Run 'git fetch snap' and retry."
      );
    }

    let log;
    try {
      log = raw(['log', '--format=%H %T', 'refs/remotes/snap/master']);
    } catch (err) {
      log = '';
    }

    for (const line of log.split('\n')) {
      if (!line) continue;
      const [commitSha, treeSha] = line.split(' ');
      if (treeSha === treeWanted) {
        return { sha: commitSha, verified: true, viaTreeMatch: true };
      }
    }

    throw new Error(
      "could not determine vendored upstream sha: no 'Squashed \\'snap/\\'' " +
        'commit found in history, and no commit on refs/remotes/snap/master ' +
        "has a matching tree. Run 'git fetch snap' and retry."
    );
  }

  function showFile(sha, path) {
    const result = run(['show', `${sha}:${path}`]);
    if (result.status === 0) return result.stdout;
    const stderr = result.stderr || '';
    if (
      stderr.includes('does not exist') ||
      stderr.includes('exists on disk, but not in')
    ) {
      return null;
    }
    throw new Error(`git show ${sha}:${path} failed: ${stderr.trim()}`);
  }

  function listTree(sha, prefix) {
    const map = new Map();
    const result = run(['ls-tree', '-r', '-l', sha, '--', prefix]);
    if (result.status !== 0) {
      // Non-existent prefix -> empty tree, not an error.
      return map;
    }
    const lines = result.stdout.split('\n').filter(Boolean);
    for (const line of lines) {
      const tabIdx = line.indexOf('\t');
      if (tabIdx === -1) continue;
      const meta = line.slice(0, tabIdx).trim().split(/\s+/);
      const path = line.slice(tabIdx + 1);
      const [, type, oid, size] = meta;
      if (type !== 'blob') continue;
      map.set(path, { oid, size: size === '-' ? null : Number(size) });
    }
    return map;
  }

  function lastChangeDate(sha, path) {
    const out = raw(['log', '-1', '--format=%cs', sha, '--', path]).trim();
    return out || null;
  }

  function hashObjectOfFile(absPath) {
    return raw(['hash-object', absPath]).trim();
  }

  function diffNoIndex(fileA, fileB, contextLines) {
    const n = contextLines === undefined ? 5 : contextLines;
    const result = run(['diff', '--no-index', `--unified=${n}`, '--', fileA, fileB]);
    if (result.status === 0) return '';
    if (result.status === 1) return result.stdout;
    throw new Error(
      `git diff --no-index failed unexpectedly (status ${result.status}): ${result.stderr}`
    );
  }

  function mergeFile(oursPath, basePath, theirsPath, labels) {
    const args = [
      'merge-file',
      '-p',
      '--diff3',
      '-L', labels.ours,
      '-L', labels.base,
      '-L', labels.theirs,
      oursPath,
      basePath,
      theirsPath,
    ];
    const result = run(args);
    const status = result.status;
    if (status === null || status < 0 || status > 127) {
      throw new Error(
        `git merge-file failed unexpectedly (status ${status}): ${result.stderr}`
      );
    }
    return { merged: result.stdout, conflicted: status > 0 };
  }

  return {
    raw,
    fetchSnap,
    resolveTargetRef,
    detectVendoredSha,
    showFile,
    listTree,
    lastChangeDate,
    hashObjectOfFile,
    diffNoIndex,
    mergeFile,
  };
}

module.exports = createGit;
