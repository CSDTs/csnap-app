'use strict';

const fs = require('fs');
const path = require('path');

function run(ctx) {
  const findings = [];
  const indexHtmlPath = ctx.indexHtmlPath || path.join(ctx.repoRoot, 'index.html');

  let content;
  try {
    content = fs.readFileSync(indexHtmlPath, 'utf8');
  } catch (err) {
    findings.push({
      id: 'index-html-check:read-error',
      severity: 'error',
      category: 'INDEX-MISSING-FILE',
      key: 'index.html',
      where: { file: 'index.html', line: 0 },
      message: `Failed to read index.html: ${err.message}`,
    });
    return findings;
  }

  const lines = content.split('\n');
  const snapTags = new Map(); // name -> { line, version }
  const csnapTags = new Map(); // name -> { line }

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const srcMatch = line.match(/src="([^"]+)"/);
    if (!srcMatch) return;

    const src = srcMatch[1];

    const snapMatch = src.match(/^\.\/snap\/src\/([^?]+)(?:\?version=(.*))?$/);
    if (snapMatch) {
      const name = snapMatch[1];
      const version = snapMatch[2] || null;
      snapTags.set(name, { line: lineNum, version });
      return;
    }

    const csnapMatch = src.match(/^\.\/csnap\/(.+)$/);
    if (csnapMatch) {
      const name = csnapMatch[1];
      csnapTags.set(name, { line: lineNum });
    }
  });

  // Check 1: INDEX-MISSING-FILE
  for (const [name, { line }] of snapTags) {
    const snapPath = `src/${name}`;
    const workingPath = path.join(ctx.repoRoot, 'snap', snapPath);

    if (ctx.mode === 'against') {
      const exists = ctx.git.showFile(ctx.targetSha, snapPath) !== null;
      if (!exists) {
        findings.push({
          id: `index-html-check:missing-${name}`,
          severity: 'error',
          category: 'INDEX-MISSING-FILE',
          key: name,
          where: { file: 'index.html', line },
          message: `snap/src/${name} referenced but not found at target ref`,
        });
      }
    } else {
      if (!fs.existsSync(workingPath)) {
        findings.push({
          id: `index-html-check:missing-${name}`,
          severity: 'error',
          category: 'INDEX-MISSING-FILE',
          key: name,
          where: { file: 'index.html', line },
          message: `snap/src/${name} referenced but not found in working tree`,
        });
      }
    }
  }

  // Check 2: STALE-VERSION (against mode only)
  if (ctx.mode === 'against') {
    for (const [name, { line, version }] of snapTags) {
      const snapPath = `src/${name}`;

      const exists = ctx.git.showFile(ctx.targetSha, snapPath) !== null;
      if (!exists) continue;

      if (!version) {
        findings.push({
          id: `index-html-check:no-version-${name}`,
          severity: 'warning',
          category: 'STALE-VERSION',
          key: name,
          where: { file: 'index.html', line },
          message: `snap/src/${name} has no cache-bust version`,
        });
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(version)) {
        // Non-date cache-bust values can't be compared against git dates.
        findings.push({
          id: `index-html-check:nondate-version-${name}`,
          severity: 'warning',
          category: 'STALE-VERSION',
          key: name,
          where: { file: 'index.html', line },
          message: `snap/src/${name} has a non-date cache-bust version '${version}' — cannot check staleness`,
        });
      } else {
        const upstreamDate = ctx.git.lastChangeDate(ctx.targetSha, snapPath);
        if (upstreamDate && version < upstreamDate) {
          findings.push({
            id: `index-html-check:stale-version-${name}`,
            severity: 'warning',
            category: 'STALE-VERSION',
            key: name,
            where: { file: 'index.html', line },
            message: `snap/src/${name} version ${version} is stale; update to ${upstreamDate}`,
          });
        }
      }
    }
  }

  // Check 3: NEW-UPSTREAM-SRC (against mode only)
  if (ctx.mode === 'against') {
    const targetTree = ctx.git.listTree(ctx.targetSha, 'src');
    const currentTree = ctx.git.listTree(ctx.currentSha, 'src');

    for (const targetPath of targetTree.keys()) {
      const name = path.basename(targetPath);

      if (!name.endsWith('.js')) continue;
      if (snapTags.has(name)) continue;

      if (currentTree.get(targetPath) === undefined) {
        findings.push({
          id: `index-html-check:new-upstream-${name}`,
          severity: 'warning',
          category: 'NEW-UPSTREAM-SRC',
          key: name,
          where: { file: 'index.html', line: 0 },
          message: `New upstream source file snap/src/${name} not loaded in index.html`,
        });
      }
    }
  }

  // Check 4: LOAD-ORDER
  for (const [csnapName, { line: csnapLine }] of csnapTags) {
    if (csnapName === 'tutorials.js') continue;

    const baseName = csnapName.replace(/\.js$/, '');
    const snapName = `${baseName}.js`;

    if (snapTags.has(snapName)) {
      const snapLine = snapTags.get(snapName).line;
      if (snapLine >= csnapLine) {
        findings.push({
          id: `index-html-check:load-order-${csnapName}`,
          severity: 'error',
          category: 'LOAD-ORDER',
          key: csnapName,
          where: { file: 'index.html', line: csnapLine },
          message: `csnap/${csnapName} at line ${csnapLine} but snap/src/${snapName} not loaded earlier (line ${snapLine})`,
        });
      }
    } else {
      // No paired upstream tag. That's only an error when the csnap file
      // actually overrides upstream symbols (it would patch before the base
      // loads); a purely custom file (like tutorials.js) legitimately has no
      // upstream counterpart.
      const fileRes =
        ctx.overrides && ctx.overrides.files
          ? ctx.overrides.files[`csnap/${csnapName}`]
          : null;
      const upstreamKeys = ctx.upstreamCurrent ? ctx.upstreamCurrent.byKey : null;
      const overridesUpstream =
        fileRes && upstreamKeys
          ? fileRes.definitions.some((d) => upstreamKeys.has(d.key))
          : true; // no extraction data — assume the worst
      if (!overridesUpstream) continue;
      findings.push({
        id: `index-html-check:load-order-missing-${csnapName}`,
        severity: 'error',
        category: 'LOAD-ORDER',
        key: csnapName,
        where: { file: 'index.html', line: csnapLine },
        message: `csnap/${csnapName} at line ${csnapLine} overrides upstream symbols but no preceding snap/src/${snapName} tag loads the base file`,
      });
    }
  }

  return findings;
}

module.exports = { run };
