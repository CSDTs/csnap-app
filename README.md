# CSnap 11.0.0

**CSnap: Bringing Culture and Social Justice to Programming**

CSnap is a fork of [Snap!](https://snap.berkeley.edu/) 11.0.0 — a visual, blocks-based
programming language inspired by Scratch, designed for use in the classroom and in the
community.

It is a fully static browser app: HTML, CSS, and JavaScript served as-is, with **no build
step, no bundler, no dev server, and no backend**. Upstream Snap! lives in this repo as a
git subtree under `snap/`, and CSnap layers its customizations on top through method
overrides in `csnap/` and block libraries in `libraries/`.

## Quick start

You only need Git and a way to serve static files over HTTP. There is **no** `npm install`
and no build — `package.json` has no real scripts and no lockfile.

1. Clone the repo:
   ```
   git clone git@github.com:CSDTs/csnap-app.git
   ```
2. Serve the folder over HTTP and open `index.html`. Two common ways:
   - **VS Code Live Server (recommended):** install the "Live Server" extension, then
     right-click `index.html` → **"Go Live"**.
   - **Zero-install fallback:** from the repo root, run `python3 -m http.server 8000` and
     open <http://localhost:8000>.
3. You should see the CSnap block-editor IDE load. Drag a block from the palette onto the
   scripting area to confirm it works.

> ⚠️ **Never open `index.html` directly from disk (a `file://` URL).** Snap! will not load
> correctly that way — it must be served over HTTP.

There is no test suite: `npm test` is a stub that prints `Error: no test specified` and
exits non-zero. That's expected.

## Project structure

- `index.html` — the single entry point. Loads each `snap/src/<x>.js` immediately followed
  by the matching `csnap/<x>.js` override, plus the inline `config` object and the service
  worker.
- `snap/` — upstream Snap! 11.0.0 source, integrated as a git subtree tracking
  [`jmoenig/Snap`](https://github.com/jmoenig/Snap).
- `csnap/` — CSnap's method-override files (`blocks.js`, `gui.js`, `objects.js`, etc.),
  each monkey-patching the matching `snap/src/` file loaded just before it.
- `libraries/` — block libraries loaded into the IDE, indexed by `libraries/LIBRARIES.json`.
  Includes `beetle/` (AnanseBot 3D geometry) and `ai/` (Neural Style Transfer, built in the
  separate `aikr-image-stylization` repo and committed here).
- `utilities/` — maintenance shell scripts (`update-csnap.sh`, `copy-libraries.sh`,
  `migrate-libraries.sh`).
- `sw.js` — service worker that caches app assets for offline/PWA use.

## Where customizations go

By convention, every change goes to one of two places — prefer these over editing `snap/`
directly, so upstream upgrades stay clean:

1. A new block library under `libraries/` (registered in `libraries/LIBRARIES.json`).
2. A method override under `csnap/`, monkey-patching the matching upstream file.

## Adding new libraries

Libraries are more than just new blocks. To create one, look at `libraries/beetle` for an
example, along with how it gets initialized in `libraries/beetle.xml`. Also add the library
to `libraries/LIBRARIES.json`.

## Upgrading Snap! versions

Since this is a fork of Snap!, we made it easy to upgrade to the latest Snap! version.

1. Make sure any existing changes are committed or stashed (the subtree pull requires a
   clean working tree).
2. Run `utilities/update-csnap.sh` to update the `snap/` subtree to the latest Snap!
   version.
3. Re-sync the libraries from the subtree into the `libraries/` folder using
   `utilities/copy-libraries.sh` (or `utilities/migrate-libraries.sh`). Do **not** overwrite
   existing custom libraries like `beetle`, `csdt`, and `ai`.
4. Reconcile the `csnap/` overrides. Upstream may have changed methods we override, making
   our patches obsolete — check the subtree changes and update `csnap/` while preserving our
   customizations.
5. Make sure `sw.js` and `index.html` are updated as well.

## Notes / quirks

- **Service worker caches aggressively.** After editing JS you may keep seeing stale code —
  hard-reload and/or disable the service worker in DevTools during development.
- **Runtime CDN dependency.** `index.html` loads three.js and STLExporter from CDNs, so
  running CSnap requires internet access even though it has no backend of its own.
- **Keep `.DS_Store` files out of commits.**

## Contact

Setup help and pull-request approvals go through the CSDT team:
`csdt@generativejustice.org`.
