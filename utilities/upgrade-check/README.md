# upgrade-check — Snap! upgrade compatibility checker

Validates that CSnap's monkey-patch overrides (`csnap/*.js`), copied libraries, and
`index.html` load order remain consistent with upstream Snap! — either against the
currently vendored `snap/` subtree (`check` mode) or against a pending upstream ref
before pulling it (`check --against <ref>`).

```
npm run check-upgrade                    # self-check current tree
npm run check-upgrade:against master     # pre-upgrade report vs snap remote's master
node utilities/upgrade-check/check-upgrade.js --against v11.0.5
node utilities/upgrade-check/check-upgrade.js --write-known-custom   # (re)bootstrap allowlist
```

Reports land in `upgrade-reports/<YYYYMMDD-HHmm>-<refslug>/` (gitignored):
`report.md`, `summary.json`, `diffs/methods/*.diff`, `diffs/libraries/beetle/*.diff`,
`merged/*.js` (three-way merge proposals — the tool NEVER edits `csnap/` or `snap/`).

Exit codes: `0` clean/info-only · `2` warnings only (re-porting/review work) · `1` errors
(something is or will be broken).

## Module contract

Every check module in `lib/` exports an async `run(ctx)` returning `Finding[]`.
`check-upgrade.js` owns wiring, ordering, and exit-code mapping; `lib/report.js` renders.

```js
// Finding
{
  id: 'drift:gui.js/IDE_Morph.prototype.createControlBar',  // stable slug: '<category-group>:<key>'
  severity: 'error' | 'warning' | 'info',
  category: 'UNRECOGNIZED' | 'CUSTOM' | 'DUPLICATE-OVERRIDE' | 'NEW-UPSTREAM-COLLISION' | 'DRIFTED' |
            'SIGNATURE-CHANGED' | 'REMOVED' | 'FILE-REMOVED' | 'SIDE-EFFECT' |
            'CLEAN-MERGE' | 'MERGE-CONFLICT' | 'NEEDS-VISUAL-REVIEW' |
            'SIMILAR-FEATURE' |
            'LIB-UPDATE-AVAILABLE' | 'LIB-CONFLICT' | 'LIB-NEW' | 'LIB-REMOVED' |
            'INDEX-MISSING-FILE' | 'STALE-VERSION' | 'NEW-UPSTREAM-SRC' | 'LOAD-ORDER' |
            'TUTORIALS-MISSING-SYMBOL',
  key: 'IDE_Morph.prototype.createControlBar',   // override key, path, or symbol
  where: { file: 'csnap/gui.js', line: 812 },    // local pointer (optional)
  upstreamFile: 'src/gui.js',                    // optional
  message: 'one-line human summary',
  details: 'optional multi-line elaboration',
  artifacts: { diff: 'diffs/methods/gui--IDE_Morph.createControlBar.diff',
               merged: 'merged/gui--IDE_Morph.createControlBar.js' },  // report-dir-relative
  surface: 'Control bar'                         // only for NEEDS-VISUAL-REVIEW grouping
}

// ctx (built by check-upgrade.js)
{
  repoRoot,                    // absolute path to repo root
  mode: 'check' | 'against',
  git,                         // lib/git.js module
  currentSha,                  // full SHA of currently vendored upstream commit
  targetSha, targetRefName,    // only in 'against' mode
  reportDir,                   // absolute path, already created
  knownCustom,                 // parsed known-custom.json ({ entries: { [key]: {...} }, ... })
  overrides,                   // lib/extract-overrides.js result for csnap/*.js
  upstreamCurrent,             // lib/extract-upstream.js result at currentSha (or working tree in 'check' mode)
  upstreamTarget,              // same at targetSha ('against' mode only)
  driftResults,                // lib/drift.js raw results (available to merge-assist after drift runs)
}
```

Severity → exit code: any `error` → 1; else any `warning` → 2; else 0.

## Key format

`<Object>.prototype.<prop>` for prototype members, `<Object>.<prop>` for statics,
`<FunctionName>` for top-level constructors/functions. One namespace across all files;
per-file origin lives in `where.file`.

## Git conventions (lib/git.js)

- Upstream Snap lives as a git subtree at `snap/`; remote `snap` → github.com/jmoenig/Snap.
- On the snap remote, tree paths are root-relative: `src/gui.js`, `libraries/...`.
- Currently vendored SHA = right-hand SHA of the newest `Squashed 'snap/' changes from A..B`
  commit subject (or `content from commit X` for the initial add), then verified with
  `git diff --quiet <sha> HEAD:snap`.
- All reads at a ref use `git show <sha>:<path>` / `git ls-tree` — never a checkout.
