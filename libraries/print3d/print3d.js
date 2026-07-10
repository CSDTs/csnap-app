/* print3d.js — CSnap "3D Print your Drawing" library
   Snap! integration layer: controller, capture, primitives.
   Pure geometry lives in print3d-geometry.js (no Snap dependencies).

   This file has TWO layers:
     1. Print3DPipeline — plain-data functions, NO Snap/Morphic types. It is
        attached to window (browser) and module.exports (Node) so it can be
        unit-tested headless. It depends on Print3DGeometry (and, for even-odd
        fills, ClipperLib), resolved lazily from globals or injected via
        Print3DPipeline.init({Print3DGeometry, ClipperLib}) — mirroring the
        dual-load pattern of print3d-geometry.js.
     2. Snap glue — browser-only (guarded by typeof StageMorph). Converts Snap
        objects (stage.trailsLog, pen-trails canvas, sprites) to plain data,
        then registers the p3d_* primitives.

   COORDINATE / ORIENTATION DECISIONS
   - Vector capture: stage.trailsLog points are Snap stage coords (origin at
     centre, y UP). Geometry / STL also use y-up (the printed drawing lies in
     the x-y plane, viewed from +Z). So NO y-flip is applied to vector data —
     the reference drawing comes out non-mirrored when viewed from +Z.
   - Raster capture: canvas pixel coords have y DOWN. traceRaster returns pixel
     coords, so we flipY (negate Y, reverse ring winding to preserve outer/hole
     orientation) into the shared y-up space.
   - Stamp mirroring: a stamp prints a mirror image, so the relief design is
     reflected left-right in place about its own bbox centre (via mirrorX).
   - Scale strategy: the drawing is stroked/assembled at a provisional scale,
     then the finished region is uniformly rescaled so the final STL bbox WIDTH
     equals settings.widthMm (buildModelStack / buildStampStack / buildCutter
     Stack all do this fit). Uniform scaling keeps aspect ratio; line thickness
     scales with the drawing after the fit (documented tradeoff — widthMm is the
     headline dimension and is honoured within rounding, well under 2%).
*/

// Print3DPipeline (pure data, Snap-free, testable) /////////////////////

