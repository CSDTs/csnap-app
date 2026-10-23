'use strict';

// Upstream-symbol scan for csnap/tutorials.js. Plain CommonJS.
//
// tutorials.js is a fully custom CSnap file with no upstream counterpart, but it
// CALLS upstream internals — `IDE_Morph.prototype.foo`, `new SpeechBubbleMorph()`,
// `SpriteMorph.prototype.bar.call(this)`, etc. When upstream renames or removes
// those symbols, the tutorial code silently breaks at runtime.
//
// This module builds a symbol model from the upstream definition index (the
// TARGET index in `against` mode, so we validate that tutorials still works at
// the version we're upgrading TO) MERGED with CSnap's own local overrides (our
// additions count as defined), then parses tutorials.js and flags a small set of
// HIGH-CONFIDENCE reference shapes whose target symbols are absent from the
// model. False-positive control is the priority — anything ambiguous is skipped.
//
// Findings: category TUTORIALS-MISSING-SYMBOL, severity error (warning for the
// optional deep `this.<method>()` heuristic). See README.md for the contract.

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');
const { extractDefinitions } = require('./extract-overrides');

const PARSE_OPTIONS = {
  ecmaVersion: 'latest',
  sourceType: 'script',
  allowReserved: true,
  locations: true,
  ranges: true,
};

// Function/Object members that live on every constructor & function value — a
// reference to one of these is never "missing", so never a finding.
const BUILTIN_MEMBERS = new Set([
  'call', 'apply', 'bind', 'name', 'length', 'prototype', 'uber', 'toString',
  'constructor', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'brequired',
]);

// Global constructors that legitimately appear as `new X()` / `X()` and are not
// upstream Snap symbols. Kept generous — a false NEGATIVE here is harmless.
const JS_GLOBALS = new Set([
  'Object', 'Array', 'Map', 'Set', 'Date', 'Error', 'TypeError', 'RangeError',
  'SyntaxError', 'EvalError', 'ReferenceError', 'URIError', 'Promise', 'RegExp',
  'String', 'Number', 'Boolean', 'Function', 'Image', 'Audio', 'XMLHttpRequest',
  'FileReader', 'Blob', 'URL', 'URLSearchParams', 'WebSocket', 'Worker',
  'SharedWorker', 'DOMParser', 'XMLSerializer', 'CustomEvent', 'Event',
  'MessageEvent', 'FormData', 'Headers', 'Request', 'Response', 'AbortController',
  'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'Int8Array',
  'Int16Array', 'Int32Array', 'Float32Array', 'Float64Array', 'BigInt64Array',
  'BigUint64Array', 'ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Proxy',
  'WeakMap', 'WeakSet', 'WeakRef', 'Intl', 'JSON', 'Math', 'Symbol', 'BigInt',
  'OffscreenCanvas', 'Path2D', 'ImageData', 'ImageBitmap', 'AudioContext',
  'CanvasRenderingContext2D', 'HTMLCanvasElement', 'HTMLElement', 'Element',
  'Node', 'Text', 'Notification', 'MutationObserver', 'IntersectionObserver',
  'ResizeObserver', 'TextEncoder', 'TextDecoder',
]);

// --- member-expression helper (mirrors extract-overrides) -----------------

// Dotted non-computed member chain -> array of names, or null if any link is
// computed / not a plain identifier.
function memberChain(node) {
  const parts = [];
  let cur = node;
  while (cur && cur.type === 'MemberExpression') {
    if (cur.computed || cur.property.type !== 'Identifier') return null;
    parts.unshift(cur.property.name);
    cur = cur.object;
  }
  if (!cur || cur.type !== 'Identifier') return null;
  parts.unshift(cur.name);
  return parts;
}

// --- symbol model ---------------------------------------------------------

