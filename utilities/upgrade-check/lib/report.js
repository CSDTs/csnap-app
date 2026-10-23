'use strict';

// report.js — renders upgrade-check findings to disk (report.md + summary.json)
// and to the console. Called by check-upgrade.js after drift.run(ctx).

const fs = require('fs');
const path = require('path');

const SEVERITY_ORDER = ['error', 'warning', 'info'];

// Severity per category, derived from the findings themselves (a category may
// legitimately span severities — e.g. LIB-UPDATE-AVAILABLE info vs warning —
// so we show the WORST severity seen for ordering/labelling).
function categorySeverities(findings) {
  const map = {};
  for (const f of findings) {
    const cur = map[f.category];
    if (
      cur === undefined ||
      SEVERITY_ORDER.indexOf(f.severity) < SEVERITY_ORDER.indexOf(cur)
    ) {
      map[f.category] = f.severity;
    }
  }
  return map;
}

// --- counting -------------------------------------------------------------

function countBySeverity(findings) {
  const out = { error: 0, warning: 0, info: 0 };
  for (const f of findings) out[f.severity] = (out[f.severity] || 0) + 1;
  return out;
}

function countByCategory(findings) {
  const out = {};
  for (const f of findings) out[f.category] = (out[f.category] || 0) + 1;
  return out;
}

function groupByCategory(findings) {
  const map = new Map();
  for (const f of findings) {
    if (!map.has(f.category)) map.set(f.category, []);
    map.get(f.category).push(f);
  }
  return map;
}

// --- markdown -------------------------------------------------------------

function shaShort(sha) {
  return sha ? sha.slice(0, 10) : '?';
}

function renderHeader(ctx, bySeverity, driftSummary) {
  const lines = [];
  lines.push('# CSnap Upgrade Compatibility Report');
  lines.push('');
  lines.push(`- generated-by: upgrade-check (\`check-upgrade.js\`)`);
  lines.push(`- mode: \`${ctx.mode}\``);
  const verifiedNote = ctx.currentShaVerified
    ? '(tree-verified)'
    : '**(UNVERIFIED — vendored tree does not match this sha; results are approximate)**';
  lines.push(`- current vendored sha: \`${shaShort(ctx.currentSha)}\` ${verifiedNote}`);
  if (ctx.mode === 'against') {
    lines.push(
      `- target ref: \`${ctx.targetRefName}\` (\`${shaShort(ctx.targetSha)}\`)`
    );
  }
  const counts =
    `${bySeverity.error} error(s), ${bySeverity.warning} warning(s), ` +
    `${bySeverity.info} info`;
  lines.push(`- findings: ${counts}`);
  if (driftSummary) {
    lines.push(
      `- drift: ${driftSummary.ok} upstream-matched, ` +
        `${driftSummary.unchanged} unchanged, ${driftSummary.drifted} drifted, ` +
        `${driftSummary.removed} removed, ${driftSummary.fileRemoved} file-removed, ` +
        `${driftSummary.custom} custom, ${driftSummary.unrecognized} unrecognized, ` +
        `${driftSummary.collisions} collision(s)`
    );
  }
  lines.push('');
  return lines.join('\n');
}