var Print3DPipeline = (function () {
	"use strict";

	// ---- dependency resolution (lazy, dual-load) ------------------------
	var _G = null;   // Print3DGeometry
	var _CL = null;  // ClipperLib (only needed for even-odd fill)

	function _glob() {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		if (typeof self !== 'undefined') return self;
		return {};
	}
	function G() {
		if (_G) return _G;
		var g = _glob();
		if (g.Print3DGeometry) { _G = g.Print3DGeometry; return _G; }
		throw new Error('Print3DPipeline: Print3DGeometry not found. Call Print3DPipeline.init({Print3DGeometry}) or load print3d-geometry.js first.');
	}
	function CL() {
		if (_CL) return _CL;
		var g = _glob();
		if (g.ClipperLib) { _CL = g.ClipperLib; return _CL; }
		throw new Error('Print3DPipeline: ClipperLib not found. Call Print3DPipeline.init({ClipperLib}) or load clipper.js first.');
	}
	function init(deps) {
		deps = deps || {};
		if (deps.Print3DGeometry) _G = deps.Print3DGeometry;
		if (deps.ClipperLib) _CL = deps.ClipperLib;
		return api;
	}

	// ---- plain-data geometry helpers ------------------------------------

	// Bounding box of a set of Clipper Paths ({X,Y} ints). Clip units.
	function bboxOfPaths(paths) {
		var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
		var i, j;
		for (i = 0; i < paths.length; i++) {
			var r = paths[i];
			for (j = 0; j < r.length; j++) {
				if (r[j].X < minX) minX = r[j].X;
				if (r[j].X > maxX) maxX = r[j].X;
				if (r[j].Y < minY) minY = r[j].Y;
				if (r[j].Y > maxY) maxY = r[j].Y;
			}
		}
		if (minX === Infinity) return { minX: 0, maxX: 0, minY: 0, maxY: 0, w: 0, h: 0 };
		return { minX: minX, maxX: maxX, minY: minY, maxY: maxY, w: maxX - minX, h: maxY - minY };
	}

	function scalePaths(paths, f) {
		var out = [], i, j;
		for (i = 0; i < paths.length; i++) {
			var r = paths[i], nr = [];
			for (j = 0; j < r.length; j++) nr.push({ X: Math.round(r[j].X * f), Y: Math.round(r[j].Y * f) });
			out.push(nr);
		}
		return out;
	}

	function translatePaths(paths, dx, dy) {
		var out = [], i, j;
		for (i = 0; i < paths.length; i++) {
			var r = paths[i], nr = [];
			for (j = 0; j < r.length; j++) nr.push({ X: r[j].X + dx, Y: r[j].Y + dy });
			out.push(nr);
		}
		return out;
	}

	// Flip across Y: negate Y and reverse ring winding so outer/hole (CCW/CW)
	// orientation semantics are preserved. Used to map canvas y-down -> y-up.
	function flipYPaths(paths) {
		var out = [], i, j;
		for (i = 0; i < paths.length; i++) {
			var r = paths[i], nr = [];
			for (j = r.length - 1; j >= 0; j--) nr.push({ X: r[j].X, Y: -r[j].Y });
			out.push(nr);
		}
		return out;
	}

	function bboxOfTriangles(tri) {
		var minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity, minz = Infinity, maxz = -Infinity;
		var i;
		for (i = 0; i < tri.length; i += 3) {
			if (tri[i] < minx) minx = tri[i];
			if (tri[i] > maxx) maxx = tri[i];
			if (tri[i + 1] < miny) miny = tri[i + 1];
			if (tri[i + 1] > maxy) maxy = tri[i + 1];
			if (tri[i + 2] < minz) minz = tri[i + 2];
			if (tri[i + 2] > maxz) maxz = tri[i + 2];
		}
		if (minx === Infinity) return { w: 0, h: 0, d: 0 };
		return { w: maxx - minx, h: maxy - miny, d: maxz - minz };
	}

	// =====================================================================
	// 1. chainSegments: plain segments -> polylines
	//    Replicates StageMorph.trailsLogAsPolySVG chaining, output as data.
	// =====================================================================
	// segments: [{x1,y1,x2,y2, colorKey, width, cap}]
	// -> polylines: [{points:[{x,y}...], width, cap, colorKey}]
	function chainSegments(segments) {
		var polylines = [];
		var points = null, last = null, clr = null, width = null, cap = null;

		function isSame(a, b) {
			var thres = 1e-9;
			return a && b &&
				(Math.abs(a.x - b.x) < thres && Math.abs(a.y - b.y) < thres);
		}
		function flush() {
			if (points && points.length > 1) {
				polylines.push({ points: points, width: width, cap: cap, colorKey: clr });
			}
		}

		var i;
		for (i = 0; i < segments.length; i++) {
			var s = segments[i];
			var p1 = { x: s.x1, y: s.y1 }, p2 = { x: s.x2, y: s.y2 };
			if (last == null) {
				points = [p1, p2]; last = p2;
				clr = s.colorKey; width = s.width; cap = s.cap;
			} else if (isSame(p1, last) &&
				s.colorKey === clr && s.width === width && s.cap === cap) {
				points.push(p2); last = p2;
			} else {
				flush();
				points = [p1, p2]; last = p2;
				clr = s.colorKey; width = s.width; cap = s.cap;
			}
		}
		flush();
		return polylines;
	}

	// =====================================================================
	// 2. computeScale: target width -> scale
	//    If `input` is a number, it is a centreline bbox width in PIXELS and
	//    the result is pxToClip (clip units per pixel) that maps that width to
	//    widthMm. If `input` is Paths (clip units), the result is a unitless
	//    rescale factor mapping their bbox width to widthMm. Either way it is
	//    "the factor that makes bbox width == widthMm".
	// =====================================================================
	function computeScale(input, widthMm) {
		var CLIPU = G().CLIP;
		var wUnits = (typeof input === 'number') ? input : bboxOfPaths(input).w;
		if (!wUnits) return CLIPU;
		return (widthMm * CLIPU) / wUnits;
	}

	// =====================================================================
	// 3. vectorToPaths: polylines -> {strokePaths, closedPaths}
	//    Points px -> clip via pxToClip; stroke width per polyline is
	//    max((lineMmOverride!=null? lineMmOverride*CLIP : width*pxToClip),
	//        minFeatureMm*CLIP). Also returns closed centreline loops (first
	//    point == last within tolerance) as polygon rings for even-odd fill.
	// =====================================================================
	// Bounding-box width (px) across all polyline centrelines. Used to convert a
	// mm resample target into provisional px before the fit-to-widthMm step.
	function _polylinesBBoxWidthPx(polylines) {
		var minX = Infinity, maxX = -Infinity, i, j;
		for (i = 0; i < polylines.length; i++) {
			var pts = polylines[i].points || [];
			for (j = 0; j < pts.length; j++) {
				if (pts[j].x < minX) minX = pts[j].x;
				if (pts[j].x > maxX) maxX = pts[j].x;
			}
		}
		return (minX === Infinity) ? 0 : (maxX - minX);
	}

	function vectorToPaths(polylines, opts) {
		var g = G(), CLIPU = g.CLIP;
		opts = opts || {};
		var pxToClip = (opts.pxToClip != null) ? opts.pxToClip : CLIPU;
		var minFeatureMm = (opts.minFeatureMm != null) ? opts.minFeatureMm : 0;
		var lineOverride = opts.lineMmOverride; // null/undefined => use pen width
		// Chaikin iterations applied to each centerline before stroking, so a
		// coarse turtle polygon (few long segments) becomes a smooth curve and
		// the extruded wall stops showing one facet per pen segment.
		var smoothIters = (opts.smoothingIters != null) ? opts.smoothingIters : 0;

		// Density normalization: after smoothing, resample every centerline to a
		// uniform ~resampleMm spacing (measured in the FINAL printed drawing).
		// This is the real ridge fix -- it stops the stroke offset from folding
		// over itself on dense/noisy input (which produced thousands of tiny
		// transverse ripples) and interpolates coarse input up into a clean
		// curve. Spacing is scale-independent here because the drawing is later
		// fit to widthMm; convert the mm target into provisional px via the
		// centreline bbox width and the requested widthMm.
		var resampleMm = (opts.resampleMm != null) ? opts.resampleMm : 0;
		var widthMm = opts.widthMm;
		var targetPx = 0;
		if (resampleMm > 0 && widthMm > 0) {
			var bx = _polylinesBBoxWidthPx(polylines);
			if (bx > 0) targetPx = resampleMm * bx / widthMm;
		}

		var strokeInput = [], closedPaths = [], i, j;

		for (i = 0; i < polylines.length; i++) {
			var pl = polylines[i];
			var pts = pl.points;
			if (!pts || pts.length < 1) continue;

			// Decide closedness on the raw stage-coord points, then smooth and
			// resample in float space (before quantizing). Smooth rounds coarse
			// corners; resample levels the point density so the offset is clean.
			var raw = pts;
			var np = raw.length;
			var closed = np > 3 &&
				Math.abs(raw[0].x - raw[np - 1].x) < 1e-6 &&
				Math.abs(raw[0].y - raw[np - 1].y) < 1e-6;
			var ringPts = closed ? raw.slice(0, np - 1) : raw;
			if (smoothIters > 0 && ringPts.length >= 3) {
				ringPts = g.smoothPolyline(ringPts, {
					closed: closed, iters: smoothIters, simplifyEps: opts.simplifyPx || 0.5
				});
			}
			if (targetPx > 0 && ringPts.length >= 2) {
				ringPts = g.resamplePolyline(ringPts, targetPx, closed);
			}
			var centre = closed
				? (ringPts.length >= 3 ? ringPts.concat([ringPts[0]]) : raw)
				: ringPts;

			var cpts = [];
			for (j = 0; j < centre.length; j++) {
				cpts.push({ X: Math.round(centre[j].x * pxToClip), Y: Math.round(centre[j].y * pxToClip) });
			}
			var wpx = (pl.width != null) ? pl.width : 1;
			var widthClip = Math.max(
				(lineOverride != null ? lineOverride * CLIPU : wpx * pxToClip),
				minFeatureMm * CLIPU
			);
			strokeInput.push({ points: cpts, widthClip: widthClip, cap: pl.cap || 'round' });

			var n = cpts.length;
			var isClosed = n > 3 &&
				Math.abs(cpts[0].X - cpts[n - 1].X) < 2 &&
				Math.abs(cpts[0].Y - cpts[n - 1].Y) < 2;
			if (isClosed) {
				var ring = cpts.slice(0, n - 1);
				if (ring.length >= 3) closedPaths.push(ring);
			}
		}
		var strokePaths = g.strokePolylines(strokeInput);
		return { strokePaths: strokePaths, closedPaths: closedPaths };
	}

	// =====================================================================
	// 4. applyStyle: (strokePaths, closedPaths, style, opts) -> region Paths
	//    'walls'          -> strokePaths as-is.
	//    'solid'/'relief' -> fill closed loops even-odd, union strokes.
	// The min-feature morphology (close/thicken) is only needed for RASTER
	// sources, whose traced contours can have pinholes and sub-min-feature
	// slivers. Vector strokes are already stroked at >= minFeature by
	// construction, so running morphology on them only re-tessellates curved
	// walls and reintroduces fine ripple -- skip it unless opts.morph is set.
	//    (relief base plate is added later in buildModelStack.)
	// =====================================================================
	function applyStyle(strokePaths, closedPaths, style, opts) {
		var g = G(), CLIPU = g.CLIP;
		opts = opts || {};
		if (style === 'walls') return strokePaths;

		var minFeatureMm = (opts.minFeatureMm != null) ? opts.minFeatureMm : 0.9;
		var holeMinMm2 = (opts.holeMinMm2 != null) ? opts.holeMinMm2 : 0;

		var filled = [];
		if (closedPaths && closedPaths.length) {
			// even-odd union so concentric loops become annuli (holes), not solids
			filled = g.union(closedPaths, null, CL().PolyFillType.pftEvenOdd);
		}
		var region = g.union(filled, strokePaths); // NonZero merge
		if (!region || region.length === 0) return region || [];
		if (opts.morph) {
			region = g.morphClose(region, (minFeatureMm / 2) * CLIPU);
			region = g.morphThicken(region, minFeatureMm * CLIPU);
		}
		region = g.dropSmallHoles(region, holeMinMm2 * CLIPU * CLIPU);
		return region;
	}

	// Raster path: traced contours (already filled regions) mapped to y-up.
	function traceToPaths(imageData, opts) {
		var g = G();
		opts = opts || {};
		var paths = g.traceRaster(
			imageData,
			(opts.alphaThreshold != null) ? opts.alphaThreshold : 16,
			(opts.simplifyEps != null) ? opts.simplifyEps : 0.75,
			(opts.chaikinIters != null) ? opts.chaikinIters : 1,
			(opts.pxToClip != null) ? opts.pxToClip : g.CLIP * 0.1
		);
		return flipYPaths(paths);
	}

	// =====================================================================
	// 5. buildModelStack: region -> layers (fit to widthMm)
	//    walls/solid: single layer [0, extrudeMm].
	//    relief: base plate roundedRect(bbox+3mm) [0, baseMm]; design on top.
	// =====================================================================
	// Clean an outline region once it is at final (mm) scale: drop near-duplicate
	// and collinear vertices (CleanPolygons), taking the wall from tens of
	// thousands of facets to a few thousand with no visible shape change. The
	// ridge cause is fixed upstream by centreline resampling; an optional light
	// Chaikin ring smooth (outlineSmoothIters, default 0) can further level the
	// small residual ripple the solid-style morphology leaves, but it rounds
	// tight corners, so it is off by default. Re-canonicalize via StrictlySimple
	// union so the result stays manifold.
	function cleanRegion(region, settings) {
		var g = G(), CLIPU = g.CLIP;
		if (!region || !region.length) return region;
		// Fixed small tolerance: this only strips near-duplicate/collinear noise
		// from the offset's round-join arcs. It must NOT scale with resample --
		// a loose tolerance (the old 0.03mm) decimated gentle curves into big
		// flat facets (turnP95 ~90 deg). 0.004mm keeps walls smooth (turnP95 ~5 deg).
		var tolMm = (settings && settings.outlineCleanMm != null) ? settings.outlineCleanMm : 0.004;
		var iters = (settings && settings.outlineSmoothIters != null) ? settings.outlineSmoothIters : 0;
		var smoothed = region, i, k;
		if (iters > 0) {
			smoothed = [];
			for (i = 0; i < region.length; i++) {
				var ring = region[i];
				if (!ring || ring.length < 6) { smoothed.push(ring); continue; }
				var fp = [];
				for (k = 0; k < ring.length; k++) fp.push({ x: ring[k].X, y: ring[k].Y });
				var sm = g.smoothPolyline(fp, { closed: true, iters: iters, simplifyEps: 0 });
				var ip = [];
				for (k = 0; k < sm.length; k++) ip.push({ X: Math.round(sm[k].x), Y: Math.round(sm[k].y) });
				smoothed.push(ip);
			}
		}
		var cleaned = (tolMm > 0) ? g.cleanPaths(smoothed, tolMm * CLIPU) : smoothed;
		if (!cleaned.length) return region;
		return g.union(cleaned, null);
	}

	function buildModelStack(region, style, settings) {
		var g = G(), CLIPU = g.CLIP;
		var bb = bboxOfPaths(region);
		if (bb.w > 0) region = scalePaths(region, (settings.widthMm * CLIPU) / bb.w);
		region = cleanRegion(region, settings);

		var extrude = settings.extrudeMm;
		if (style === 'relief') {
			var base = settings.baseMm;
			var bb2 = bboxOfPaths(region);
			var margin = 3 * CLIPU;
			var w = bb2.w + 2 * margin, h = bb2.h + 2 * margin;
			var cx = (bb2.minX + bb2.maxX) / 2, cy = (bb2.minY + bb2.maxY) / 2;
			var plate = [g.roundedRect(cx, cy, w, h, Math.min(w, h) * 0.1, 32)];
			return [
				{ z0Mm: 0, z1Mm: base, region: plate },
				{ z0Mm: base, z1Mm: base + extrude, region: region }
			];
		}
		return [{ z0Mm: 0, z1Mm: extrude, region: region }];
	}

	// =====================================================================
	// 6. buildStampStack: design -> [grip, loft, slab, mirrored design]
	//    Follows print3d-geometry test.js Test 7 loft contract EXACTLY:
	//    resample grip & slab rings to the same N, reuse those rings verbatim
	//    as BOTH the loft rings AND the adjacent normal layers' region rings.
	// =====================================================================
	function buildStampStack(designRegion, settings) {
		var g = G(), CLIPU = g.CLIP;

		// fit design to widthMm
		var bb = bboxOfPaths(designRegion);
		if (bb.w > 0) designRegion = scalePaths(designRegion, (settings.widthMm * CLIPU) / bb.w);
		designRegion = cleanRegion(designRegion, settings);
		bb = bboxOfPaths(designRegion);
		var cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;

		var designWmm = bb.w / CLIPU, designHmm = bb.h / CLIPU;
		var slabWmm = designWmm + 8, slabHmm = designHmm + 8;      // 4mm margin/side
		// Grip is a uniformly-scaled copy of the slab (same aspect ratio) so the
		// loft connects corresponding vertices without twisting -- a differently
		// proportioned grip made the tapered walls kink (90deg facets). Scale so
		// the larger grip dimension is ~40mm (a comfortable handle).
		var gripScale = Math.min(0.65, 40 / Math.max(slabWmm, slabHmm));
		var gripWmm = slabWmm * gripScale;
		var gripHmm = slabHmm * gripScale;

		var gripMm = settings.stampGripMm;
		var slabMm = settings.stampBaseMm;
		var reliefMm = settings.stampReliefMm;

		// taper needed so the loft wall never exceeds 45 degrees: half the max
		// per-side lateral growth (== half the max of the full width/height gain).
		var dW = Math.max(0, slabWmm - gripWmm), dH = Math.max(0, slabHmm - gripHmm);
		var taperMm = Math.max(0.5, Math.max(dW, dH) / 2);

		// Ring resolution: ~0.3mm point spacing (like the rest of the pipeline)
		// derived from the larger (slab) perimeter, so the grip/slab/loft walls
		// are as smooth as the design. A fixed low N starved the corners (~22deg
		// facets). Grip and slab share one N (the loft contract needs equal N).
		var slabPerimMm = 2 * (slabWmm + slabHmm);
		var N = Math.max(128, Math.min(1500, Math.round(slabPerimMm / 0.3)));
		var gripRing = g.resampleRing(
			g.roundedRect(cx, cy, gripWmm * CLIPU, gripHmm * CLIPU, Math.min(gripWmm, gripHmm) * 0.15 * CLIPU, 32), N);
		var slabRing = g.resampleRing(
			g.roundedRect(cx, cy, slabWmm * CLIPU, slabHmm * CLIPU, Math.min(slabWmm, slabHmm) * 0.15 * CLIPU, 32), N);

		// mirror the design left-right, in place about its own bbox centre
		var mirrored = translatePaths(g.mirrorX(translatePaths(designRegion, -cx, -cy)), cx, cy);

		var z0 = 0;
		var zGrip = z0 + gripMm;
		var zLoft = zGrip + taperMm;
		var zSlab = zLoft + slabMm;
		var zTop = zSlab + reliefMm;

		return [
			{ z0Mm: z0, z1Mm: zGrip, region: [gripRing] },
			{ z0Mm: zGrip, z1Mm: zLoft, ringBottom: gripRing, ringTop: slabRing },
			{ z0Mm: zLoft, z1Mm: zSlab, region: [slabRing] },
			{ z0Mm: zSlab, z1Mm: zTop, region: mirrored }
		];
	}

	// =====================================================================
	// 7. buildCutterStack: solid region -> [flange, blade]
	//    O = the solid region's contours. Blade wall spans +/- blade/2 around
	//    O's boundary; flange extends outward by flangeWidth from the blade's
	//    outer edge. buildStack's containment keeps blade within flange.
	// =====================================================================
	function buildCutterStack(designRegion, settings) {
		var g = G(), CLIPU = g.CLIP;
		var bb = bboxOfPaths(designRegion);
		if (bb.w > 0) designRegion = scalePaths(designRegion, (settings.widthMm * CLIPU) / bb.w);
		designRegion = cleanRegion(designRegion, settings);

		var O = designRegion;
		var bladeClip = settings.cutterBladeMm * CLIPU;
		var flangeWClip = settings.cutterFlangeWidthMm * CLIPU;

		var inBlade = g.offsetPolygons(O, -bladeClip / 2);
		var outBlade = g.offsetPolygons(O, bladeClip / 2);
		var bladeRing = g.difference(outBlade, inBlade);

		var outFlange = g.offsetPolygons(O, bladeClip / 2 + flangeWClip);
		var flangeRing = g.difference(outFlange, inBlade);

		var flangeThick = settings.cutterFlangeThickMm;
		var height = settings.cutterHeightMm;

		return [
			{ z0Mm: 0, z1Mm: flangeThick, region: flangeRing },
			{ z0Mm: flangeThick, z1Mm: height, region: bladeRing }
		];
	}

	// =====================================================================
	// 8. makeSTL: layers -> {buffer, triCount, watertight, dims, audit}
	// =====================================================================
	function makeSTL(layers) {
		var g = G();
		var res = g.buildStack(layers);
		var buffer = g.writeBinarySTL(res.triangles, res.triCount);
		var bb = bboxOfTriangles(res.triangles);
		return {
			buffer: buffer,
			triCount: res.triCount,
			watertight: res.watertight,
			audit: res.audit,
			dims: { w: bb.w, d: bb.h, h: bb.d } // x=width, y=depth, z=height (mm)
		};
	}

	// ---- public API -----------------------------------------------------
	var api = {
		init: init,
		// helpers
		bboxOfPaths: bboxOfPaths,
		bboxOfTriangles: bboxOfTriangles,
		scalePaths: scalePaths,
		translatePaths: translatePaths,
		flipYPaths: flipYPaths,
		// pipeline
		chainSegments: chainSegments,
		computeScale: computeScale,
		vectorToPaths: vectorToPaths,
		applyStyle: applyStyle,
		traceToPaths: traceToPaths,
		buildModelStack: buildModelStack,
		buildStampStack: buildStampStack,
		buildCutterStack: buildCutterStack,
		makeSTL: makeSTL
	};
	return api;
})();

