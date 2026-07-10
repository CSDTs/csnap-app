'use strict';

// libraries-check.js — compares upstream snap/libraries/* between the
// currently-vendored ref and a target ref, and relates that to what has
// actually been copied into repo-root libraries/ (see README.md "Libraries"
// and utilities/copy-libraries.sh / update-csnap.sh for the copy convention:
// upstream snap/libraries/<rel> lands at repo-root libraries/<rel>, verbatim,
// EXCEPT libraries/LIBRARIES.json which is a hand-maintained local palette
// index, and libraries/beetle/ which is a local fork (anansebot.js has no
// upstream counterpart at all).
//
// Only meaningful in 'against' mode — 'check' mode has no target ref to diff
// against, so run() returns [] immediately.

const fs = require('fs');
const path = require('path');

const LIB_PREFIX = 'libraries/';
const LIBRARIES_JSON_PATH = 'libraries/LIBRARIES.json';
const BEETLE_PREFIX = 'libraries/beetle/';
const MAX_DIFF_BYTES = 512 * 1024;
const EXCLUDED_EXT_RE = /\.(min\.js|map|png|jpe?g|gif|svg|stl|obj|babylon|glb|gltf)$/i;
const JSON_LIST_CAP = 30;

function isLibrariesJson(upath) {
  return upath === LIBRARIES_JSON_PATH;
}

function isBeetle(upath) {
  return upath.startsWith(BEETLE_PREFIX);
}

function relUnderLibraries(upath) {
  return upath.slice(LIB_PREFIX.length);
}

// Group a list of upstream paths by their first path segment under
// libraries/: top-level files stay individual, everything nested collapses
// into one entry per directory.
function groupByDir(paths) {
  const dirs = new Map();
  const top = [];
  for (const p of paths) {
    const rel = relUnderLibraries(p);
    const slash = rel.indexOf('/');
    if (slash === -1) {
      top.push(p);
    } else {
      const dir = rel.slice(0, slash);
      if (!dirs.has(dir)) dirs.set(dir, []);
      dirs.get(dir).push(p);
    }
  }
  return { dirs, top };
}

function localAbsPath(repoRoot, upath) {
  return path.join(repoRoot, upath);
}

function localOidOf(ctx, upath) {
  const abs = localAbsPath(ctx.repoRoot, upath);
  if (!fs.existsSync(abs)) return null;
  return ctx.git.hashObjectOfFile(abs);
}

// --- generic CHANGED classification (non-beetle, non-LIBRARIES.json) ------

function classifyChanged(ctx, upath, curEntry, tgtEntry, findings) {
  const localOid = localOidOf(ctx, upath);
  if (localOid === null) {
    findings.push({
      id: `lib-update:${upath}`,
      severity: 'info',
      category: 'LIB-UPDATE-AVAILABLE',
      key: upath,
      upstreamFile: upath,
      message: `upstream library changed; not adopted locally (no local copy) — no action needed unless you want it`,
    });
    return;
  }
  if (localOid === tgtEntry.oid) return; // already updated, nothing to say
  if (localOid === curEntry.oid) {
    findings.push({
      id: `lib-update:${upath}`,
      severity: 'info',
      category: 'LIB-UPDATE-AVAILABLE',
      key: upath,
      upstreamFile: upath,
      message: `safe to recopy from target (local copy is an unmodified copy of the current upstream version)`,
    });
    return;
  }
  findings.push({
    id: `lib-conflict:${upath}`,
    severity: 'warning',
    category: 'LIB-CONFLICT',
    key: upath,
    upstreamFile: upath,
    message: `locally modified AND upstream changed — manual merge needed`,
  });
}

// --- generic NEW / REMOVED (collapsed by directory) ------------------------

