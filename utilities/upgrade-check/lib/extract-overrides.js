'use strict';

// Override extraction for upgrade-check. Plain CommonJS.
//
// CSnap monkey-patches upstream Snap! by reassigning prototype methods (and a
// few statics) at the TOP LEVEL of csnap/*.js after upstream has loaded. This
// module parses those files with acorn and classifies each top-level statement
// into a "definition" (an override key we care about) or a "side effect"
// (a bare call / if-block / etc. that runs at load time).
//
// Only TOP-LEVEL statements are inspected — we deliberately do NOT recurse into
// function bodies, so a `X.prototype.y = {...}` reassignment nested inside a
// method is invisible here (that is the source-of-truth behaviour: an override
// only "counts" when it patches the prototype at module load).

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const PARSE_OPTIONS = {
  ecmaVersion: 'latest',
  sourceType: 'script',
  allowReserved: true,
  locations: true,
  ranges: true,
};

// --- member-expression helpers -------------------------------------------

// Return the dotted, non-computed member chain as an array of identifier names,
// or null if any link is computed / not a plain identifier. E.g.
// `IDE_Morph.prototype.createControlBar` -> ['IDE_Morph','prototype','createControlBar'].
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

// True when two member expressions denote the same non-computed chain.
function sameMember(a, b) {
  const ca = memberChain(a);
  const cb = memberChain(b);
  if (!ca || !cb || ca.length !== cb.length) return false;
  return ca.every((p, i) => p === cb[i]);
}

// Describe a function-ish value: params list (with placeholders for
// destructuring/rest) and a value-type tag.
function describeFunction(node) {
  const params = node.params.map((p) => {
    if (p.type === 'Identifier') return p.name;
    if (p.type === 'RestElement') {
      return p.argument.type === 'Identifier' ? '…' + p.argument.name : '…rest';
    }
    if (p.type === 'AssignmentPattern') {
      return p.left.type === 'Identifier' ? p.left.name : '{…}';
    }
    return '{…}'; // ObjectPattern / ArrayPattern
  });
  let valueType;
  if (node.type === 'ArrowFunctionExpression') valueType = 'arrow';
  else if (node.async) valueType = 'async-function';
  else valueType = 'function';
  return { params, valueType };
}

// If value is `{ ...<sameMember>, k1: ..., k2: ... }`, return the non-spread
// key names; return null when it is not a self-merge object.
function objectMergeAddedKeys(valueNode, leftMember) {
  if (!valueNode || valueNode.type !== 'ObjectExpression') return null;
  const hasSelfSpread = valueNode.properties.some(
    (prop) =>
      prop.type === 'SpreadElement' && sameMember(prop.argument, leftMember)
  );
  if (!hasSelfSpread) return null;
  const addedKeys = [];
  for (const prop of valueNode.properties) {
    if (prop.type === 'SpreadElement') continue;
    if (prop.key.type === 'Identifier') addedKeys.push(prop.key.name);
    else if (prop.key.type === 'Literal') addedKeys.push(String(prop.key.value));
    else addedKeys.push('«computed»');
  }
  return addedKeys;
}