if (typeof window !== 'undefined') { window.Print3DPipeline = Print3DPipeline; }
if (typeof module !== 'undefined' && module.exports) { module.exports = Print3DPipeline; }


// Snap glue (browser-only) /////////////////////////////////////////////
// Guarded so this file can be require()'d headless for pipeline testing.

if (typeof StageMorph !== 'undefined' && typeof SnapExtensions !== 'undefined') {

	// ---- controller ----------------------------------------------------
	window.Print3DController = function (stage) {
		this.stage = stage;
		this.settings = {
			widthMm: 60,
			extrudeMm: 5,
			lineMm: null,
			baseMm: 3,
			minFeatureMm: 0.9,
			stampReliefMm: 3,
			stampBaseMm: 4,
			stampGripMm: 12,
			cutterBladeMm: 1.0,
			cutterHeightMm: 15,
			cutterFlangeWidthMm: 4,
			cutterFlangeThickMm: 2,
			holeMinMm2: 4,
			smoothing: 2,       // single "Smoothness" knob (0-5); drives Chaikin
			                    // corner-rounding AND the centreline resample.
			resampleMm: null,   // null => derive from smoothing (smoothnessResampleMm)
			supersample: 2,
			style: "solid",
			source: "pen trails",
			region: null
		};
		this.captured = null;   // {polylines} or {imageData}
		this.lastMesh = null;   // makeSTL result
	};

	// Map the Smoothness level (0-5) to a centreline resample spacing (mm).
	// Higher = finer + smoother, but the floor stays at 0.25mm: below ~0.2mm the
	// stroke offset self-intersects and re-corrugates the walls. Combined with
	// the fixed 0.004mm outline clean, every level here yields smooth (turnP95
	// ~4-6 deg) watertight walls on all tested shapes.
	window.smoothnessResampleMm = function (level) {
		var table = [0.45, 0.38, 0.32, 0.28, 0.26, 0.25];
		var L = Math.max(0, Math.min(5, Math.round(level == null ? 2 : level)));
		return table[L];
	};

	window.p3dController = function (stage) {
		if (!stage.print3DController) {
			stage.print3DController = new window.Print3DController(stage);
		}
		return stage.print3DController;
	};

	// Enable vector pen logging so pen trails are available to capture from.
	StageMorph.prototype.enablePenLogging = true;

	// ---- capture (Snap objects -> plain data) --------------------------

	function _inRect(p, rect) {
		return p.x >= rect.x && p.x <= rect.x + rect.w &&
			p.y >= rect.y && p.y <= rect.y + rect.h;
	}

	// stage.trailsLog -> chained polylines (plain data). y-up, no flip.
	function captureVector(stage, regionRect) {
		var log = stage.trailsLog || [];
		var segs = [], i;
		for (i = 0; i < log.length; i++) {
			var line = log[i];
			var a = line[0], b = line[1], clr = line[2];
			if (regionRect && !(_inRect(a, regionRect) && _inRect(b, regionRect))) continue;
			segs.push({
				x1: a.x, y1: a.y, x2: b.x, y2: b.y,
				colorKey: Math.round(clr.r) + ',' + Math.round(clr.g) + ',' + Math.round(clr.b),
				width: line[3],
				cap: line[4]
			});
		}
		return Print3DPipeline.chainSegments(segs);
	}

	// trailsCanvas (+ optionally visible sprites) -> {width,height,data} at
	// supersample scale. NOTE: canvas y is DOWN; traceToPaths flips it to y-up.
	// regionRect (optional): {x,y,w,h} in Snap stage coords (y-up, origin at
	// stage centre, x/y = the rect's MIN corner — same convention as
	// p3d_setregion / captureVector's _inRect). When given, the returned
	// imageData is cropped to that rect (converted to canvas pixels, y-down,
	// scaled by supersample). Cropping only changes which pixels are
	// returned; traceToPaths works purely in the returned image's own pixel
	// space, and the final stack rescales to widthMm, so the crop's absolute
	// offset within the original canvas does not need to be preserved.
	function captureRaster(stage, which, regionRect) {
		var dims = stage.dimensions; // Point 480x360
		var ctrl = window.p3dController(stage);
		var ss = ctrl.settings.supersample || 1;
		var w = dims.x, h = dims.y;
		var off = document.createElement('canvas');
		off.width = Math.round(w * ss);
		off.height = Math.round(h * ss);
		var ctx = off.getContext('2d');
		ctx.imageSmoothingEnabled = true;
		ctx.scale(ss, ss);

		// pen trails
		var trails = stage.penTrails();
		if (trails) ctx.drawImage(trails, 0, 0, w, h);

		// composite visible sprites for 'whole stage' (skip backdrop)
		if (which === 'stage') {
			var kids = stage.children, i;
			for (i = 0; i < kids.length; i++) {
				var m = kids[i];
				if (!(m instanceof SpriteMorph)) continue;
				if (!m.isVisible) continue;
				try {
					var img = m.getImage();
					if (img.width < 1 || img.height < 1) continue;
					// same math as SpriteMorph.doStamp: draw at the sprite's
					// top-left relative to the stage, unscaled by stage.scale
					ctx.drawImage(img,
						(m.left() - stage.left()) / stage.scale,
						(m.top() - stage.top()) / stage.scale,
						img.width / stage.scale,
						img.height / stage.scale);
				} catch (e) { /* skip sprite we cannot render */ }
			}
		}

		var sx = 0, sy = 0, sw = off.width, sh = off.height;
		if (regionRect && regionRect.w > 0 && regionRect.h > 0) {
			// stage coords (y-up, centre origin) -> unscaled canvas pixels
			// (y-down, top-left origin): canvasX = snapX + w/2,
			// canvasY = h/2 - snapY. The rect's top edge (max snapY) maps to
			// the smallest canvasY.
			var cx0 = regionRect.x + w / 2;
			var cx1 = regionRect.x + regionRect.w + w / 2;
			var cy0 = h / 2 - (regionRect.y + regionRect.h);
			var cy1 = h / 2 - regionRect.y;
			var rx0 = Math.max(0, Math.min(w, Math.min(cx0, cx1)));
			var rx1 = Math.max(0, Math.min(w, Math.max(cx0, cx1)));
			var ry0 = Math.max(0, Math.min(h, Math.min(cy0, cy1)));
			var ry1 = Math.max(0, Math.min(h, Math.max(cy0, cy1)));
			sx = Math.round(rx0 * ss);
			sy = Math.round(ry0 * ss);
			sw = Math.max(1, Math.min(off.width - sx, Math.round((rx1 - rx0) * ss)));
			sh = Math.max(1, Math.min(off.height - sy, Math.round((ry1 - ry0) * ss)));
		}

		var full = ctx.getImageData(sx, sy, sw, sh);
		return { width: full.width, height: full.height, data: full.data };
	}

	// Build the design region (clip Paths) from whatever is captured.
	function regionFromCapture(ctrl, forStyle) {
		var s = ctrl.settings;
		var cap = ctrl.captured;
		if (cap && cap.polylines) {
			// resampleMm null => derive from the Smoothness knob.
			var resampleMm = (s.resampleMm != null)
				? s.resampleMm : window.smoothnessResampleMm(s.smoothing);
			var vp = Print3DPipeline.vectorToPaths(cap.polylines, {
				pxToClip: G_CLIP(),                 // provisional; final fit rescales
				lineMmOverride: s.lineMm,
				minFeatureMm: s.minFeatureMm,
				smoothingIters: s.smoothing,
				resampleMm: resampleMm,
				widthMm: s.widthMm
			});
			return Print3DPipeline.applyStyle(vp.strokePaths, vp.closedPaths, forStyle, {
				minFeatureMm: s.minFeatureMm,
				holeMinMm2: s.holeMinMm2
			});
		}
		if (cap && cap.imageData) {
			var region = Print3DPipeline.traceToPaths(cap.imageData, {});
			if (forStyle === 'walls') {
				// outline: stroke the traced contours at line thickness
				var g = window.Print3DGeometry;
				var lineClip = (s.lineMm != null ? s.lineMm : s.minFeatureMm) * g.CLIP;
				var polys = [], i;
				for (i = 0; i < region.length; i++) {
					var r = region[i].slice();
					r.push(r[0]);
					polys.push({ points: r.map(function (p) { return { X: p.X, Y: p.Y }; }), widthClip: lineClip, cap: 'round' });
				}
				return g.strokePolylines(polys);
			}
			return region; // solid/relief use the filled trace directly
		}
		return [];
	}

	function G_CLIP() { return window.Print3DGeometry.CLIP; }

	// Shared by the p3d_capture primitive and the preview dialog's debounced
	// remesh, so both stay in sync on the "no region set yet" behaviour.
	// Returns {error} | {usedRaster, tip}.
	function performCapture(stage, ctrl, source) {
		var region = (source === 'region') ? ctrl.settings.region : null;
		if (source === 'region' && !region) {
			return { error: 'Set a region first with the block or the preview dialog' };
		}
		ctrl.settings.source = source;
		if (source === 'whole stage') {
			ctrl.captured = { imageData: captureRaster(stage, 'stage', region) };
			return { usedRaster: true };
		}
		// 'pen trails' or 'region': prefer vector, else raster fallback
		if (stage.trailsLog && stage.trailsLog.length) {
			ctrl.captured = { polylines: captureVector(stage, region) };
			return { usedRaster: false };
		}
		ctrl.captured = { imageData: captureRaster(stage, 'trails', region) };
		return { usedRaster: true, tip: true };
	}

	function getIDE(stage) {
		var ide = stage.parentThatIsA(IDE_Morph);
		if (!ide && typeof world !== 'undefined' && world.children[0]) ide = world.children[0];
		return ide;
	}

	function projectName(stage) {
		var ide = getIDE(stage);
		return (ide && ide.getProjectName && ide.getProjectName()) || (ide && ide.projectName) || 'drawing';
	}

	function clamp(v, lo, hi) {
		v = parseFloat(v);
		if (isNaN(v)) return lo;
		return Math.max(lo, Math.min(hi, v));
	}

	// ---- lazy BABYLON loader --------------------------------------------
	// BABYLON is a large third-party lib already shipped with the beetle
	// library (libraries/beetle/babylon.js). We don't want every print3d
	// user to pay for it, so we only inject the script tag the first time
	// the preview dialog is actually opened. If beetle.js has already
	// loaded it (both libraries can coexist in a project), `BABYLON` is
	// already global and we call back immediately.
	var _p3dBabylonState = 0; // 0 = not started, 1 = loading, 2 = loaded, 3 = error
	var _p3dBabylonCallbacks = [];

	function loadBabylon(callback) {
		if (typeof BABYLON !== 'undefined') { callback(); return; }
		_p3dBabylonCallbacks.push(callback);
		if (_p3dBabylonState === 1) return;
		_p3dBabylonState = 1;
		var ide = null;
		try { ide = world.children[0]; } catch (e) { /* world may not exist headlessly */ }
		var url = (ide && ide.resourceURL) ?
			ide.resourceURL('libraries/beetle/babylon.js') :
			'libraries/beetle/babylon.js';
		var script = document.createElement('script');
		script.onload = function () {
			_p3dBabylonState = 2;
			var cbs = _p3dBabylonCallbacks;
			_p3dBabylonCallbacks = [];
			cbs.forEach(function (cb) { cb(); });
		};
		script.onerror = function (err) {
			_p3dBabylonState = 3;
			var cbs = _p3dBabylonCallbacks;
			_p3dBabylonCallbacks = [];
			cbs.forEach(function (cb) { cb(err || new Error('failed to load babylon.js')); });
		};
		document.head.appendChild(script);
		script.src = url;
	}

	// ---- Print3DRegionOverlayMorph ---------------------------------------
	// A transparent marquee-select Morph placed on top of the stage (pattern
	// borrowed from beetle.js's BeetleStageOverlayMorph for the
	// add-as-stage-child / cover-full-extent / fullChanged-on-destroy
	// mechanics). Left-drag draws a rubber-band rectangle; releasing commits
	// it as the print region; Esc or right-click cancels. It lives only for
	// the duration of the selection gesture.

	function Print3DRegionOverlayMorph(stage, onCommit, onCancel) {
		this.init(stage, onCommit, onCancel);
	}

	Print3DRegionOverlayMorph.prototype = new Morph();
	Print3DRegionOverlayMorph.prototype.constructor = Print3DRegionOverlayMorph;
	Print3DRegionOverlayMorph.uber = Morph.prototype;

	Print3DRegionOverlayMorph.prototype.init = function (stage, onCommit, onCancel) {
		this.stage = stage;
		this.onCommit = onCommit || null;
		this.onCancel = onCancel || null;
		this.anchor = null;  // Point, world/hand coords
		this.current = null; // Point, world/hand coords

		Print3DRegionOverlayMorph.uber.init.call(this);
		this.isCachingImage = false;
		this.setExtent(stage.extent());
		this.setPosition(stage.position());

		var w = stage.world();
		this.savedKeyboardFocus = w ? w.keyboardFocus : null;
		if (w) { w.keyboardFocus = this; }

		stage.add(this);
		this.changed();
	};

	Print3DRegionOverlayMorph.prototype.render = function (ctx) {
		var w = this.width(), h = this.height(), x0, y0, rw, rh;
		ctx.save();
		ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
		ctx.fillRect(0, 0, w, h);
		if (this.anchor && this.current) {
			x0 = Math.min(this.anchor.x, this.current.x) - this.left();
			y0 = Math.min(this.anchor.y, this.current.y) - this.top();
			rw = Math.abs(this.current.x - this.anchor.x);
			rh = Math.abs(this.current.y - this.anchor.y);
			ctx.clearRect(x0, y0, rw, rh);
			ctx.strokeStyle = 'white';
			ctx.lineWidth = 1;
			if (ctx.setLineDash) { ctx.setLineDash([4, 4]); }
			ctx.strokeRect(x0 + 0.5, y0 + 0.5, rw, rh);
		}
		ctx.restore();
	};

	Print3DRegionOverlayMorph.prototype.mouseDownLeft = function (pos) {
		this.anchor = pos;
		this.current = pos;
		this.changed();
	};

	Print3DRegionOverlayMorph.prototype.mouseMove = function (pos, button) {
		if (button !== 'left' || !this.anchor) return;
		this.current = pos;
		this.changed();
	};

	Print3DRegionOverlayMorph.prototype.mouseClickLeft = function (pos) {
		this.commit(pos);
	};

	Print3DRegionOverlayMorph.prototype.mouseDownRight = function () {
		this.cancelSelection();
	};

	Print3DRegionOverlayMorph.prototype.processKeyDown = function (event) {
		if (event.keyCode === 27) { this.cancelSelection(); }
	};

	// Convert the marquee's two corners (world/hand pixel coords) into Snap
	// stage coords (y-up, centre origin) via StageMorph.snapPoint (mirrors
	// SpriteMorph.prototype.snapPoint, see snap/src/objects.js), then store
	// as {x,y,w,h} with x,y = the rect's MIN corner — the same convention
	// p3d_setregion(x,y,w,h) already uses (see captureVector's _inRect).
	Print3DRegionOverlayMorph.prototype.commit = function (pos) {
		var p1, p2, x, y, w, h;
		if (!this.anchor) { this.cancelSelection(); return; }
		p1 = this.stage.snapPoint(this.anchor);
		p2 = this.stage.snapPoint(pos || this.current);
		x = Math.min(p1.x, p2.x);
		y = Math.min(p1.y, p2.y);
		w = Math.abs(p2.x - p1.x);
		h = Math.abs(p2.y - p1.y);
		this.destroy();
		if (w < 1 || h < 1) {
			if (this.onCancel) this.onCancel();
			return;
		}
		if (this.onCommit) this.onCommit({ x: x, y: y, w: w, h: h });
	};

	Print3DRegionOverlayMorph.prototype.cancelSelection = function () {
		this.destroy();
		if (this.onCancel) this.onCancel();
	};

	Print3DRegionOverlayMorph.prototype.destroy = function () {
		var w = this.stage && this.stage.world();
		if (w && w.keyboardFocus === this) { w.keyboardFocus = this.savedKeyboardFocus || null; }
		Print3DRegionOverlayMorph.uber.destroy.call(this); // removes from stage + fullChanged
	};

	// ---- Print3DDialogMorph -----------------------------------------------
	// Live 3D preview dialog. Structure/patterns borrowed from beetle.js's
	// BeetleDialogMorph: a DialogBoxMorph subclass hosting an offscreen
	// BABYLON canvas blitted into a plain Morph via drawImage, plus a
	// hand-rolled AlignmentMorph/ToggleMorph/SliderMorph control panel.

	function Print3DDialogMorph(stage, ctrl) {
		this.init(stage, ctrl);
	}

	Print3DDialogMorph.prototype = new DialogBoxMorph();
	Print3DDialogMorph.prototype.constructor = Print3DDialogMorph;
	Print3DDialogMorph.uber = DialogBoxMorph.prototype;

	Print3DDialogMorph.prototype.init = function (stage, ctrl) {
		this.stage = stage;
		this.ctrl = ctrl;
		this.padding = 12;

		// babylon / mesh state
		this.engine = null;
		this.scene = null;
		this.camera = null;
		this.glCanvas = null;
		this.mesh3d = null;
		this.previewMaterial = null;
		this.renderWidth = 480;
		this.renderHeight = 360;
		this.needsRender = true;

		// remesh debounce state
		this.dirty = true;
		this.dirtyAt = Date.now();
		this.sourceChanged = true;
		this.lastError = null;
		this.exportKind = 'model'; // 'model' | 'stamp' | 'cookie cutter'

		// camera drag state
		this.dragOrigin = null;
		this.dragAlpha = 0;
		this.dragBeta = 0;

		this.initRenderView();
		this.initControlPanel();
		this.initMouseControls();

		Print3DDialogMorph.uber.init.call(this);
		this.labelString = '3D Print Preview';
		this.createLabel();
		this.buildContents();

		var self = this;
		loadBabylon(function (err) {
			if (err) {
				self.lastError = 'Could not load the 3D engine: ' + (err.message || err);
				self.setStatus(self.lastError);
				return;
			}
			self.setupBabylon();
		});
	};

	Print3DDialogMorph.prototype.initRenderView = function () {
		var self = this;
		this.renderView = new Morph();
		this.renderView.setExtent(new Point(this.renderWidth, this.renderHeight));
		this.renderView.color = new Color(225, 225, 225);
		this.renderView.render = function (ctx) {
			if (self.glCanvas) {
				ctx.drawImage(self.glCanvas, 0, 0, self.renderWidth, self.renderHeight);
			} else {
				ctx.fillStyle = 'rgb(225, 225, 225)';
				ctx.fillRect(0, 0, this.width(), this.height());
				ctx.fillStyle = 'rgb(60, 60, 60)';
				ctx.font = '14px sans-serif';
				ctx.fillText('Loading 3D preview…', 16, this.height() / 2);
			}
		};
		this.renderView.step = function () {
			if (self.engine && self.scene && self.camera && self.needsRender) {
				try { self.scene.render(); } catch (e) { /* ignore transient WebGL errors */ }
				self.needsRender = false;
				self.renderView.changed();
			}
		};
	};

	Print3DDialogMorph.prototype.setupBabylon = function () {
		this.glCanvas = document.createElement('canvas');
		this.glCanvas.width = this.renderWidth;
		this.glCanvas.height = this.renderHeight;
		this.engine = new BABYLON.Engine(this.glCanvas, true, {
			preserveDrawingBuffer: true,
			stencil: true
		});
		this.scene = new BABYLON.Scene(this.engine);
		this.scene.clearColor = new BABYLON.Color4(0.83, 0.83, 0.83, 1);

		var hemi = new BABYLON.HemisphericLight('p3dHemi', new BABYLON.Vector3(0, 1, 0), this.scene);
		hemi.intensity = 0.75;
		var dir = new BABYLON.DirectionalLight('p3dDir', new BABYLON.Vector3(-0.4, -1, -0.3), this.scene);
		dir.intensity = 0.55;

		// alpha/beta chosen so the camera looks down at the model from a
		// corner, at a moderate elevation -- since we remap the pipeline's Z
		// (print height, "design faces +Z") onto BABYLON's Y (up), this
		// shows the design/top face toward the camera by default, for both
		// flat models and stamps (whose mirrored relief sits on top, at
		// max Z).
		this.camera = new BABYLON.ArcRotateCamera(
			'p3dCam', (315 * Math.PI) / 180, Math.PI / 3, 150, BABYLON.Vector3.Zero(), this.scene
		);
		this.camera.lowerRadiusLimit = 1;

		this.needsRender = true;
		this.markDirty(false);
	};

	Print3DDialogMorph.prototype.initMouseControls = function () {
		var self = this;
		this.renderView.mouseScroll = function (y) {
			if (!self.camera) return;
			var factor = 1 - clamp(y, -10, 10) * 0.08;
			self.camera.radius = Math.max(self.camera.lowerRadiusLimit || 0.5, self.camera.radius * factor);
			self.needsRender = true;
		};
		this.renderView.mouseDownLeft = function (pos) {
			self.dragOrigin = pos;
			self.dragAlpha = self.camera ? self.camera.alpha : 0;
			self.dragBeta = self.camera ? self.camera.beta : 0;
		};
		this.renderView.mouseDownRight = this.renderView.mouseDownLeft;
		this.renderView.mouseMove = function (pos, button) {
			var dx, dy;
			if (!self.camera || !self.dragOrigin) return;
			dx = pos.x - self.dragOrigin.x;
			dy = pos.y - self.dragOrigin.y;
			if (button === 'left') {
				self.camera.alpha = self.dragAlpha - dx * 0.01;
				self.camera.beta = Math.max(0.05, Math.min(Math.PI - 0.05, self.dragBeta - dy * 0.01));
				self.needsRender = true;
			}
		};
	};

	// ---- control panel ----------------------------------------------------

	Print3DDialogMorph.prototype.buildRadioColumn = function (titleText, options, getter, onPick) {
		var self = this, col, title, toggles = [];
		col = new AlignmentMorph('column', 2);
		col.alignment = 'left';
		title = new StringMorph(titleText, 12, null, true);
		col.add(title);
		options.forEach(function (opt) {
			var t = new ToggleMorph(
				'radiobutton',
				null,
				function () {
					onPick(opt.value);
					toggles.forEach(function (tt) { tt.refresh(); });
				},
				opt.label,
				function () { return getter() === opt.value; }
			);
			t.fixLayout();
			col.add(t);
			toggles.push(t);
		});
		col.fixLayout();
		return { morph: col, toggles: toggles, refreshAll: function () { toggles.forEach(function (tt) { tt.refresh(); }); } };
	};

	// scale: 1 for integer-mm sliders, 10 for one-decimal (tenths of a mm).
	Print3DDialogMorph.prototype.buildSlider = function (labelPrefix, minMm, maxMm, scale, getMm, setMm) {
		var self = this, col, readout, slider, startMm;
		col = new AlignmentMorph('column', 2);
		col.alignment = 'left';
		startMm = getMm();
		readout = new StringMorph(
			labelPrefix + ': ' + (startMm == null ? 'as drawn' : startMm.toFixed(scale === 1 ? 0 : 1) + ' mm'),
			11
		);
		col.add(readout);
		slider = new SliderMorph(
			Math.round(minMm * scale), Math.round(maxMm * scale),
			Math.round((startMm == null ? minMm : startMm) * scale),
			6, 'horizontal'
		);
		slider.setExtent(new Point(150, 14));
		slider.color = new Color(180, 180, 180);
		slider.action = function (v) {
			var mm = v / scale;
			setMm(mm);
			readout.text = labelPrefix + ': ' + mm.toFixed(scale === 1 ? 0 : 1) + ' mm';
			readout.fixLayout();
			readout.rerender();
			self.markDirty(false);
		};
		col.add(slider);
		col.fixLayout();
		return { morph: col, slider: slider, readout: readout };
	};

	Print3DDialogMorph.prototype.initControlPanel = function () {
		var self = this, s = this.ctrl.settings, panel, sourceRow, lineGroup;

		panel = new AlignmentMorph('column', this.padding / 2);
		panel.alignment = 'left';

		sourceRow = this.buildRadioColumn(
			'Source',
			[
				{ value: 'pen trails', label: 'pen trails' },
				{ value: 'whole stage', label: 'whole stage' },
				{ value: 'region', label: 'region' }
			],
			function () { return s.source; },
			function (value) {
				s.source = value;
				self.markDirty(true);
			}
		);
		this.sourceToggleGroup = sourceRow;
		panel.add(sourceRow.morph);

		this.selectRegionButton = new PushButtonMorph(this, 'selectRegion', 'Select region…');
		this.selectRegionButton.fixLayout();
		panel.add(this.selectRegionButton);

		panel.add(this.buildRadioColumn(
			'Style',
			[
				{ value: 'solid', label: 'solid' },
				{ value: 'walls', label: 'outline' },
				{ value: 'relief', label: 'relief' }
			],
			function () { return s.style; },
			function (value) { s.style = value; self.markDirty(false); }
		).morph);

		panel.add(this.buildRadioColumn(
			'Export as',
			[
				{ value: 'model', label: 'model' },
				{ value: 'stamp', label: 'stamp' },
				{ value: 'cookie cutter', label: 'cookie cutter' }
			],
			function () { return self.exportKind; },
			function (value) { self.exportKind = value; self.markDirty(false); }
		).morph);

		panel.add(this.buildSlider(
			'Width', 10, 200, 1,
			function () { return s.widthMm; },
			function (mm) { s.widthMm = mm; }
		).morph);

		panel.add(this.buildSlider(
			'Thickness', 1, 50, 1,
			function () { return s.extrudeMm; },
			function (mm) { s.extrudeMm = mm; }
		).morph);

		lineGroup = this.buildSlider(
			'Line thickness', 0.5, 10, 10,
			function () { return s.lineMm; },
			function (mm) { s.lineMm = mm; if (self.asDrawnToggle) self.asDrawnToggle.refresh(); }
		);
		panel.add(lineGroup.morph);

		this.asDrawnToggle = new ToggleMorph(
			'checkbox', null,
			function () {
				if (s.lineMm === null) {
					s.lineMm = lineGroup.slider.value / 10;
				} else {
					s.lineMm = null;
				}
				lineGroup.readout.text = 'Line thickness: ' + (s.lineMm === null ? 'as drawn' : s.lineMm.toFixed(1) + ' mm');
				lineGroup.readout.fixLayout();
				lineGroup.readout.rerender();
				self.markDirty(false);
			},
			'as drawn',
			function () { return s.lineMm === null; }
		);
		this.asDrawnToggle.fixLayout();
		panel.add(this.asDrawnToggle);

		panel.add(this.buildSlider(
			'Min detail', 0.4, 3, 10,
			function () { return s.minFeatureMm; },
			function (mm) { s.minFeatureMm = mm; }
		).morph);

		// Smoothness (0-5): one knob driving both curve corner-rounding and the
		// wall resample fineness. Higher = smoother walls. Not an mm value, so
		// build it inline.
		var smCol = new AlignmentMorph('column', 2);
		smCol.alignment = 'left';
		var smReadout = new StringMorph('Smoothness: ' + s.smoothing, 11);
		smCol.add(smReadout);
		var smSlider = new SliderMorph(0, 5, s.smoothing, 6, 'horizontal');
		smSlider.setExtent(new Point(150, 14));
		smSlider.color = new Color(180, 180, 180);
		smSlider.action = function (v) {
			s.smoothing = Math.round(v);
			smReadout.text = 'Smoothness: ' + s.smoothing;
			smReadout.fixLayout();
			smReadout.rerender();
			self.markDirty(false);
		};
		smCol.add(smSlider);
		smCol.fixLayout();
		panel.add(smCol);

		this.statusText = new TextMorph('Getting ready…', 12, null, true, false, 'left', 460);
		panel.fixLayout();

		this.controlPanel = panel;
	};

	Print3DDialogMorph.prototype.selectRegion = function () {
		var self = this;
		new Print3DRegionOverlayMorph(
			this.stage,
			function (rect) {
				self.ctrl.settings.region = rect;
				self.ctrl.settings.source = 'region';
				if (self.sourceToggleGroup) self.sourceToggleGroup.refreshAll();
				self.markDirty(true);
			},
			null
		);
	};

	Print3DDialogMorph.prototype.buildContents = function () {
		var row = new AlignmentMorph('row', this.padding * 2);
		row.add(this.renderView);
		row.add(this.controlPanel);
		row.fixLayout();

		this.addBody(new AlignmentMorph('column', this.padding));
		this.body.add(row);
		this.body.add(this.statusText);
		this.body.fixLayout();

		this.addButton('downloadSTL', 'Download STL');
		this.addButton('cancel', 'Close');

		this.fixLayout();
	};

	// ---- remesh (debounced) ------------------------------------------------

	Print3DDialogMorph.prototype.markDirty = function (recapture) {
		this.dirty = true;
		this.dirtyAt = Date.now();
		if (recapture) this.sourceChanged = true;
	};

	Print3DDialogMorph.prototype.step = function () {
		if (!this.dirty) return;
		if (Date.now() - this.dirtyAt < 300) return; // debounce
		this.dirty = false;
		this.remesh();
	};

	Print3DDialogMorph.prototype.captureFromSource = function () {
		var res = performCapture(this.stage, this.ctrl, this.ctrl.settings.source);
		if (res.error) throw new Error(res.error);
	};

	Print3DDialogMorph.prototype.remesh = function () {
		var ctrl = this.ctrl, forStyle, region, layers, g, stackRes, buffer, bb, meshResult;
		try {
			if (this.sourceChanged || !ctrl.captured) {
				this.captureFromSource();
				this.sourceChanged = false;
			}
			forStyle = (this.exportKind === 'model') ? ctrl.settings.style : 'solid';
			region = regionFromCapture(ctrl, forStyle);
			if (!region || region.length === 0) {
				this.lastError = null;
				this.clearMesh();
				this.setStatus('Draw something first!');
				return;
			}
			if (this.exportKind === 'stamp') {
				layers = Print3DPipeline.buildStampStack(region, ctrl.settings);
			} else if (this.exportKind === 'cookie cutter') {
				layers = Print3DPipeline.buildCutterStack(region, ctrl.settings);
			} else {
				layers = Print3DPipeline.buildModelStack(region, ctrl.settings.style, ctrl.settings);
			}

			g = window.Print3DGeometry;
			stackRes = g.buildStack(layers);
			if (!stackRes.triCount) {
				this.clearMesh();
				this.setStatus('Draw something first!');
				return;
			}
			buffer = g.writeBinarySTL(stackRes.triangles, stackRes.triCount);
			bb = Print3DPipeline.bboxOfTriangles(stackRes.triangles);
			meshResult = {
				buffer: buffer,
				triCount: stackRes.triCount,
				watertight: stackRes.watertight,
				audit: stackRes.audit,
				dims: { w: bb.w, d: bb.h, h: bb.d }
			};
			ctrl.lastMesh = meshResult;
			this.lastError = null;
			this.updateBabylonMesh(stackRes.triangles, stackRes.triCount);
			this.updateStatus();
		} catch (e) {
			this.lastError = (e && e.message) || String(e);
			this.setStatus('Error: ' + this.lastError);
		}
	};

	Print3DDialogMorph.prototype.clearMesh = function () {
		if (this.mesh3d) {
			this.mesh3d.dispose();
			this.mesh3d = null;
			this.needsRender = true;
		}
	};

	// Rebuilds the BABYLON mesh from the pipeline's flat, non-indexed
	// triangle buffer (9 floats/tri: 3 verts * xyz, no shared vertices).
	// The pipeline works in a Z-up space (x,y = the drawing plane, z =
	// print height/"design faces +Z" -- see the file header comment). We
	// remap that onto BABYLON's Y-up space by swapping Y/Z per vertex; since
	// that swap is a reflection (flips handedness), we also reverse each
	// triangle's winding (emit v0, v2, v1) to keep outward-facing normals
	// correct after the remap.
	Print3DDialogMorph.prototype.updateBabylonMesh = function (triangles, triCount) {
		var i, o, po, positions, indices, normals, mesh, vertexData;
		if (!this.scene) return;

		positions = new Float32Array(triCount * 9);
		indices = new Uint32Array(triCount * 3);
		for (i = 0; i < triCount; i++) {
			o = i * 9;
			po = i * 9;
			positions[po + 0] = triangles[o + 0]; // v0.x
			positions[po + 1] = triangles[o + 2]; // v0.z -> up
			positions[po + 2] = triangles[o + 1]; // v0.y -> depth
			positions[po + 3] = triangles[o + 6]; // v2.x
			positions[po + 4] = triangles[o + 8]; // v2.z -> up
			positions[po + 5] = triangles[o + 7]; // v2.y -> depth
			positions[po + 6] = triangles[o + 3]; // v1.x
			positions[po + 7] = triangles[o + 5]; // v1.z -> up
			positions[po + 8] = triangles[o + 4]; // v1.y -> depth
		}
		for (i = 0; i < indices.length; i++) { indices[i] = i; }

		normals = [];
		BABYLON.VertexData.ComputeNormals(positions, indices, normals);

		this.clearMesh();
		mesh = new BABYLON.Mesh('p3dPreview', this.scene);
		vertexData = new BABYLON.VertexData();
		vertexData.positions = positions;
		vertexData.indices = indices;
		vertexData.normals = normals;
		vertexData.applyToMesh(mesh, true);

		if (!this.previewMaterial) {
			this.previewMaterial = new BABYLON.StandardMaterial('p3dMat', this.scene);
			this.previewMaterial.diffuseColor = new BABYLON.Color3(0.85, 0.52, 0.22); // warm plastic
			this.previewMaterial.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
			this.previewMaterial.backFaceCulling = false; // defensive: stay visible regardless of winding edge-cases
		}
		mesh.material = this.previewMaterial;
		this.mesh3d = mesh;
		this.needsRender = true;

		this.frameCamera(positions, positions.length / 3);
	};

	Print3DDialogMorph.prototype.frameCamera = function (positions, vertCount) {
		var i, x, y, z, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity,
			minZ = Infinity, maxZ = -Infinity, cx, cy, cz, dx, dy, dz, diag;
		if (!this.camera || vertCount === 0) return;
		for (i = 0; i < vertCount; i++) {
			x = positions[i * 3]; y = positions[i * 3 + 1]; z = positions[i * 3 + 2];
			if (x < minX) minX = x; if (x > maxX) maxX = x;
			if (y < minY) minY = y; if (y > maxY) maxY = y;
			if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
		}
		cx = (minX + maxX) / 2; cy = (minY + maxY) / 2; cz = (minZ + maxZ) / 2;
		dx = maxX - minX; dy = maxY - minY; dz = maxZ - minZ;
		diag = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
		this.camera.setTarget(new BABYLON.Vector3(cx, cy, cz));
		this.camera.radius = Math.max(diag * 1.5, 5);
		this.camera.lowerRadiusLimit = Math.max(diag * 0.05, 0.5);
		this.camera.upperRadiusLimit = diag * 10;
	};

	Print3DDialogMorph.prototype.setStatus = function (text) {
		if (!this.statusText) return;
		this.statusText.text = text;
		this.statusText.fixLayout();
		this.statusText.rerender();
	};

	Print3DDialogMorph.prototype.updateStatus = function () {
		var m = this.ctrl.lastMesh, d;
		if (!m) { this.setStatus('No preview yet.'); return; }
		d = m.dims;
		this.setStatus(
			'▲ ' + m.triCount + ' triangles · ' +
			d.w.toFixed(1) + ' × ' + d.d.toFixed(1) + ' × ' + d.h.toFixed(1) + ' mm · watertight ' +
			(m.watertight ? '✓' : '✗')
		);
	};

	Print3DDialogMorph.prototype.downloadSTL = function () {
		var ide = getIDE(this.stage), m = this.ctrl.lastMesh;
		if (!m || !m.buffer) {
			if (ide && ide.showMessage) ide.showMessage('Nothing to export yet.');
			return;
		}
		if (!m.watertight && ide && ide.showMessage) {
			ide.showMessage('Warning: model may not be fully watertight — your slicer can still repair it.');
		}
		if (ide && ide.saveFileAs) {
			ide.saveFileAs(new Blob([m.buffer]), 'model/stl', projectName(this.stage) + '-' + this.exportKind);
		}
	};

	Print3DDialogMorph.prototype.destroy = function () {
		if (this.engine) { try { this.engine.dispose(); } catch (e) { /* ignore */ } }
		if (this.stage && this.stage.print3DDialog === this) { this.stage.print3DDialog = null; }
		Print3DDialogMorph.uber.destroy.call(this);
	};

	// ---- primitives ----------------------------------------------------

	SnapExtensions.primitives.set("p3d_capture(source)", function (source) {
		var stage = this.parentThatIsA(StageMorph);
		var ctrl = window.p3dController(stage);
		var ide = getIDE(stage);
		var res = performCapture(stage, ctrl, source);
		if (res.error) {
			if (ide && ide.showMessage) ide.showMessage(res.error);
			return;
		}
		if (res.tip && ide && ide.showMessage) {
			ide.showMessage('Tip: press the green flag to redraw for smoother curves');
		}
	});

	SnapExtensions.primitives.set("p3d_setstyle(style)", function (style) {
		var stage = this.parentThatIsA(StageMorph);
		var ctrl = window.p3dController(stage);
		var map = { solid: 'solid', outline: 'walls', relief: 'relief' };
		ctrl.settings.style = map[style] || 'solid';
	});

	SnapExtensions.primitives.set("p3d_setoption(option, n)", function (option, n) {
		var stage = this.parentThatIsA(StageMorph);
		var s = window.p3dController(stage).settings;
		switch (option) {
			case 'width': s.widthMm = clamp(n, 10, 300); break;
			case 'thickness': s.extrudeMm = clamp(n, 1, 100); break;
			case 'line thickness': s.lineMm = clamp(n, 0.2, 20); break;
			case 'base': s.baseMm = clamp(n, 0.5, 50); break;
			case 'min detail': s.minFeatureMm = clamp(n, 0.2, 10); break;
			case 'wall': s.cutterBladeMm = clamp(n, 0.4, 10); break;
			case 'handle': s.stampGripMm = clamp(n, 2, 50); break;
			case 'smoothing': s.smoothing = clamp(n, 0, 5); break;
		}
	});

	SnapExtensions.primitives.set("p3d_setregion(x, y, w, h)", function (x, y, w, h) {
		var stage = this.parentThatIsA(StageMorph);
		var s = window.p3dController(stage).settings;
		s.region = { x: parseFloat(x), y: parseFloat(y), w: parseFloat(w), h: parseFloat(h) };
	});

	SnapExtensions.primitives.set("p3d_export(kind)", function (kind) {
		var stage = this.parentThatIsA(StageMorph);
		var ctrl = window.p3dController(stage);
		var ide = getIDE(stage);

		// auto-capture pen trails if nothing captured yet
		if (!ctrl.captured) {
			if (stage.trailsLog && stage.trailsLog.length) {
				ctrl.captured = { polylines: captureVector(stage, null) };
			} else {
				ctrl.captured = { imageData: captureRaster(stage, 'trails', null) };
			}
		}

		var forStyle = (kind === 'model') ? ctrl.settings.style : 'solid';
		var region = regionFromCapture(ctrl, forStyle);
		if (!region || region.length === 0) {
			if (ide && ide.showMessage) ide.showMessage('Draw something first!');
			return;
		}

		var layers;
		if (kind === 'stamp') layers = Print3DPipeline.buildStampStack(region, ctrl.settings);
		else if (kind === 'cookie cutter') layers = Print3DPipeline.buildCutterStack(region, ctrl.settings);
		else layers = Print3DPipeline.buildModelStack(region, ctrl.settings.style, ctrl.settings);

		var res;
		try {
			res = Print3DPipeline.makeSTL(layers);
		} catch (e) {
			if (ide && ide.showMessage) ide.showMessage('3D print failed: ' + e.message);
			return;
		}
		ctrl.lastMesh = res;

		if (!res.watertight && ide && ide.showMessage) {
			ide.showMessage('Warning: model may not be fully watertight — your slicer can still repair it.');
		}
		if (ide && ide.saveFileAs) {
			ide.saveFileAs(new Blob([res.buffer]), 'model/stl', projectName(stage) + '-' + kind);
		}
	});

	SnapExtensions.primitives.set("p3d_quickexport(w, h, style)", function (w, h, style) {
		var stage = this.parentThatIsA(StageMorph);
		var ctrl = window.p3dController(stage);
		ctrl.settings.widthMm = clamp(w, 10, 300);
		ctrl.settings.extrudeMm = clamp(h, 1, 100);
		var map = { solid: 'solid', outline: 'walls', relief: 'relief' };
		ctrl.settings.style = map[style] || 'solid';

		if (stage.trailsLog && stage.trailsLog.length) {
			ctrl.captured = { polylines: captureVector(stage, null) };
		} else {
			ctrl.captured = { imageData: captureRaster(stage, 'trails', null) };
		}
		// reuse export path for 'model'
		var prim = SnapExtensions.primitives.get("p3d_export(kind)");
		prim.call(this, 'model');
	});

	SnapExtensions.primitives.set("p3d_info()", function () {
		var stage = this.parentThatIsA(StageMorph);
		var ctrl = window.p3dController(stage);
		var m = ctrl.lastMesh;
		if (!m) return new List(['nothing exported yet — draw something, then download an STL']);
		var d = m.dims;
		return new List([
			'triangles: ' + m.triCount,
			'size: ' + d.w.toFixed(1) + ' x ' + d.d.toFixed(1) + ' x ' + d.h.toFixed(1) + ' mm',
			'watertight: ' + (m.watertight ? 'yes' : 'no')
		]);
	});

	SnapExtensions.primitives.set("p3d_preview()", function () {
		var stage = this.parentThatIsA(StageMorph);
		var ctrl = window.p3dController(stage);
		var ide = getIDE(stage);
		var w = ide ? ide.world() : stage.world();
		var dialog;

		// dedupe: bring an already-open preview for this stage to front
		// instead of opening a second one.
		if (stage.print3DDialog && stage.print3DDialog.world && stage.print3DDialog.world()) {
			if (w) w.add(stage.print3DDialog);
			stage.print3DDialog.markDirty(false);
			return;
		}

		dialog = new Print3DDialogMorph(stage, ctrl);
		stage.print3DDialog = dialog;
		dialog.popUp(w);
	});
}