function emitGrouped(ctx, findings, paths, kind) {
  // kind: 'new' | 'removed'
  const { dirs, top } = groupByDir(paths);
  const category = kind === 'new' ? 'LIB-NEW' : 'LIB-REMOVED';

  for (const upath of top) {
    let message =
      kind === 'new'
        ? `new upstream library file`
        : `upstream library file removed`;
    if (kind === 'removed' && fs.existsSync(localAbsPath(ctx.repoRoot, upath))) {
      message += ' (local copy remains)';
    }
    findings.push({
      id: `lib-${kind}:${upath}`,
      severity: 'info',
      category,
      key: upath,
      upstreamFile: upath,
      message,
    });
  }

  for (const [dir, dirPaths] of dirs) {
    const key = `${LIB_PREFIX}${dir}/ (${dirPaths.length} files)`;
    let message =
      kind === 'new'
        ? `new upstream library directory: ${dirPaths.length} file(s)`
        : `upstream library directory removed: ${dirPaths.length} file(s)`;
    if (kind === 'removed') {
      const anyLocal = dirPaths.some((p) => fs.existsSync(localAbsPath(ctx.repoRoot, p)));
      if (anyLocal) message += ' (local copy remains)';
    }
    findings.push({
      id: `lib-${kind}:${LIB_PREFIX}${dir}/`,
      severity: 'info',
      category,
      key,
      details: dirPaths.map((p) => relUnderLibraries(p)).sort().join('\n'),
      message,
    });
  }
}

// --- LIBRARIES.json palette index ------------------------------------------

function checkLibrariesJson(ctx, findings) {
  let upstreamJson;
  try {
    const raw = ctx.git.showFile(ctx.targetSha, LIBRARIES_JSON_PATH);
    upstreamJson = raw ? JSON.parse(raw) : [];
  } catch (err) {
    findings.push({
      id: 'lib-new:LIBRARIES.json',
      severity: 'info',
      category: 'LIB-NEW',
      key: 'LIBRARIES.json',
      message: `could not parse upstream libraries/LIBRARIES.json at target ref: ${err.message}`,
    });
    return;
  }

  let localJson;
  try {
    const raw = fs.readFileSync(path.join(ctx.repoRoot, LIBRARIES_JSON_PATH), 'utf8');
    localJson = JSON.parse(raw);
  } catch (err) {
    findings.push({
      id: 'lib-new:LIBRARIES.json',
      severity: 'info',
      category: 'LIB-NEW',
      key: 'LIBRARIES.json',
      message: `could not parse local libraries/LIBRARIES.json: ${err.message}`,
    });
    return;
  }

  if (!Array.isArray(upstreamJson) || !Array.isArray(localJson)) return;

  const localNames = new Set(localJson.map((e) => e && e.fileName).filter(Boolean));
  const missing = upstreamJson
    .map((e) => e && e.fileName)
    .filter((name) => name && !localNames.has(name));

  if (missing.length === 0) return;

  let details = missing.slice(0, JSON_LIST_CAP).join(', ');
  if (missing.length > JSON_LIST_CAP) {
    details += `, …and ${missing.length - JSON_LIST_CAP} more`;
  }

  findings.push({
    id: 'lib-new:LIBRARIES.json',
    severity: 'info',
    category: 'LIB-NEW',
    key: 'LIBRARIES.json',
    upstreamFile: LIBRARIES_JSON_PATH,
    message: `${missing.length} upstream library palette entr${missing.length === 1 ? 'y is' : 'ies are'} not indexed in local libraries/LIBRARIES.json`,
    details,
  });
}

// --- beetle special case -----------------------------------------------

function beetleExcludedReason(upath, size) {
  const rel = relUnderLibraries(upath);
  if (rel.split('/').includes('meshes')) return 'meshes/ asset excluded';
  if (EXCLUDED_EXT_RE.test(upath)) return 'binary/generated file type excluded';
  if (typeof size === 'number' && size > MAX_DIFF_BYTES) {
    return `file too large (${size} bytes > ${MAX_DIFF_BYTES} byte limit)`;
  }
  return null;
}