function renderSummaryTable(byCategory, driftSummary, catSev) {
  const lines = [];
  lines.push('## Summary');
  lines.push('');
  lines.push('| category | severity | count |');
  lines.push('| --- | --- | --- |');

  const categories = Object.keys(byCategory).sort((a, b) => {
    const sa = SEVERITY_ORDER.indexOf(catSev[a] || 'info');
    const sb = SEVERITY_ORDER.indexOf(catSev[b] || 'info');
    if (sa !== sb) return sa - sb;
    return a.localeCompare(b);
  });
  for (const cat of categories) {
    const sev = catSev[cat] || 'info';
    lines.push(`| ${cat} | ${sev} | ${byCategory[cat]} |`);
  }
  if (driftSummary) {
    lines.push(`| OK (matches upstream) | — | ${driftSummary.ok} |`);
    lines.push(`| UNCHANGED | — | ${driftSummary.unchanged} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderFindingBullet(f) {
  const lines = [];
  const loc = f.where ? ` (\`${f.where.file}:${f.where.line}\`)` : '';
  const keyLabel = f.key ? `**${f.key}**` : '_(load-time)_';
  lines.push(`- ${keyLabel} — ${f.message}${loc}`);
  if (f.details) {
    for (const d of String(f.details).split('\n')) {
      lines.push(`  - ${d}`);
    }
  }
  if (f.artifacts && f.artifacts.diff) {
    lines.push(`  - diff: [\`${f.artifacts.diff}\`](${f.artifacts.diff})`);
  }
  if (f.artifacts && f.artifacts.merged) {
    lines.push(`  - merged: [\`${f.artifacts.merged}\`](${f.artifacts.merged})`);
  }
  return lines.join('\n');
}

function renderSeverityBlock(heading, severity, findings) {
  const group = findings.filter((f) => f.severity === severity);
  if (!group.length) return '';
  const lines = [heading, ''];
  const byCat = groupByCategory(group);
  const cats = [...byCat.keys()].sort();
  for (const cat of cats) {
    lines.push(`### ${cat}`);
    lines.push('');
    for (const f of byCat.get(cat)) {
      lines.push(renderFindingBullet(f));
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderVisualReviewChecklist(findings) {
  const items = findings.filter((f) => f.category === 'NEEDS-VISUAL-REVIEW');
  if (!items.length) return '';

  const bySurface = new Map();
  for (const f of items) {
    const surface = f.surface || 'Other';
    if (!bySurface.has(surface)) bySurface.set(surface, []);
    bySurface.get(surface).push(f);
  }

  const lines = [];
  lines.push('## Visual review checklist');
  lines.push('');
  lines.push(
    'Both our override AND upstream changed these methods — a clean textual ' +
      'merge does not guarantee a clean visual/behavioral result. Exercise ' +
      'each surface after upgrading:'
  );
  lines.push('');
  const surfaces = [...bySurface.keys()].sort();
  for (const surface of surfaces) {
    lines.push(`### ${surface}`);
    lines.push('');
    for (const f of bySurface.get(surface)) {
      lines.push(`- [ ] **${f.key}** — ${f.message}`);
      if (f.details) {
        for (const d of String(f.details).split('\n')) {
          lines.push(`  - ${d}`);
        }
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderChecklist(ctx) {
  const drift = ctx.driftResults;
  if (!drift) return '';
  const driftedKeys = [];
  for (const [key, rec] of drift.perKey) {
    if (rec.status === 'drifted') driftedKeys.push({ key, rec });
  }
  const lines = [];
  lines.push('## Post-pull checklist');
  lines.push('');
  if (!driftedKeys.length) {
    lines.push('_No drifted overrides to re-port._');
    lines.push('');
    return lines.join('\n');
  }
  lines.push('Re-port these drifted overrides against the new upstream body:');
  lines.push('');
  for (const { key, rec } of driftedKeys) {
    const where = `${rec.def.file}:${rec.def.line}`;
    lines.push(`- [ ] \`${key}\` (${where})`);
  }
  lines.push('');
  return lines.join('\n');
}

function buildMarkdown(ctx, findings) {
  const bySeverity = countBySeverity(findings);
  const byCategory = countByCategory(findings);
  const driftSummary = ctx.driftResults ? ctx.driftResults.summary : null;

  const sections = [
    renderHeader(ctx, bySeverity, driftSummary),
    renderSummaryTable(byCategory, driftSummary, categorySeverities(findings)),
  ];

  const errors = renderSeverityBlock('## Errors', 'error', findings);
  if (errors) sections.push(errors);
  const warnings = renderSeverityBlock('## Warnings', 'warning', findings);
  if (warnings) sections.push(warnings);
  const info = renderSeverityBlock('## Info', 'info', findings);
  if (info) sections.push(info);

  const visualReview = renderVisualReviewChecklist(findings);
  if (visualReview) sections.push(visualReview);

  sections.push(renderChecklist(ctx));

  return sections.filter(Boolean).join('\n') + '\n';
}

// --- writeReport ----------------------------------------------------------

function writeReport(ctx, findings) {
  fs.mkdirSync(ctx.reportDir, { recursive: true });

  const markdown = buildMarkdown(ctx, findings);
  fs.writeFileSync(path.join(ctx.reportDir, 'report.md'), markdown);

  const summary = {
    meta: {
      mode: ctx.mode,
      currentSha: ctx.currentSha || null,
      targetSha: ctx.targetSha || null,
      targetRefName: ctx.targetRefName || null,
      generatedAt: new Date().toISOString(),
    },
    counts: {
      bySeverity: countBySeverity(findings),
      byCategory: countByCategory(findings),
      driftSummary: ctx.driftResults ? ctx.driftResults.summary : null,
    },
    findings,
  };
  fs.writeFileSync(
    path.join(ctx.reportDir, 'summary.json'),
    JSON.stringify(summary, null, 2) + '\n'
  );

  return { reportMd: path.join(ctx.reportDir, 'report.md') };
}

// --- console --------------------------------------------------------------

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function printConsole(ctx, findings) {
  const bySeverity = countBySeverity(findings);
  const byCategory = countByCategory(findings);
  const driftSummary = ctx.driftResults ? ctx.driftResults.summary : null;

  console.log('CSnap Upgrade Compatibility Report');
  console.log(`  mode: ${ctx.mode}`);
  const verifiedNote = ctx.currentShaVerified
    ? '(tree-verified)'
    : 'UNVERIFIED — vendored tree does not match this sha!';
  console.log(`  current sha: ${shaShort(ctx.currentSha)} ${verifiedNote}`);
  if (ctx.mode === 'against') {
    console.log(`  target: ${ctx.targetRefName} (${shaShort(ctx.targetSha)})`);
  }
  console.log('');

  console.log('Summary:');
  const catSev = categorySeverities(findings);
  const cats = Object.keys(byCategory).sort((a, b) => {
    const sa = SEVERITY_ORDER.indexOf(catSev[a] || 'info');
    const sb = SEVERITY_ORDER.indexOf(catSev[b] || 'info');
    if (sa !== sb) return sa - sb;
    return a.localeCompare(b);
  });
  for (const cat of cats) {
    const sev = catSev[cat] || 'info';
    console.log(`  ${pad(cat, 24)} ${pad(sev, 8)} ${byCategory[cat]}`);
  }
  if (driftSummary) {
    console.log(`  ${pad('OK (matches upstream)', 24)} ${pad('-', 8)} ${driftSummary.ok}`);
    console.log(`  ${pad('UNCHANGED', 24)} ${pad('-', 8)} ${driftSummary.unchanged}`);
  }
  console.log('');

  for (const sev of ['error', 'warning']) {
    const group = findings.filter((f) => f.severity === sev);
    if (!group.length) continue;
    console.log(`${sev.toUpperCase()} (${group.length}):`);
    for (const f of group) {
      const loc = f.where ? ` (${f.where.file}:${f.where.line})` : '';
      console.log(`  [${f.category}] ${f.key || ''}${loc}`);
      console.log(`      ${f.message}`);
      if (f.artifacts && f.artifacts.diff) {
        console.log(`      diff: ${f.artifacts.diff}`);
      }
    }
    console.log('');
  }

  if (bySeverity.info) {
    console.log(`${bySeverity.info} info finding(s) in report (suppressed here).`);
    console.log('');
  }

  console.log(`report: ${path.join(ctx.reportDir, 'report.md')}`);
}

module.exports = { writeReport, printConsole, buildMarkdown };