// Fold a list of definition records into the model maps/sets.
function foldDefinitions(definitions, model) {
  for (const def of definitions) {
    switch (def.kind) {
      case 'constructor':
      case 'top-var':
        model.constructors.add(def.prop);
        break;
      case 'prototype-method':
      case 'prototype-value':
      case 'object-merge': {
        if (!def.object) break;
        let set = model.protoMembers.get(def.object);
        if (!set) model.protoMembers.set(def.object, (set = new Set()));
        set.add(def.prop);
        break;
      }
      case 'static-prop': {
        if (!def.object) break;
        let set = model.statics.get(def.object);
        if (!set) model.statics.set(def.object, (set = new Set()));
        set.add(def.prop);
        break;
      }
      case 'prototype-chain':
        if (def.object && def.chainParent) {
          model.chains.set(def.object, def.chainParent);
        }
        break;
      default:
        break;
    }
  }
}

// (Re)compute the union of all prototype/static member names in the model.
function refreshMemberNames(model) {
  const allMemberNames = new Set();
  for (const set of model.protoMembers.values()) {
    for (const n of set) allMemberNames.add(n);
  }
  for (const set of model.statics.values()) {
    for (const n of set) allMemberNames.add(n);
  }
  model.allMemberNames = allMemberNames;
}

function buildModel(ctx) {
  const upstream = ctx.upstreamTarget || ctx.upstreamCurrent;
  const model = {
    constructors: new Set(),
    protoMembers: new Map(), // Ctor -> Set<prop>
    statics: new Map(),      // Ctor -> Set<prop>
    chains: new Map(),       // Ctor -> parentName
  };

  // Upstream per-file definitions (files is a Map<'src/x.js', fileResult>).
  if (upstream && upstream.files) {
    for (const fileResult of upstream.files.values()) {
      if (fileResult && fileResult.definitions) {
        foldDefinitions(fileResult.definitions, model);
      }
    }
  }

  // CSnap local overrides (files is a plain object keyed by 'csnap/x.js').
  // These include tutorials.js itself; our own additions count as defined.
  if (ctx.overrides && ctx.overrides.files) {
    for (const fileResult of Object.values(ctx.overrides.files)) {
      if (fileResult && fileResult.definitions) {
        foldDefinitions(fileResult.definitions, model);
      }
    }
  }

  // Union of every prototype/static member name across the whole model — used
  // by the deep-heuristic cheap membership check. Recomputed after local folds.
  refreshMemberNames(model);

  // Resolve a prototype member by walking the inheritance chain
  // (Child.prototype = new Parent() wires Parent's members onto Child).
  model.resolveProto = function resolveProto(ctor, prop) {
    let cur = ctor;
    let depth = 0;
    const seen = new Set();
    while (cur && depth < 20 && !seen.has(cur)) {
      seen.add(cur);
      const members = model.protoMembers.get(cur);
      if (members && members.has(prop)) return true;
      cur = model.chains.get(cur);
      depth++;
    }
    return false;
  };

  // Resolve a static member the same way (class-side inheritance quirk).
  model.resolveStatic = function resolveStatic(ctor, prop) {
    let cur = ctor;
    let depth = 0;
    const seen = new Set();
    while (cur && depth < 20 && !seen.has(cur)) {
      seen.add(cur);
      const members = model.statics.get(cur);
      if (members && members.has(prop)) return true;
      cur = model.chains.get(cur);
      depth++;
    }
    return false;
  };

  return model;
}

// --- write-position detection ---------------------------------------------

// True when `node` is the target (or a leftward prefix of the target) of an
// assignment — i.e. a write, not a read of an upstream symbol. Walks up through
// enclosing member-chain `.object` links and checks the top of the chain.
function inWritePosition(ancestors) {
  let child = ancestors[ancestors.length - 1];
  for (let j = ancestors.length - 2; j >= 0; j--) {
    const parent = ancestors[j];
    if (parent.type === 'MemberExpression' && parent.object === child) {
      child = parent;
      continue;
    }
    if (
      (parent.type === 'AssignmentExpression' ||
        parent.type === 'UpdateExpression') &&
      (parent.left === child || parent.argument === child)
    ) {
      return true;
    }
    return false;
  }
  return false;
}

// --- local binding collection ---------------------------------------------