function writeBeetleDiff(ctx, upath, oldText, newText) {
  const tmpDir = path.join(ctx.reportDir, 'tmp');
  const diffsDir = path.join(ctx.reportDir, 'diffs', 'libraries', 'beetle');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(diffsDir, { recursive: true });

  const slug = relUnderLibraries(upath).replace(BEETLE_PREFIX.slice(LIB_PREFIX.length), '').replace(/\//g, '__');
  const oldPath = path.join(tmpDir, `beetle-${slug}.old`);
  const newPath = path.join(tmpDir, `beetle-${slug}.new`);
  fs.writeFileSync(oldPath, oldText || '');
  fs.writeFileSync(newPath, newText || '');

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
  const header = [`# path: ${upath}`, `# ${shaLine}`, '', ''].join('\n');

  const rel = path.join('diffs', 'libraries', 'beetle', `${slug}.diff`);
  fs.writeFileSync(path.join(ctx.reportDir, rel), header + diff);
  return rel;
}

const ANCHOR_REMINDER =
  'local fork anchor is libraries/beetle/anansebot.js — re-port relevant beetle.js changes there';

function checkBeetle(ctx, cur, tgt, findings) {
  const paths = new Set();
  for (const p of cur.keys()) if (isBeetle(p)) paths.add(p);
  for (const p of tgt.keys()) if (isBeetle(p)) paths.add(p);

  const touched = [];
  for (const upath of paths) {
    const curEntry = cur.get(upath);
    const tgtEntry = tgt.get(upath);
    if (curEntry && tgtEntry && curEntry.oid === tgtEntry.oid) continue; // unchanged
    let status;
    if (!curEntry) status = 'new';
    else if (!tgtEntry) status = 'removed';
    else status = 'changed';
    touched.push({ upath, curEntry, tgtEntry, status });
  }

  if (touched.length === 0) {
    findings.push({
      id: 'lib-beetle:summary',
      severity: 'info',
      category: 'LIB-UPDATE-AVAILABLE',
      key: 'libraries/beetle/',
      message: 'upstream beetle library unchanged between refs',
      details: ANCHOR_REMINDER,
    });
    return;
  }

  findings.push({
    id: 'lib-beetle:summary',
    severity: 'warning',
    category: 'LIB-UPDATE-AVAILABLE',
    key: 'libraries/beetle/',
    message: `upstream beetle library changed between refs (${touched.length} file(s)) — see per-file findings`,
    details: ANCHOR_REMINDER,
  });

  for (const { upath, curEntry, tgtEntry, status } of touched) {
    const size = status === 'removed' ? curEntry.size : tgtEntry.size;
    const reason = beetleExcludedReason(upath, size);
    const localOid = localOidOf(ctx, upath);
    const locallyModified = !!(curEntry && localOid !== null && localOid !== curEntry.oid);
    const category = locallyModified ? 'LIB-CONFLICT' : 'LIB-UPDATE-AVAILABLE';

    let message;
    if (status === 'new') message = `new upstream file (not yet present locally)`;
    else if (status === 'removed') {
      message = 'upstream removed this file';
      if (localOid !== null) message += ' (local copy remains)';
    } else {
      message = locallyModified
        ? 'locally modified AND upstream changed — manual merge needed'
        : 'upstream changed; safe to recopy from target';
    }

    const finding = {
      id: `lib-beetle:${upath}`,
      severity: 'warning',
      category,
      key: upath,
      upstreamFile: upath,
      message,
      details: ANCHOR_REMINDER,
    };

    if (reason) {
      finding.details = `changed (diff skipped: ${reason}, size ${size == null ? 'unknown' : size} bytes)\n${ANCHOR_REMINDER}`;
    } else {
      const oldText = status === 'new' ? '' : ctx.git.showFile(ctx.currentSha, upath) || '';
      const newText = status === 'removed' ? '' : ctx.git.showFile(ctx.targetSha, upath) || '';
      const diffRel = writeBeetleDiff(ctx, upath, oldText, newText);
      finding.artifacts = { diff: diffRel };
    }

    findings.push(finding);
  }
}

// --- main --------------------------------------------------------------

function run(ctx) {
  if (ctx.mode !== 'against') return [];

  const findings = [];
  const cur = ctx.git.listTree(ctx.currentSha, 'libraries');
  const tgt = ctx.git.listTree(ctx.targetSha, 'libraries');

  const newPaths = [];
  const removedPaths = [];

  for (const [upath, curEntry] of cur) {
    if (isLibrariesJson(upath) || isBeetle(upath)) continue;
    const tgtEntry = tgt.get(upath);
    if (!tgtEntry) {
      removedPaths.push(upath);
      continue;
    }
    if (curEntry.oid === tgtEntry.oid) continue; // unchanged
    classifyChanged(ctx, upath, curEntry, tgtEntry, findings);
  }

  for (const upath of tgt.keys()) {
    if (isLibrariesJson(upath) || isBeetle(upath)) continue;
    if (!cur.has(upath)) newPaths.push(upath);
  }

  emitGrouped(ctx, findings, newPaths, 'new');
  emitGrouped(ctx, findings, removedPaths, 'removed');

  checkLibrariesJson(ctx, findings);
  checkBeetle(ctx, cur, tgt, findings);

  if (ctx.reportDir) {
    try {
      fs.rmSync(path.join(ctx.reportDir, 'tmp'), { recursive: true, force: true });
    } catch (e) {
      /* ignore */
    }
  }

  return findings;
}

module.exports = { run };
