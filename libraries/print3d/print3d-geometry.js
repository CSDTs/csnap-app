/*******************************************************************************
 * print3d-geometry.js
 *
 * Pure-geometry core of the CSnap 2D -> 3D printing pipeline.
 *
 * NO Snap!/Morphic/DOM references. This file is pure math. Raster tracing
 * operates on a plain {width, height, data:Uint8ClampedArray} object (RGBA),
 * NOT on a canvas.
 *
 * ---------------------------------------------------------------------------
 * LOADING / DEPENDENCIES
 * ---------------------------------------------------------------------------
 * Dependencies: ClipperLib (clipper.js) and earcut (earcut.min.js).
 *
 * Browser:  load clipper.js and earcut.min.js as <script> tags BEFORE this
 *           file. They publish the globals `ClipperLib` and `earcut`. This
 *           file resolves them lazily from the global object on first use, so
 *           no explicit init is required. The namespace is published as
 *           `window.Print3DGeometry`.
 *
 * Node:     `var G = require('./print3d-geometry.js');` then either
 *             G.init({ClipperLib: require('clipper-lib'),
 *                     earcut:     require('earcut')});
 *           or set the globals before first use. init() is the clean path.
 *
 * ---------------------------------------------------------------------------
 * CANONICAL UNITS & REPRESENTATION
 * ---------------------------------------------------------------------------
 * All public geometry operates in integer "clip units": CLIP = 10000 units
 * per millimetre. Points are ClipperLib-style {X, Y} integers. A "Path" is a
 * closed ring (array of points); "Paths" is an array of rings.
 *
 * The canonical public region representation is a flat ClipperLib.Paths using
 * NonZero orientation semantics: OUTER rings have POSITIVE signed area
 * (CCW in standard math coords, which is what Clipper.Area returns > 0), and
 * HOLE rings have NEGATIVE signed area (CW). Clipper preserves these
 * orientations, so we lean on it as the single source of truth. Where ring
 * hierarchy (which holes belong to which outer) matters (capping), we recover
 * it from a ClipperLib.PolyTree.
 *
 * ---------------------------------------------------------------------------
 * MESH WATERTIGHTNESS (buildStack) -- how it is watertight BY CONSTRUCTION
 * ---------------------------------------------------------------------------
 * Caps (bottom / interface / top) are triangulated with earcut using EXACTLY
 * the integer Clipper paths that the walls also use. Because Clipper does
 * integer clipping, difference/intersection outputs reproduce the input
 * vertices bit-for-bit along shared boundaries, and earcut introduces no
 * Steiner points -- so cap boundary edges coincide bit-for-bit with wall
 * edges. Wall winding + forced cap normals make every directed edge appear
 * exactly once with its reverse exactly once (verified by auditMesh on the
 * INTEGER vertex keys). Nothing is welded / deduped / perturbed.
 *
 * ---------------------------------------------------------------------------
 * LOFT CONTRACT (stamp taper)
 * ---------------------------------------------------------------------------
 * A loft layer is {z0Mm, z1Mm, ringBottom:Path, ringTop:Path}. ringBottom and
 * ringTop MUST already be resampled to the SAME vertex count N (use
 * resampleRing). The loft emits ONLY slanted wall quads between corresponding
 * vertices; it emits NO caps of its own. Instead:
 *   - Its bottom is sealed by the adjacent layer below.
 *   - Its top is sealed by the adjacent layer above.
 * For exact edge pairing, the CALLER MUST make the region ring of the normal
 * layer directly below the loft be the EXACT same vertex sequence as
 * ringBottom, and the region ring of the normal layer directly above be the
 * EXACT same vertex sequence as ringTop (i.e. resample first, then use that
 * resampled ring as BOTH the loft ring AND the adjacent layer's region ring).
 * At a loft/normal interface NO cap is emitted; the vertical walls of the
 * normal layer pair directly with the slanted walls of the loft. This works
 * whether the loft narrows OR widens going up (containment is NOT enforced
 * across a loft boundary), which is what makes the widening stamp taper work.
 ******************************************************************************/