// Names declared locally in tutorials.js (top-level or nested vars/functions/
// params/classes). Used to suppress `new LocalThing()` false positives.
function collectLocalBindings(ast) {
  const names = new Set();
  walk.full(ast, (node) => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
      names.add(node.id.name);
    } else if (
      (node.type === 'FunctionDeclaration' ||
        node.type === 'ClassDeclaration') &&
      node.id
    ) {
      names.add(node.id.name);
    } else if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      for (const p of node.params) {
        if (p.type === 'Identifier') names.add(p.name);
      }
    }
  });
  return names;
}

// --- main scan ------------------------------------------------------------

function run(ctx) {
  const model = buildModel(ctx);

  const fileLabel = 'csnap/tutorials.js';
  let source;
  if (typeof ctx.tutorialsSource === 'string') {
    source = ctx.tutorialsSource;
  } else {
    try {
      source = fs.readFileSync(
        path.join(ctx.repoRoot, 'csnap', 'tutorials.js'),
        'utf8'
      );
    } catch (err) {
      return [
        {
          id: 'tutorials-scan:unreadable',
          severity: 'error',
          category: 'TUTORIALS-MISSING-SYMBOL',
          key: fileLabel,
          where: { file: fileLabel, line: 0 },
          message: `could not read ${fileLabel}: ${err.message}`,
        },
      ];
    }
  }

  // Fold the scanned file's OWN top-level definitions into the model so that a
  // symbol tutorials.js defines itself (e.g. `X.prototype.newThing = ...`) is
  // never reported as missing when read later. In real runs these also arrive
  // via ctx.overrides; folding again is idempotent and keeps the module correct
  // even when ctx.tutorialsSource overrides the on-disk file.
  const localScan = extractDefinitions(source, fileLabel);
  foldDefinitions(localScan.definitions, model);
  refreshMemberNames(model);

  let ast;
  try {
    ast = acorn.parse(source, PARSE_OPTIONS);
  } catch (err) {
    return [
      {
        id: 'tutorials:parse-error',
        severity: 'error',
        category: 'TUTORIALS-MISSING-SYMBOL',
        key: 'csnap/tutorials.js',
        where: { file: fileLabel, line: err.loc ? err.loc.line : 0 },
        message: `Could not parse csnap/tutorials.js: ${err.message}`,
      },
    ];
  }

  const localBindings = collectLocalBindings(ast);

  // key -> { finding, count } ; first line wins, later occurrences bump count.
  const byKey = new Map();
  function record(finding) {
    const existing = byKey.get(finding.key);
    if (existing) {
      existing.count += 1;
      return;
    }
    byKey.set(finding.key, { finding, count: 1 });
  }

  walk.ancestor(ast, {
    MemberExpression(node, _state, ancestors) {
      const chain = memberChain(node);
      if (!chain) return;
      const line = node.loc.start.line;

      // Shape 1: X.prototype.y  (read position only).
      if (chain.length === 3 && chain[1] === 'prototype') {
        const X = chain[0];
        const y = chain[2];
        if (!model.constructors.has(X)) return; // could be a local var
        if (inWritePosition(ancestors)) return;
        if (BUILTIN_MEMBERS.has(y)) return;
        if (model.resolveProto(X, y)) return;
        if (model.resolveStatic(X, y)) return;
        record({
          id: `tutorials:${X}.prototype.${y}`,
          severity: 'error',
          category: 'TUTORIALS-MISSING-SYMBOL',
          key: `${X}.prototype.${y}`,
          where: { file: fileLabel, line },
          message:
            `csnap/tutorials.js references ${X}.prototype.${y}, but ${X} has ` +
            `no such prototype member in the target upstream (nor via ` +
            `inheritance or a CSnap override) — the tutorial will break at runtime.`,
        });
        return;
      }

      // Shape 2: X.y  (X a constructor, static-ish read; read position only).
      if (chain.length === 2 && chain[1] !== 'prototype') {
        const X = chain[0];
        const y = chain[1];
        if (!model.constructors.has(X)) return;
        if (inWritePosition(ancestors)) return;
        if (BUILTIN_MEMBERS.has(y)) return;
        if (model.resolveStatic(X, y)) return;
        // Some code reaches a proto member class-side; only flag when it's not
        // resolvable either way (keeps class-side-inheritance quirks quiet).
        if (model.resolveProto(X, y)) return;
        record({
          id: `tutorials:${X}.${y}`,
          severity: 'error',
          category: 'TUTORIALS-MISSING-SYMBOL',
          key: `${X}.${y}`,
          where: { file: fileLabel, line },
          message:
            `csnap/tutorials.js references ${X}.${y} (static/class-side), but ` +
            `${X} has no such member in the target upstream (nor via a CSnap ` +
            `override) — the tutorial will break at runtime.`,
        });
        return;
      }
    },

    NewExpression: newOrCall,
    CallExpression: newOrCall,
  });

  function newOrCall(node) {
    const callee = node.callee;
    if (!callee || callee.type !== 'Identifier') return;
    const name = callee.name;
    if (!/^[A-Z]/.test(name)) return;
    if (model.constructors.has(name)) return;
    if (JS_GLOBALS.has(name)) return;
    if (localBindings.has(name)) return;
    const line = node.loc.start.line;
    record({
      id: `tutorials:${name}`,
      severity: 'error',
      category: 'TUTORIALS-MISSING-SYMBOL',
      key: name,
      where: { file: fileLabel, line },
      message:
        `csnap/tutorials.js constructs ${name}(...), but no constructor named ` +
        `${name} exists in the target upstream, in CSnap overrides, or as a JS ` +
        `global — the tutorial will break at runtime.`,
    });
  }

  // --- optional deep heuristic: this.<method>() inside Ctor.prototype.x ----
  if (ctx.deepTutorials) {
    deepThisScan(localScan.definitions, ast, model, fileLabel, record);
  }

  // Materialize findings, first-line order, with occurrence counts.
  const findings = [];
  for (const { finding, count } of byKey.values()) {
    if (count > 1) {
      finding.message += ` (${count} occurrences; first at line ${finding.where.line}.)`;
    }
    findings.push(finding);
  }
  findings.sort((a, b) => a.where.line - b.where.line);
  return findings;
}

