---
description: Compare a CSnap custom feature against a similar upstream Snap! feature from the latest upgrade report
---

Compare a CSnap custom feature against a conceptually-similar upstream Snap!
change surfaced by the SIMILAR-FEATURE check in `utilities/upgrade-check/`.

Argument: `$ARGUMENTS` — a feature group label (or one of its override keys)
from a `similar-features.json` file, OR a free-form description of a feature
if the user isn't sure what the tool matched it to.

## Steps

1. **Locate the report.** Find the newest `upgrade-reports/*/similar-features.json`
   under the repo root (sort by the report dir's `YYYYMMDD-HHmm` prefix, or by
   mtime if that's easier). If none exists, tell the user to run
   `node utilities/upgrade-check/check-upgrade.js --against <ref>` first, and stop.

2. **Find the matching group.** Read the JSON (`generatedFor: {currentSha,
   targetSha}`, `groups: [{label, keys, keywords, matches}]`). Match
   `$ARGUMENTS` against group `label`s and `keys` — try exact match first,
   then case-insensitive substring, then keyword overlap (split `$ARGUMENTS`
   into words and compare against each group's `keywords`).
   - If exactly one group matches well, use it.
   - If multiple groups are plausible, list them briefly and ask the user to
     pick one (unless one is a clearly much better match — then just proceed
     and say which you picked).
   - If nothing matches, treat `$ARGUMENTS` as a free-form description of a
     feature that the automated check didn't catch. Look for the relevant
     CSnap code yourself (grep `csnap/*.js` for likely method/keyword names)
     to figure out "ours". For "theirs" you'll need an upstream ref — if it
     isn't obvious from context, ask the user which upstream ref/commit to
     compare against, since there's no `similar-features.json` entry to read
     `targetSha` from.

3. **Read OUR implementation.** For each key in the matched group's `keys`,
   find its definition(s) in `csnap/*.js` (grep for the method/prop name from
   the key, e.g. `toggleTutorialMode` for
   `IDE_Morph.prototype.toggleTutorialMode`). Read the surrounding code —
   full method body, not just the signature. If the code references a
   library under `libraries/` (e.g. `libraries/beetle/`), read the relevant
   parts of that too. Note down what the feature actually does, and where
   (file:line).

4. **Read THEIRS.** Using `generatedFor.targetSha` from the JSON:
   - For each `matches` entry of `kind: "symbol"`, run
     `git show <targetSha>:<file>` (the `file` field is already root-relative,
     e.g. `src/gui.js`) and read the definition at/near the recorded `line`.
   - For each `matches` entry of `kind: "file"`, run
     `git show <targetSha>:<text>` and skim the new file to see what it's for.
   - For each `matches` entry of `kind: "changelog"`, run
     `git show <targetSha>:HISTORY.md` and read a few lines of context around
     the matched line (the changelog line alone is often terse).
   - If `git show` fails because the sha isn't available locally, run
     `git fetch snap --tags` (remote `snap` → github.com/jmoenig/Snap.git)
     and retry.
   - Note down what upstream's feature actually does, and where (file:line at
     `targetSha`).

5. **Write the comparison.** Determine the report dir (the parent directory
   of the `similar-features.json` you read, or — for the free-form path — the
   newest `upgrade-reports/*/` dir, or ask the user which report this belongs
   to if genuinely ambiguous). Create `<report dir>/feature-comparisons/` if
   it doesn't exist. Write `<slug>.md` there, where `<slug>` is the group
   label lowercased with non-alphanumerics collapsed to `-`. The file should
   have these sections:

   - `# <group label>`
   - `## What upstream's feature does` — plain-language summary, cite
     `file:line` at `targetSha` for each cited symbol/file.
   - `## What ours does` — plain-language summary, cite `file:line` in
     `csnap/*.js` (and `libraries/...` if relevant) for each cited symbol.
   - `## Functional overlap & differences` — a short bullet list: what
     genuinely overlaps, what's different (scope, UX, data model, trigger
     points, persistence/serialization).
   - `## Recommendation` — one of **adopt upstream**, **keep ours**, or
     **hybridize**, with 2-4 sentences of justification tied to the overlap
     analysis above.
   - `## Integration risks` — concrete risks if these were to coexist or be
     merged: name collisions (same method/prop name meaning different
     things), UI overlap (competing menus/dialogs/tabs), serialization
     concerns (project XML / settings that either feature persists), and
     anything else that surfaced while reading the code.

   Keep it concrete — every claim about "what X does" should be traceable to
   a specific file:line you actually read, not a guess from the name alone.

6. **Report back.** Tell the user the path to the file you wrote, and give a
   short (3-5 sentence) summary of the recommendation directly in chat — don't
   make them open the file to find out what you concluded.