var Print3DGeometry = (function () {
	"use strict";

	var CLIP = 10000;                 // integer clip units per millimetre
	var ARC_TOL = 0.02 * CLIP;        // ~0.02mm arc tolerance for round joins

	// ---- dependency resolution ------------------------------------------
	var _ClipperLib = null;
	var _earcut = null;

	function _glob() {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		if (typeof self !== 'undefined') return self;
		return {};
	}
	function CL() {
		if (_ClipperLib) return _ClipperLib;
		var g = _glob();
		if (g.ClipperLib) { _ClipperLib = g.ClipperLib; return _ClipperLib; }
		throw new Error('Print3DGeometry: ClipperLib not found. Call Print3DGeometry.init({ClipperLib, earcut}) or load clipper.js first.');
	}
	// Normalize an earcut import to a callable. Browser earcut.min.js is a bare
	// function; some Node/ESM-interop builds export {default: fn, ...}.
	function _asEarcutFn(e) {
		if (typeof e === 'function') return e;
		if (e && typeof e.default === 'function') return e.default;
		return null;
	}
	function EC() {
		if (_earcut) return _earcut;
		var g = _glob();
		var fn = _asEarcutFn(g.earcut);
		if (fn) { _earcut = fn; return _earcut; }
		throw new Error('Print3DGeometry: earcut not found. Call Print3DGeometry.init({ClipperLib, earcut}) or load earcut.min.js first.');
	}
	function init(deps) {
		deps = deps || {};
		if (deps.ClipperLib) _ClipperLib = deps.ClipperLib;
		if (deps.earcut) {
			var f = _asEarcutFn(deps.earcut);
			if (f) _earcut = f;
		}
		return api;
	}

	// =====================================================================
	// Low-level helpers
	// =====================================================================

	function clone(v) { return JSON.parse(JSON.stringify(v)); }

	// Signed area of a ring of {X,Y} integer points (standard shoelace).
	// > 0 => outer (CCW), < 0 => hole (CW). Matches Clipper.Area().
	function ringArea(path) {
		var a = 0, n = path.length, i, j;
		for (i = 0, j = n - 1; i < n; j = i++) {
			a += (path[j].X * path[i].Y) - (path[i].X * path[j].Y);
		}
		return a / 2;
	}

	function pt(X, Y) { return { X: Math.round(X), Y: Math.round(Y) }; }

	// Run a single Clipper boolean and return flat Paths.
	function _boolPaths(clipType, subject, clipPaths, subjFill, clipFill) {
		var C = CL();
		var c = new C.Clipper();
		// Keep every input vertex (incl. collinear) so cap boundaries reproduce
		// wall vertices bit-for-bit -- required for exact edge pairing.
		c.PreserveCollinear = true;
		// Forbid weakly-simple output (rings touching themselves at a vertex or
		// along an edge): such rings produce coincident back-to-back wall faces
		// in the mesher, breaking edge pairing.
		c.StrictlySimple = true;
		if (subject && subject.length) c.AddPaths(subject, C.PolyType.ptSubject, true);
		if (clipPaths && clipPaths.length) c.AddPaths(clipPaths, C.PolyType.ptClip, true);
		var sol = new C.Paths();
		c.Execute(clipType, sol,
			subjFill == null ? C.PolyFillType.pftNonZero : subjFill,
			clipFill == null ? C.PolyFillType.pftNonZero : clipFill);
		return sol;
	}

	// Run a single Clipper boolean and return a PolyTree (for hierarchy).
	function _boolTree(clipType, subject, clipPaths, subjFill, clipFill) {
		var C = CL();
		var c = new C.Clipper();
		c.PreserveCollinear = true;
		c.StrictlySimple = true;
		if (subject && subject.length) c.AddPaths(subject, C.PolyType.ptSubject, true);
		if (clipPaths && clipPaths.length) c.AddPaths(clipPaths, C.PolyType.ptClip, true);
		var tree = new C.PolyTree();
		c.Execute(clipType, tree,
			subjFill == null ? C.PolyFillType.pftNonZero : subjFill,
			clipFill == null ? C.PolyFillType.pftNonZero : clipFill);
		return tree;
	}

	// Convert a PolyTree into an array of {outer: Path, holes: [Path,...]}.
	// Each top-level outer node collects its direct hole children; those holes'
	// children are new nested outers (islands) handled recursively.
	function _treeToGroups(tree) {
		var groups = [];
		function visitOuter(node) {
			var g = { outer: node.Contour(), holes: [] };
			var kids = node.Childs(), i;
			for (i = 0; i < kids.length; i++) {
				// each child of an outer is a hole
				g.holes.push(kids[i].Contour());
				// each hole's children are nested outers (islands)
				var gk = kids[i].Childs(), j;
				for (j = 0; j < gk.length; j++) visitOuter(gk[j]);
			}
			groups.push(g);
		}
		var top = tree.Childs(), t;
		for (t = 0; t < top.length; t++) visitOuter(top[t]);
		return groups;
	}

	// Group a flat Paths into {outer,holes} groups via a union into a PolyTree.
	function _groupsOf(paths) {
		var C = CL();
		var tree = _boolTree(C.ClipType.ctUnion, paths, null,
			C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
		return _treeToGroups(tree);
	}

	// =====================================================================
	// Clipper wrappers (public)
	// =====================================================================

	function union(pathsA, pathsB, fillType) {
		var C = CL();
		var subj = (pathsA || []).concat(pathsB || []);
		var f = (fillType == null) ? C.PolyFillType.pftNonZero : fillType;
		return _boolPaths(C.ClipType.ctUnion, subj, null, f, f);
	}

	function difference(subject, clip) {
		var C = CL();
		return _boolPaths(C.ClipType.ctDifference, subject, clip,
			C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
	}

	function intersect(subject, clip) {
		var C = CL();
		return _boolPaths(C.ClipType.ctIntersection, subject, clip,
			C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
	}

	function offsetPolygons(paths, deltaClip) {
		var C = CL();
		var co = new C.ClipperOffset(2.0, ARC_TOL);
		co.AddPaths(paths, C.JoinType.jtRound, C.EndType.etClosedPolygon);
		var sol = new C.Paths();
		co.Execute(sol, deltaClip);
		return sol;
	}

	// Remove vertices within distClip of the line through their neighbours
	// (near-duplicate + collinear points). Cuts wall triangle count and levels
	// any residual sub-tolerance ripple, without changing the visible shape.
	// Runs on integer Paths and drops rings that collapse below 3 points.
	function cleanPaths(paths, distClip) {
		var C = CL();
		if (!(distClip > 0) || !paths || !paths.length) return paths || [];
		var cleaned = C.Clipper.CleanPolygons(paths, distClip);
		var out = [], i;
		for (i = 0; i < cleaned.length; i++) {
			if (cleaned[i] && cleaned[i].length >= 3) out.push(cleaned[i]);
		}
		return out;
	}

	// Offset each open (or closed) polyline at delta = widthClip/2 with round
	// joins (etOpenRound / etOpenButt / etClosedLine per cap), then union all
	// results in ONE boolean Execute (NonZero). Because ClipperOffset applies a
	// single delta per Execute, polylines are grouped by width; each group's
	// offset output is concatenated and merged in a single final union Execute.
	// Each polyline: {points:[{X,Y}...], widthClip, cap:'round'|'butt'}.
	function strokePolylines(polylines) {
		var C = CL();
		var byWidth = {};
		var i;
		for (i = 0; i < polylines.length; i++) {
			var pl = polylines[i];
			var pts = pl.points;
			if (!pts || pts.length < 1) continue;
			var w = pl.widthClip;
			var key = w + '|' + (pl.cap || 'round');
			if (!byWidth[key]) byWidth[key] = { w: w, cap: pl.cap || 'round', items: [] };
			byWidth[key].items.push(pl);
		}
		var allOffsets = [];
		var k;
		for (k in byWidth) {
			if (!byWidth.hasOwnProperty(k)) continue;
			var grp = byWidth[k];
			var co = new C.ClipperOffset(2.0, ARC_TOL);
			var j;
			for (j = 0; j < grp.items.length; j++) {
				var pl2 = grp.items[j];
				var pts2 = pl2.points;
				var closed = pts2.length > 2 &&
					pts2[0].X === pts2[pts2.length - 1].X &&
					pts2[0].Y === pts2[pts2.length - 1].Y;
				var et;
				if (closed) et = C.EndType.etClosedLine;
				else if (grp.cap === 'butt') et = C.EndType.etOpenButt;
				else et = C.EndType.etOpenRound;
				co.AddPath(closed ? pts2.slice(0, pts2.length - 1) : pts2,
					C.JoinType.jtRound, et);
			}
			var out = new C.Paths();
			co.Execute(out, grp.w / 2);
			allOffsets = allOffsets.concat(out);
		}
		// single union Execute to merge everything (NonZero)
		return _boolPaths(C.ClipType.ctUnion, allOffsets, null,
			C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
	}

	// Morphological close: dilate then erode. Fuses near-touching parts and
	// removes pinholes.
	function morphClose(paths, radiusClip) {
		var dil = offsetPolygons(paths, radiusClip);
		return offsetPolygons(dil, -radiusClip);
	}

	// Morphological open: erode then dilate.
	function morphOpen(paths, radiusClip) {
		var ero = offsetPolygons(paths, -radiusClip);
		return offsetPolygons(ero, radiusClip);
	}

	// Enforce minimum feature width.
	function morphThicken(paths, minClip) {
		var opened = morphOpen(paths, minClip / 2);
		var thin = difference(paths, opened);
		if (!thin || thin.length === 0) return paths;
		var grown = offsetPolygons(thin, minClip / 2);
		return union(paths, grown);
	}

	// Remove hole rings whose absolute area < threshold.
	function dropSmallHoles(paths, minAreaClip2) {
		var out = [], i;
		for (i = 0; i < paths.length; i++) {
			var a = ringArea(paths[i]);
			if (a < 0 && Math.abs(a) < minAreaClip2) continue; // drop small hole
			out.push(paths[i]);
		}
		return out;
	}

	// =====================================================================
	// Convenience region builders (CCW outers, Area > 0)
	// =====================================================================

	function circle(cx, cy, r, nSegs) {
		nSegs = nSegs || 64;
		var path = [], i;
		for (i = 0; i < nSegs; i++) {
			var t = (2 * Math.PI * i) / nSegs;     // CCW
			path.push(pt(cx + r * Math.cos(t), cy + r * Math.sin(t)));
		}
		if (ringArea(path) < 0) path.reverse();
		return path;
	}

	function roundedRect(cxClip, cyClip, wClip, hClip, rClip, segmentsPerCorner) {
		var spc = segmentsPerCorner || 8;
		var hw = wClip / 2, hh = hClip / 2;
		var r = Math.max(0, Math.min(rClip, Math.min(hw, hh)));
		// corner arc centres
		var cx = [hw - r, -(hw - r), -(hw - r), hw - r];   // BR, BL, TL, TR in CCW
		var cy = [hh - r, hh - r, -(hh - r), -(hh - r)];
		// starting angles (CCW): 0, 90, 180, 270 degrees
		var start = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
		var path = [], k, i;
		for (k = 0; k < 4; k++) {
			for (i = 0; i <= spc; i++) {
				var t = start[k] + (Math.PI / 2) * (i / spc);
				path.push(pt(cxClip + cx[k] + r * Math.cos(t),
					cyClip + cy[k] + r * Math.sin(t)));
			}
		}
		// dedupe consecutive duplicates
		var out = [], j;
		for (j = 0; j < path.length; j++) {
			var p = path[j];
			if (out.length && out[out.length - 1].X === p.X && out[out.length - 1].Y === p.Y) continue;
			out.push(p);
		}
		if (out.length && out[0].X === out[out.length - 1].X && out[0].Y === out[out.length - 1].Y) out.pop();
		if (ringArea(out) < 0) out.reverse();
		return out;
	}

	// Mirror across X: negate X of every point and reverse ring order so
	// orientation semantics (outer CCW / hole CW) are preserved.
	function mirrorX(paths) {
		var out = [], i, j;
		for (i = 0; i < paths.length; i++) {
			var ring = paths[i], nr = [];
			for (j = ring.length - 1; j >= 0; j--) nr.push({ X: -ring[j].X, Y: ring[j].Y });
			out.push(nr);
		}
		return out;
	}

	// Arc-length resample a closed ring into exactly n points, preserving
	// orientation and start-point vicinity.
	function resampleRing(path, n) {
		var m = path.length;
		if (m < 2) return clone(path);
		// cumulative perimeter
		var seg = [], total = 0, i;
		for (i = 0; i < m; i++) {
			var a = path[i], b = path[(i + 1) % m];
			var dx = b.X - a.X, dy = b.Y - a.Y;
			var d = Math.sqrt(dx * dx + dy * dy);
			seg.push(d); total += d;
		}
		var out = [];
		var step = total / n;
		var si = 0, acc = seg[0], target;
		for (i = 0; i < n; i++) {
			target = i * step;
			while (si < m - 1 && acc < target) { si++; acc += seg[si]; }
			var segStart = acc - seg[si];
			var frac = seg[si] > 0 ? (target - segStart) / seg[si] : 0;
			var a2 = path[si], b2 = path[(si + 1) % m];
			out.push(pt(a2.X + (b2.X - a2.X) * frac, a2.Y + (b2.Y - a2.Y) * frac));
		}
		if (ringArea(out) * ringArea(path) < 0) out.reverse();
		return out;
	}

	// =====================================================================
	// Raster tracing
	// =====================================================================

	function _polyAreaXY(points) {
		var a = 0, n = points.length, i, j;
		for (i = 0, j = n - 1; i < n; j = i++) {
			a += (points[j].x * points[i].y) - (points[i].x * points[j].y);
		}
		return a / 2;
	}

	function _perpDist(p, a, b) {
		var dx = b.x - a.x, dy = b.y - a.y;
		var len2 = dx * dx + dy * dy;
		if (len2 === 0) { var ex = p.x - a.x, ey = p.y - a.y; return Math.sqrt(ex * ex + ey * ey); }
		var t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
		var px = a.x + t * dx, py = a.y + t * dy;
		var qx = p.x - px, qy = p.y - py;
		return Math.sqrt(qx * qx + qy * qy);
	}

	// Douglas-Peucker on an OPEN polyline (endpoints kept).
	function _dpOpen(points, eps) {
		if (points.length < 3) return points.slice();
		var keep = new Array(points.length);
		keep[0] = keep[points.length - 1] = true;
		var stack = [[0, points.length - 1]];
		while (stack.length) {
			var seg = stack.pop();
			var lo = seg[0], hi = seg[1];
			var maxD = -1, idx = -1, i;
			for (i = lo + 1; i < hi; i++) {
				var d = _perpDist(points[i], points[lo], points[hi]);
				if (d > maxD) { maxD = d; idx = i; }
			}
			if (maxD > eps && idx > 0) {
				keep[idx] = true;
				stack.push([lo, idx]);
				stack.push([idx, hi]);
			}
		}
		var out = [];
		for (var k = 0; k < points.length; k++) if (keep[k]) out.push(points[k]);
		return out;
	}

	// Simplify a CLOSED ring: run DP as an open polyline anchored at index 0.
	function _simplifyRing(ring, eps) {
		if (!eps || eps <= 0 || ring.length < 4) return ring;
		// append first point to treat as open, DP, then drop the duplicate
		var open = ring.concat([ring[0]]);
		var s = _dpOpen(open, eps);
		if (s.length > 1 && s[0].x === s[s.length - 1].x && s[0].y === s[s.length - 1].y) s.pop();
		return s;
	}

	// Chaikin corner-cutting on a CLOSED ring.
	function _chaikinRing(ring, iters) {
		var cur = ring, it;
		for (it = 0; it < (iters || 0); it++) {
			if (cur.length < 3) break;
			var next = [], i, n = cur.length;
			for (i = 0; i < n; i++) {
				var p0 = cur[i], p1 = cur[(i + 1) % n];
				next.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
				next.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
			}
			cur = next;
		}
		return cur;
	}

	// Chaikin corner-cutting on an OPEN polyline. The two endpoints are held
	// fixed so pen-stroke caps stay put; only interior corners are rounded.
	function _chaikinOpen(points, iters) {
		var cur = points, it;
		for (it = 0; it < (iters || 0); it++) {
			var n = cur.length;
			if (n < 3) break;
			var next = [cur[0]], i;
			for (i = 0; i < n - 1; i++) {
				var p0 = cur[i], p1 = cur[i + 1];
				next.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
				next.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
			}
			next.push(cur[n - 1]);
			cur = next;
		}
		return cur;
	}

	// Public: smooth a polyline of {x,y} float points. Light Douglas-Peucker
	// first (drop near-duplicate/collinear points so Chaikin does not amplify
	// noise), then `iters` rounds of Chaikin corner-cutting. `closed` picks the
	// ring vs open-line variant. This is what turns a coarse turtle polygon
	// (e.g. repeat 36 [move; turn 10]) into a visually smooth curve before it
	// is stroked and extruded, removing the per-facet ridges on the wall.
	function smoothPolyline(points, opts) {
		opts = opts || {};
		var iters = opts.iters || 0;
		var eps = (opts.simplifyEps != null) ? opts.simplifyEps : 0;
		var closed = !!opts.closed;
		if (!points || points.length < 3) return points ? points.slice() : [];
		var pts = points;
		if (closed) {
			if (eps > 0) pts = _simplifyRing(pts, eps);
			return _chaikinRing(pts, iters);
		}
		if (eps > 0) pts = _dpOpen(pts, eps);
		return _chaikinOpen(pts, iters);
	}

	// Public: arc-length resample a polyline of {x,y} floats to a uniform point
	// spacing. This NORMALIZES centerline density before stroking: coarse input
	// is interpolated up (with the preceding smooth, curves fill in), dense/noisy
	// input is decimated down. Keeping spacing near the stroke half-width stops
	// the inner offset from self-intersecting thousands of times -- which is what
	// produced the fine transverse ridges on curved walls. `closed` returns a
	// ring (no duplicate closing point); open returns first..last inclusive.
	function resamplePolyline(points, spacing, closed) {
		if (!points || points.length < 2 || !(spacing > 0)) {
			return points ? points.slice() : [];
		}
		var pts = points, n = pts.length, i;
		var last = closed ? n : n - 1;
		var seg = [], total = 0;
		for (i = 0; i < last; i++) {
			var a = pts[i], b = pts[(i + 1) % n];
			var d = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
			seg.push(d); total += d;
		}
		if (total <= 0) return [{ x: pts[0].x, y: pts[0].y }];
		var count = Math.max(closed ? 3 : 2, Math.round(total / spacing));
		var step = total / (closed ? count : (count - 1));
		var out = [], si = 0, acc = seg[0] || 0;
		for (i = 0; i < count; i++) {
			var target = i * step;
			while (si < seg.length - 1 && acc < target) { si++; acc += seg[si]; }
			var segStart = acc - seg[si];
			var frac = seg[si] > 0 ? (target - segStart) / seg[si] : 0;
			var a2 = pts[si], b2 = pts[(si + 1) % n];
			out.push({ x: a2.x + (b2.x - a2.x) * frac, y: a2.y + (b2.y - a2.y) * frac });
		}
		if (!closed) out[out.length - 1] = { x: pts[n - 1].x, y: pts[n - 1].y };
		return out;
	}

	// Marching-squares segment table. Corner bits: tl=8, tr=4, br=2, bl=1.
	// Edge indices: 0=top, 1=right, 2=bottom, 3=left.
	var _MS_TABLE = [
		[],                       // 0
		[[2, 3]],                 // 1  bl
		[[1, 2]],                 // 2  br
		[[1, 3]],                 // 3  bl,br
		[[0, 1]],                 // 4  tr
		[[0, 1], [2, 3]],         // 5  tr,bl (saddle)
		[[0, 2]],                 // 6  tr,br
		[[0, 3]],                 // 7  tr,br,bl
		[[0, 3]],                 // 8  tl
		[[0, 2]],                 // 9  tl,bl
		[[0, 3], [1, 2]],         // 10 tl,br (saddle)
		[[0, 1]],                 // 11 tl,br,bl
		[[1, 3]],                 // 12 tl,tr
		[[1, 2]],                 // 13 tl,tr,bl
		[[2, 3]],                 // 14 tl,tr,br
		[]                        // 15
	];

	function _edgeMidpoint(edge, cx, cy) {
		// returns {x,y} in pixel coordinates (half-integers)
		switch (edge) {
			case 0: return { x: cx + 0.5, y: cy };       // top
			case 1: return { x: cx + 1, y: cy + 0.5 };   // right
			case 2: return { x: cx + 0.5, y: cy + 1 };   // bottom
			case 3: return { x: cx, y: cy + 0.5 };       // left
		}
	}

	function _mkey(p) { return Math.round(p.x * 2) + '_' + Math.round(p.y * 2); }

	// traceRaster: {width,height,data} RGBA -> canonical Paths in clip units.
	function traceRaster(imageData, alphaThreshold, simplifyEps, chaikinIters, pxToClip) {
		if (alphaThreshold == null) alphaThreshold = 128;
		if (pxToClip == null) pxToClip = CLIP; // default: 1 px = 1 clip unit (rarely desired)
		var w = imageData.width, h = imageData.height, data = imageData.data;

		function inside(x, y) {
			if (x < 0 || y < 0 || x >= w || y >= h) return 0;
			return data[(y * w + x) * 4 + 3] >= alphaThreshold ? 1 : 0;
		}

		// Build marching-squares segments over a padded cell grid.
		// adjacency: nodeKey -> [ {to:nodeKey, coord:{x,y}} ... ]
		var adj = {};
		var coords = {};
		function addSeg(a, b) {
			var ka = _mkey(a), kb = _mkey(b);
			coords[ka] = a; coords[kb] = b;
			if (!adj[ka]) adj[ka] = [];
			if (!adj[kb]) adj[kb] = [];
			adj[ka].push(kb);
			adj[kb].push(ka);
		}

		var cx, cy;
		for (cy = -1; cy < h; cy++) {
			for (cx = -1; cx < w; cx++) {
				var tl = inside(cx, cy);
				var tr = inside(cx + 1, cy);
				var br = inside(cx + 1, cy + 1);
				var bl = inside(cx, cy + 1);
				var code = (tl << 3) | (tr << 2) | (br << 1) | bl;
				var segs = _MS_TABLE[code];
				var s;
				for (s = 0; s < segs.length; s++) {
					var e0 = segs[s][0], e1 = segs[s][1];
					addSeg(_edgeMidpoint(e0, cx, cy), _edgeMidpoint(e1, cx, cy));
				}
			}
		}

		// Walk closed loops out of the adjacency graph.
		var usedEdge = {};
		function edgeId(a, b) { return a < b ? a + '#' + b : b + '#' + a; }
		var loops = [];
		var startKey;
		for (startKey in adj) {
			if (!adj.hasOwnProperty(startKey)) continue;
			var neigh = adj[startKey];
			var ni;
			for (ni = 0; ni < neigh.length; ni++) {
				if (usedEdge[edgeId(startKey, neigh[ni])]) continue;
				// begin a loop
				var loop = [];
				var prev = startKey, cur = neigh[ni];
				usedEdge[edgeId(prev, cur)] = true;
				loop.push(coords[prev]);
				var guard = 0;
				while (cur !== startKey && guard < 10000000) {
					loop.push(coords[cur]);
					var nb = adj[cur], picked = null, j;
					for (j = 0; j < nb.length; j++) {
						if (nb[j] === prev) continue;
						if (usedEdge[edgeId(cur, nb[j])]) continue;
						picked = nb[j]; break;
					}
					if (picked == null) {
						// fallback: any unused edge (handles saddle degree-4 nodes)
						for (j = 0; j < nb.length; j++) {
							if (usedEdge[edgeId(cur, nb[j])]) continue;
							picked = nb[j]; break;
						}
					}
					if (picked == null) break;
					usedEdge[edgeId(cur, picked)] = true;
					prev = cur; cur = picked; guard++;
				}
				if (loop.length >= 3) loops.push(loop);
			}
		}

		// Simplify + Chaikin + scale to clip ints; drop degenerate rings.
		var C = CL();
		var clipPaths = [];
		var li;
		for (li = 0; li < loops.length; li++) {
			var ring = loops[li];
			ring = _simplifyRing(ring, simplifyEps);
			ring = _chaikinRing(ring, chaikinIters);
			if (ring.length < 3) continue;
			if (Math.abs(_polyAreaXY(ring)) < 1e-6) continue;
			var cp = [], m;
			for (m = 0; m < ring.length; m++) {
				cp.push(pt(ring[m].x * pxToClip, ring[m].y * pxToClip));
			}
			// drop degenerate after quantisation
			if (Math.abs(ringArea(cp)) < 1) continue;
			clipPaths.push(cp);
		}

		// Sanitize through a single EvenOdd union so orientation/hierarchy are
		// canonical (outers CCW +area, holes CW -area).
		var sol = _boolPaths(C.ClipType.ctUnion, clipPaths, null,
			C.PolyFillType.pftEvenOdd, C.PolyFillType.pftEvenOdd);
		// final degenerate filter
		var out = [], q;
		for (q = 0; q < sol.length; q++) {
			if (sol[q].length < 3) continue;
			if (Math.abs(ringArea(sol[q])) < 1) continue;
			out.push(sol[q]);
		}
		return out;
	}

	// =====================================================================
	// Mesher
	// =====================================================================

	function _isLoft(layer) {
		return layer && layer.ringBottom != null && layer.ringTop != null;
	}

	function _zKey(zMm) { return Math.round(zMm * CLIP); }
	function _vKey(X, Y, zMm) { return X + ',' + Y + ',' + _zKey(zMm); }

	// A mesh accumulator: collects integer-keyed triangles (for audit) and
	// float mm coordinates (for emission).
	function _newMesh() {
		return { keys: [], coords: [] };
	}
	// p = {X, Y, zMm}
	function _addTri(mesh, a, b, c) {
		mesh.keys.push([_vKey(a.X, a.Y, a.zMm), _vKey(b.X, b.Y, b.zMm), _vKey(c.X, c.Y, c.zMm)]);
		mesh.coords.push([
			a.X / CLIP, a.Y / CLIP, a.zMm,
			b.X / CLIP, b.Y / CLIP, b.zMm,
			c.X / CLIP, c.Y / CLIP, c.zMm
		]);
	}

	function _isCollinear(a, b, c) {
		return ((b.X - a.X) * (c.Y - a.Y) - (c.X - a.X) * (b.Y - a.Y)) === 0;
	}

	// Robustly triangulate a polygon-with-holes whose rings MAY contain
	// collinear boundary vertices. earcut's hole-bridging is fragile with
	// collinear points, so we triangulate a de-collineared copy, then re-insert
	// the collinear boundary vertices by re-triangulating each affected earcut
	// triangle (which is convex, so a single-ring earcut on it is robust). This
	// guarantees every original boundary edge (through collinear points too)
	// appears in the output -- so cap boundary edges pair exactly with wall
	// edges built from the SAME full rings. Returns an array of [p0,p1,p2]
	// triangles where each p is an {X,Y} point from the input rings.
	function _triangulateWithHoles(outer, holes) {
		var earcutFn = EC();
		var rings = [outer];
		var h;
		if (holes) for (h = 0; h < holes.length; h++) {
			if (holes[h] && holes[h].length >= 3) rings.push(holes[h]);
		}
		// full point list + per-ring metadata
		var full = [], ringMeta = [], r, i;
		for (r = 0; r < rings.length; r++) {
			var start = full.length;
			for (i = 0; i < rings[r].length; i++) full.push(rings[r][i]);
			ringMeta.push({ start: start, len: rings[r].length });
		}
		var locByFull = {};
		for (r = 0; r < rings.length; r++) {
			var m = ringMeta[r];
			for (i = 0; i < m.len; i++) locByFull[m.start + i] = { ring: r, pos: i };
		}
		// kept (non-collinear) full-indices per ring, in ring order
		var keptFullByRing = [], keptPosByFull = {};
		for (r = 0; r < rings.length; r++) {
			var ring = rings[r], n = ring.length, kf = [];
			for (i = 0; i < n; i++) {
				var a = ring[(i - 1 + n) % n], b = ring[i], c = ring[(i + 1) % n];
				if (!_isCollinear(a, b, c)) kf.push(ringMeta[r].start + i);
			}
			if (kf.length < 3) { kf = []; for (i = 0; i < n; i++) kf.push(ringMeta[r].start + i); }
			keptFullByRing.push(kf);
			for (i = 0; i < kf.length; i++) keptPosByFull[kf[i]] = i;
		}
		// earcut over the de-collineared vertex set
		var dcFlat = [], dcToFull = [], holeIdx = [];
		for (r = 0; r < rings.length; r++) {
			if (r > 0) holeIdx.push(dcFlat.length / 2);
			var kf2 = keptFullByRing[r];
			for (i = 0; i < kf2.length; i++) {
				var p = full[kf2[i]];
				dcFlat.push(p.X, p.Y);
				dcToFull.push(kf2[i]);
			}
		}
		var dcTris = earcutFn(dcFlat, holeIdx, 2);

		// intermediate full-indices strictly between kept full u and kept full v
		// when (u->v) is a forward boundary edge on a single ring; else null.
		function midsBetween(u, v) {
			var lu = locByFull[u], lv = locByFull[v];
			if (lu.ring !== lv.ring) return null;
			var rr = lu.ring, kf3 = keptFullByRing[rr], kpU = keptPosByFull[u];
			if (kf3[(kpU + 1) % kf3.length] !== v) return null;
			var mm = ringMeta[rr], nn = mm.len, res = [], pp = (lu.pos + 1) % nn, guard = 0;
			while (mm.start + pp !== v && guard <= nn) { res.push(mm.start + pp); pp = (pp + 1) % nn; guard++; }
			return res;
		}

		var out = [], t;
		for (t = 0; t < dcTris.length; t += 3) {
			var fa = dcToFull[dcTris[t]], fb = dcToFull[dcTris[t + 1]], fc = dcToFull[dcTris[t + 2]];
			var tv = [fa, fb, fc], poly = [], needExpand = false, e;
			for (e = 0; e < 3; e++) {
				var x = tv[e], y = tv[(e + 1) % 3];
				poly.push(x);
				var mids = midsBetween(x, y);
				if (mids && mids.length) {
					needExpand = true;
					var mi;
					for (mi = 0; mi < mids.length; mi++) poly.push(mids[mi]);
				}
			}
			if (!needExpand) {
				out.push([full[fa], full[fb], full[fc]]);
				continue;
			}
			// re-triangulate the (convex) expanded polygon -- robust w/ collinear
			var sf = [], q;
			for (q = 0; q < poly.length; q++) { var sp = full[poly[q]]; sf.push(sp.X, sp.Y); }
			var st = earcutFn(sf, [], 2), s2;
			for (s2 = 0; s2 < st.length; s2 += 3) {
				out.push([full[poly[st[s2]]], full[poly[st[s2 + 1]]], full[poly[st[s2 + 2]]]]);
			}
		}
		return out;
	}

	// Add a triangulated cap for a set of {outer,holes} groups at z = zMm.
	// faceUp = true  => normal +Z (top / interface caps)
	// faceUp = false => normal -Z (bottom cap)
	function _addCap(mesh, groups, zMm, faceUp) {
		var gi;
		for (gi = 0; gi < groups.length; gi++) {
			var g = groups[gi];
			if (!g.outer || g.outer.length < 3) continue;
			var tris = _triangulateWithHoles(g.outer, g.holes);
			var t;
			for (t = 0; t < tris.length; t++) {
				var p0 = tris[t][0], p1 = tris[t][1], p2 = tris[t][2];
				// signed area in XY; force sign to match desired normal
				var s = (p1.X - p0.X) * (p2.Y - p0.Y) - (p2.X - p0.X) * (p1.Y - p0.Y);
				if (s === 0) continue; // drop degenerate slivers
				var A = { X: p0.X, Y: p0.Y, zMm: zMm };
				var B = { X: p1.X, Y: p1.Y, zMm: zMm };
				var Cc = { X: p2.X, Y: p2.Y, zMm: zMm };
				if (faceUp) {
					if (s < 0) { var tmp = B; B = Cc; Cc = tmp; }
				} else {
					if (s > 0) { var tmp2 = B; B = Cc; Cc = tmp2; }
				}
				_addTri(mesh, A, B, Cc);
			}
		}
	}

	// Add vertical wall quads for one closed ring between z0 and z1.
	// Winding (a0,b0,b1)+(a0,b1,a1) yields OUTWARD normals for canonical
	// orientation (outer CCW +area / hole CW -area).
	function _addWalls(mesh, ring, z0Mm, z1Mm) {
		var n = ring.length, i;
		for (i = 0; i < n; i++) {
			var a = ring[i], b = ring[(i + 1) % n];
			var a0 = { X: a.X, Y: a.Y, zMm: z0Mm };
			var b0 = { X: b.X, Y: b.Y, zMm: z0Mm };
			var a1 = { X: a.X, Y: a.Y, zMm: z1Mm };
			var b1 = { X: b.X, Y: b.Y, zMm: z1Mm };
			_addTri(mesh, a0, b0, b1);
			_addTri(mesh, a0, b1, a1);
		}
	}

	// Slanted loft walls between ringBottom (z0) and ringTop (z1), same N.
	function _addLoftWalls(mesh, ringB, ringT, z0Mm, z1Mm) {
		var n = ringB.length, i;
		for (i = 0; i < n; i++) {
			var a0 = { X: ringB[i].X, Y: ringB[i].Y, zMm: z0Mm };
			var b0 = { X: ringB[(i + 1) % n].X, Y: ringB[(i + 1) % n].Y, zMm: z0Mm };
			var a1 = { X: ringT[i].X, Y: ringT[i].Y, zMm: z1Mm };
			var b1 = { X: ringT[(i + 1) % n].X, Y: ringT[(i + 1) % n].Y, zMm: z1Mm };
			_addTri(mesh, a0, b0, b1);
			_addTri(mesh, a0, b1, a1);
		}
	}

	function buildStack(layers) {
		var C = CL();
		var n = layers.length, i;

		// Work on clones so we never mutate the caller's arrays.
		var L = [];
		for (i = 0; i < n; i++) {
			var src = layers[i];
			if (_isLoft(src)) {
				L.push({
					isLoft: true,
					z0Mm: src.z0Mm, z1Mm: src.z1Mm,
					ringBottom: src.ringBottom, ringTop: src.ringTop
				});
			} else {
				// Sanitize through a canonical strictly-simple union so the
				// rings the walls consume are exactly what any later boolean
				// (caps via _groupsOf/difference) reproduces.
				L.push({
					isLoft: false,
					z0Mm: src.z0Mm, z1Mm: src.z1Mm,
					region: union(src.region, null)
				});
			}
		}

		// Enforce containment invariant sequentially top-down (i = 0..n-2),
		// but ONLY between two NORMAL layers. The intersected result is what
		// gets meshed AND what the next intersection uses.
		for (i = 0; i < n - 1; i++) {
			var A = L[i], B = L[i + 1];
			if (!A.isLoft && !B.isLoft) {
				B.region = intersect(B.region, A.region);
			}
		}

		var mesh = _newMesh();

		// ---- bottom cap (normal -Z) ----
		var first = L[0];
		var bottomRegion = first.isLoft ? [first.ringBottom] : first.region;
		_addCap(mesh, _groupsOf(bottomRegion), first.z0Mm, false);

		// ---- walls per layer ----
		for (i = 0; i < n; i++) {
			var ly = L[i];
			if (ly.isLoft) {
				_addLoftWalls(mesh, ly.ringBottom, ly.ringTop, ly.z0Mm, ly.z1Mm);
			} else {
				var r;
				for (r = 0; r < ly.region.length; r++) {
					_addWalls(mesh, ly.region[r], ly.z0Mm, ly.z1Mm);
				}
			}
		}

		// ---- interface caps between consecutive layers (normal +Z) ----
		for (i = 0; i < n - 1; i++) {
			var Ai = L[i], Bi = L[i + 1];
			var z = Ai.z1Mm; // == Bi.z0Mm (required contiguous)
			if (!Ai.isLoft && !Bi.isLoft) {
				var diffTree = _boolTree(C.ClipType.ctDifference,
					Ai.region, Bi.region,
					C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
				var groups = _treeToGroups(diffTree);
				if (groups.length > 0) {
					_addCap(mesh, groups, z, true);
				}
				// empty difference (Bi == Ai): annular case, no cap needed
			}
			// loft-adjacent interface: no cap; walls pair directly (see contract)
		}

		// ---- top cap (normal +Z) ----
		var last = L[n - 1];
		var topRegion = last.isLoft ? [last.ringTop] : last.region;
		_addCap(mesh, _groupsOf(topRegion), last.z1Mm, true);

		// ---- audit on integer keys ----
		var audit = auditMesh(mesh.keys);

		// ---- emit Float32Array (9 floats / tri) ----
		var triCount = mesh.coords.length;
		var tri = new Float32Array(triCount * 9);
		for (i = 0; i < triCount; i++) {
			var c = mesh.coords[i], j;
			for (j = 0; j < 9; j++) tri[i * 9 + j] = c[j];
		}

		return {
			triangles: tri,
			triCount: triCount,
			watertight: audit.ok,
			audit: {
				ok: audit.ok,
				unmatchedEdges: audit.unmatchedEdges,
				duplicateEdges: audit.duplicateEdges,
				message: audit.ok ? 'watertight: every directed edge paired exactly once'
					: ('NOT watertight: ' + audit.unmatchedEdges + ' unmatched, '
						+ audit.duplicateEdges + ' duplicate directed edges')
			}
		};
	}

	// =====================================================================
	// Audit (edge pairing on INTEGER vertex keys)
	// =====================================================================

	// integerTriangles: array of [keyA, keyB, keyC] (strings).
	function auditMesh(integerTriangles) {
		var count = {};
		var i, t;
		for (i = 0; i < integerTriangles.length; i++) {
			t = integerTriangles[i];
			var e0 = t[0] + '>' + t[1];
			var e1 = t[1] + '>' + t[2];
			var e2 = t[2] + '>' + t[0];
			count[e0] = (count[e0] || 0) + 1;
			count[e1] = (count[e1] || 0) + 1;
			count[e2] = (count[e2] || 0) + 1;
		}
		var unmatched = 0, duplicate = 0;
		var k;
		for (k in count) {
			if (!count.hasOwnProperty(k)) continue;
			var c = count[k];
			if (c > 1) duplicate++;
			var parts = k.split('>');
			var rev = parts[1] + '>' + parts[0];
			var rc = count[rev] || 0;
			if (!(c === 1 && rc === 1)) unmatched++;
		}
		return {
			ok: unmatched === 0 && duplicate === 0,
			unmatchedEdges: unmatched,
			duplicateEdges: duplicate
		};
	}

	// =====================================================================
	// Binary STL
	// =====================================================================

	function writeBinarySTL(triangles, triCount) {
		var buffer = new ArrayBuffer(84 + 50 * triCount);
		var dv = new DataView(buffer);
		// 80-byte header
		var header = 'CSnap print3d';
		var i;
		for (i = 0; i < 80; i++) {
			dv.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
		}
		dv.setUint32(80, triCount, true);
		var off = 84;
		for (i = 0; i < triCount; i++) {
			var b = i * 9;
			var ax = triangles[b], ay = triangles[b + 1], az = triangles[b + 2];
			var bx = triangles[b + 3], by = triangles[b + 4], bz = triangles[b + 5];
			var cxv = triangles[b + 6], cyv = triangles[b + 7], cz = triangles[b + 8];
			// normal = normalize((b-a) x (c-a))
			var ux = bx - ax, uy = by - ay, uz = bz - az;
			var vx = cxv - ax, vy = cyv - ay, vz = cz - az;
			var nx = uy * vz - uz * vy;
			var ny = uz * vx - ux * vz;
			var nz = ux * vy - uy * vx;
			var len = Math.sqrt(nx * nx + ny * ny + nz * nz);
			if (len > 0) { nx /= len; ny /= len; nz /= len; } else { nx = ny = nz = 0; }
			dv.setFloat32(off, nx, true); off += 4;
			dv.setFloat32(off, ny, true); off += 4;
			dv.setFloat32(off, nz, true); off += 4;
			dv.setFloat32(off, ax, true); off += 4;
			dv.setFloat32(off, ay, true); off += 4;
			dv.setFloat32(off, az, true); off += 4;
			dv.setFloat32(off, bx, true); off += 4;
			dv.setFloat32(off, by, true); off += 4;
			dv.setFloat32(off, bz, true); off += 4;
			dv.setFloat32(off, cxv, true); off += 4;
			dv.setFloat32(off, cyv, true); off += 4;
			dv.setFloat32(off, cz, true); off += 4;
			dv.setUint16(off, 0, true); off += 2;
		}
		return buffer;
	}

	// =====================================================================
	// Public API
	// =====================================================================

	var api = {
		CLIP: CLIP,
		init: init,
		// clipper wrappers
		union: union,
		difference: difference,
		intersect: intersect,
		offsetPolygons: offsetPolygons,
		strokePolylines: strokePolylines,
		morphClose: morphClose,
		morphOpen: morphOpen,
		morphThicken: morphThicken,
		dropSmallHoles: dropSmallHoles,
		// raster
		traceRaster: traceRaster,
		smoothPolyline: smoothPolyline,
		resamplePolyline: resamplePolyline,
		cleanPaths: cleanPaths,
		// builders
		circle: circle,
		roundedRect: roundedRect,
		mirrorX: mirrorX,
		resampleRing: resampleRing,
		// mesher
		buildStack: buildStack,
		auditMesh: auditMesh,
		writeBinarySTL: writeBinarySTL,
		// low-level (exposed for testing / advanced use)
		ringArea: ringArea
	};

	return api;
})();

if (typeof window !== 'undefined') { window.Print3DGeometry = Print3DGeometry; }
if (typeof module !== 'undefined' && module.exports) { module.exports = Print3DGeometry; }