// Deep heuristic (opt-in via ctx.deepTutorials). Flags `this.method()` calls in
// prototype-method bodies whose method name appears NOWHERE in the model's
// prototype/static member union and isn't a builtin. Bounded and best-effort —
// severity warning, clearly labelled a heuristic.
function deepThisScan(localDefinitions, ast, model, fileLabel, record) {
  // Prototype-method definitions in tutorials.js, with their source ranges, so a
  // this-call at position P can be attributed to its enclosing Ctor.
  const protoDefs = localDefinitions.filter(
    (d) => d.kind === 'prototype-method' && d.object && Array.isArray(d.range)
  );
  if (protoDefs.length === 0) return;

  function enclosingCtor(pos) {
    for (const d of protoDefs) {
      if (pos >= d.range[0] && pos < d.range[1]) return d.object;
    }
    return null;
  }

  walk.full(ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const callee = node.callee;
    if (
      !callee ||
      callee.type !== 'MemberExpression' ||
      callee.computed ||
      callee.object.type !== 'ThisExpression' ||
      callee.property.type !== 'Identifier'
    ) {
      return;
    }
    const method = callee.property.name;
    if (BUILTIN_MEMBERS.has(method)) return;
    // Cheap sound suppression: if the method exists anywhere in the model under
    // any constructor, assume dynamic dispatch reaches it.
    if (model.allMemberNames.has(method)) return;
    const ctor = enclosingCtor(node.start);
    if (!ctor) return;
    if (model.resolveProto(ctor, method)) return;
    const line = node.loc.start.line;
    record({
      id: `tutorials:this.${method}`,
      severity: 'warning',
      category: 'TUTORIALS-MISSING-SYMBOL',
      key: `this.${method}`,
      where: { file: fileLabel, line },
      message:
        `[deep heuristic] csnap/tutorials.js calls this.${method}() inside ` +
        `${ctor}.prototype, but no ${method} exists on ${ctor} (or any model ` +
        `prototype/static) — tutorials may break. Heuristic; verify manually.`,
    });
  });
}

module.exports = { run, buildModel };