const FUNCTION_TYPES = new Set([
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

// Heuristic: does this variable name look like a constructor / top-level symbol
// worth tracking? Used only for top-level `var/const/let Name = ...` forms.
// We accept anything with an initializer; the name is recorded verbatim.
function keyForMember(chain) {
  return chain.join('.');
}

// --- core: parse one source string ---------------------------------------

function extractDefinitions(source, fileLabel) {
  let ast;
  try {
    ast = acorn.parse(source, PARSE_OPTIONS);
  } catch (err) {
    return degradedScan(source, fileLabel);
  }

  const definitions = [];
  const sideEffects = [];

  for (const stmt of ast.body) {
    const line = stmt.loc.start.line;
    const range = [stmt.start, stmt.end];
    const sourceText = source.slice(stmt.start, stmt.end);

    if (
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'AssignmentExpression' &&
      stmt.expression.operator === '='
    ) {
      const assign = stmt.expression;
      const chain = memberChain(assign.left);

      if (chain && chain.length >= 2) {
        const value = assign.right;
        const isPrototypeMember =
          chain.length >= 3 && chain[chain.length - 2] === 'prototype';
        const isBarePrototype =
          chain.length === 2 && chain[1] === 'prototype';
        const isPlainStatic = chain.length === 2 && chain[1] !== 'prototype';

        if (isBarePrototype) {
          // `X.prototype = new Y()` — inheritance wiring, NOT an override key.
          const def = baseDef(fileLabel, chain, line, range, sourceText);
          def.kind = 'prototype-chain';
          if (value.type === 'NewExpression') {
            const parentChain = memberChain(value.callee);
            def.chainParent = parentChain
              ? parentChain[parentChain.length - 1]
              : value.callee.type === 'Identifier'
              ? value.callee.name
              : null;
          }
          definitions.push(def);
          continue;
        }

        if (isPrototypeMember) {
          const object = chain.slice(0, -2).join('.'); // e.g. `IDE_Morph`
          const prop = chain[chain.length - 1];
          const def = {
            file: fileLabel,
            object,
            prop,
            key: `${object}.prototype.${prop}`,
            line,
            range,
            sourceText,
          };
          if (FUNCTION_TYPES.has(value.type)) {
            const { params, valueType } = describeFunction(value);
            def.kind = 'prototype-method';
            def.params = params;
            def.valueType = valueType;
          } else {
            const addedKeys = objectMergeAddedKeys(value, assign.left);
            if (addedKeys) {
              def.kind = 'object-merge';
              def.valueType = 'object';
              def.addedKeys = addedKeys;
            } else {
              def.kind = 'prototype-value';
              def.valueType =
                value.type === 'ObjectExpression' ? 'object' : 'other';
            }
          }
          definitions.push(def);
          continue;
        }

        if (isPlainStatic) {
          const object = chain[0];
          const prop = chain[1];
          const def = {
            file: fileLabel,
            object,
            prop,
            key: `${object}.${prop}`,
            kind: 'static-prop',
            line,
            range,
            sourceText,
          };
          if (FUNCTION_TYPES.has(value.type)) {
            const { params, valueType } = describeFunction(value);
            def.params = params;
            def.valueType = valueType;
          } else {
            def.valueType =
              value.type === 'ObjectExpression' ? 'object' : 'other';
          }
          definitions.push(def);
          continue;
        }
      }

      // Assignment we don't model (computed, longer static chains, etc.).
      sideEffects.push(makeSideEffect(fileLabel, line, source, stmt));
      continue;
    }

    if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      definitions.push({
        file: fileLabel,
        object: null,
        prop: stmt.id.name,
        key: stmt.id.name,
        kind: 'constructor',
        valueType: stmt.async ? 'async-function' : 'function',
        params: describeFunction(stmt).params,
        line,
        range,
        sourceText,
      });
      continue;
    }

    if (stmt.type === 'VariableDeclaration') {
      // Split declarators: names WITH an initializer become `top-var` defs;
      // bare `var Foo;` hoist shims are ignored entirely.
      for (const decl of stmt.declarations) {
        if (!decl.init) continue; // hoist shim — ignore
        if (decl.id.type !== 'Identifier') {
          // Destructured top-level binding — treat as a load-time side effect.
          sideEffects.push(makeSideEffect(fileLabel, line, source, stmt));
          continue;
        }
        definitions.push({
          file: fileLabel,
          object: null,
          prop: decl.id.name,
          key: decl.id.name,
          kind: 'top-var',
          line: decl.loc.start.line,
          range: [decl.start, decl.end],
          sourceText: source.slice(decl.start, decl.end),
        });
      }
      continue;
    }

    // Anything else at top level (bare calls, if/for blocks, etc.).
    sideEffects.push(makeSideEffect(fileLabel, line, source, stmt));
  }

  return { definitions, sideEffects, degraded: false };
}

function baseDef(fileLabel, chain, line, range, sourceText) {
  return {
    file: fileLabel,
    object: chain.slice(0, -1).join('.'),
    prop: chain[chain.length - 1],
    key: keyForMember(chain),
    line,
    range,
    sourceText,
  };
}

function makeSideEffect(fileLabel, line, source, stmt) {
  const snippet = source.slice(stmt.start, stmt.end).slice(0, 120);
  return { file: fileLabel, line, snippet };
}

// --- degraded fallback: regex line scan when acorn cannot parse -----------

const DEGRADED_RE = /^\s*([A-Za-z_$][\w$]*)\.(prototype\.)?([\w$]+)\s*=/;

function degradedScan(source, fileLabel) {
  const definitions = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = DEGRADED_RE.exec(lines[i]);
    if (!m) continue;
    const [, object, protoDot, prop] = m;
    const isProto = Boolean(protoDot);
    // Guess kind from the RHS on the same line; unreliable, hence `degraded`.
    const kindGuess = /=\s*(async\s+)?(function|\()/.test(lines[i])
      ? isProto
        ? 'prototype-method'
        : 'static-prop'
      : isProto
      ? 'prototype-value'
      : 'static-prop';
    definitions.push({
      file: fileLabel,
      object,
      prop,
      key: isProto ? `${object}.prototype.${prop}` : `${object}.${prop}`,
      kind: kindGuess,
      line: i + 1,
    });
  }
  return { definitions, sideEffects: [], degraded: true };
}

// --- csnap sweep ----------------------------------------------------------

function extractCsnapOverrides(repoRoot) {
  const csnapDir = path.join(repoRoot, 'csnap');
  const files = fs
    .readdirSync(csnapDir)
    .filter((name) => name.endsWith('.js'))
    .sort();

  const byKey = new Map();
  const outFiles = {};
  const dupSeen = new Map(); // key -> count across all csnap files

  for (const name of files) {
    const fileLabel = `csnap/${name}`;
    const source = fs.readFileSync(path.join(csnapDir, name), 'utf8');
    const result = extractDefinitions(source, fileLabel);
    outFiles[fileLabel] = result;

    for (const def of result.definitions) {
      if (!byKey.has(def.key)) byKey.set(def.key, []);
      byKey.get(def.key).push(def);
      // Only override-style keys count toward duplicate warnings; chain/var
      // records share keys legitimately and are excluded.
      if (def.kind === 'prototype-chain' || def.kind === 'top-var') continue;
      dupSeen.set(def.key, (dupSeen.get(def.key) || 0) + 1);
    }
  }

  const duplicates = [];
  for (const [key, count] of dupSeen) {
    if (count > 1) duplicates.push(key);
  }
  duplicates.sort();

  return { byKey, files: outFiles, duplicates };
}

module.exports = { extractDefinitions, extractCsnapOverrides };
