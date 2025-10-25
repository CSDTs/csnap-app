// 3D extension for 3D rendering and fabrication
// extensively inspired in Beetle Blocks
// ---------------------------------------------
// 🄯 Bernat Romagosa i Carrasquer, September 2023

// Snap! Additions ///////////////////////////////////////////////////////

// Unfortunately, there are some things I can't do without monkey-patching
// a few Snap! methods. I'm keeping them to a bare minimum and hope to be able
// to get rid of them someday.

if (!SpriteMorph.prototype.originalSetColorDimension) {
	// Mirror Sprite pen color
	SpriteMorph.prototype.originalSetColorDimension = SpriteMorph.prototype.setColorDimension;
	SpriteMorph.prototype.setColorDimension = function (idx, num) {
		var stage = this.parent;
		this.originalSetColorDimension(idx, num);
		if (stage?.beetleController && this.parentThatIsA(IDE_Morph).currentSprite === this) {
			stage.beetleController.beetle.setColor(this.color);
		}
	};
	SpriteMorph.prototype.originalSetColor = SpriteMorph.prototype.setColor;
	SpriteMorph.prototype.setColor = function (aColor) {
		var stage = this.parent;
		this.originalSetColor(aColor);
		if (stage?.beetleController && this.parentThatIsA(IDE_Morph).currentSprite === this) {
			stage.beetleController.beetle.setColor(this.color);
		}
	};

	// Log positions
	SpriteMorph.prototype.originalMoveBy = SpriteMorph.prototype.moveBy;
	SpriteMorph.prototype.moveBy = function (delta, justMe) {
		var newPos,
			oldPos = this.rotationCenter(),
			stage = this.parent;
		this.originalMoveBy(delta, justMe);
		newPos = this.rotationCenter();
		if (stage?.beetleController && this.parentThatIsA(IDE_Morph).currentSprite === this) {
			if (stage.beetleController.beetle.loggingSpritePositions && !newPos.eq(oldPos)) {
				stage.beetleController.beetle.logSpritePosition(this.getPosition().itemsArray());
			}
		}
	};
}

// BeetleController //////////////////////////////////////////////////////

function BeetleController(stage) {
	this.init(stage);
}

BeetleController.prototype.init = function (stage) {
	this.stage = stage;

	this.firstTimeOpenCount = 0; // for stupid Chrome

	this.engine = null;
	this.scene = null;
	this.camera = null;
	this.grid = null;
	this.glCanvas = null;

	this.axisLines = {};
	this.axisLabels = {};
	this.axesEnabled = true;

	this.ghostModeEnabled = false;
	this.wireframeEnabled = false;

	this.shouldRerender = false;
	this.renderWidth = 480;
	this.renderHeight = 360;

	this.fullScreenMode = false;

	this.initCanvas();
	this.initEngine();
	this.initScene();
	this.initCamera();
	this.initLights();
	this.initGrid();

	this.beetleTrails = [];

	this.beetle = new Beetle(this);

	this.initAxes();
	this.initDialog();
};

BeetleController.prototype.open = function () {
	this.dialog.popUp(this.stage.world());
	this.changed();
};

BeetleController.prototype.renderExtent = function () {
	return new Point(this.renderWidth, this.renderHeight);
};

BeetleController.prototype.initDialog = function () {
	if (!this.stage.world().childThatIsA(BeetleDialogMorph)) {
		this.dialog = new BeetleDialogMorph(this.stage, this);
	}
};

BeetleController.prototype.initCanvas = function () {
	disableRetinaSupport();
	this.glCanvas = document.createElement("canvas");
	this.glCanvas.isRetinaEnabled = false;
	this.glCanvas.width = this.renderWidth;
	this.glCanvas.height = this.renderHeight;
};

BeetleController.prototype.initEngine = function () {
	this.engine = new BABYLON.Engine(this.glCanvas, true, {
		preserveDrawingBuffer: true,
		stencil: true,
		adaptToDeviceRatio: true,
	});
	enableRetinaSupport();
};

BeetleController.prototype.initScene = function () {
	this.scene = new BABYLON.Scene(this.engine);
	this.scene.clearColor = new BABYLON.Color3(0.5, 0.5, 0.5);
	this.scene.shadowsEnabled = false;
	this.scene.collisionEnabled = false;
	this.scene.physicsEnabled = false;
	// this.scene.useRightHandedSystem = true;
};

BeetleController.prototype.initCamera = function () {
	this.camera = new BABYLON.ArcRotateCamera(
		"beetleCam",
		(315 * Math.PI) / 180,
		Math.PI / 3,
		10,
		BABYLON.Vector3.Zero(),
		this.scene
	);
	this.camera.controller = this;
	this.camera.lowerRadiusLimit = 1.5;
	this.camera.fpvEnabled = false;
	this.camera.reset();
};

BABYLON.ArcRotateCamera.prototype.reset = function () {
	if (this.fpvEnabled) {
		this.setFPV(false);
	}
	if (this.isOrtho()) {
		this.toggleOrtho();
		this.reset();
		this.toggleOrtho();
	} else {
		this.radius = 10;
		this.setTarget(BABYLON.Vector3.Zero());
		this.alpha = (315 * Math.PI) / 180;
		this.beta = Math.PI / 3;
		this.framing = false;
		if (this.framingBehavior) {
			this.framingBehavior.detach(this);
			this.framingBehavior = null;
		}
	}
};

BABYLON.ArcRotateCamera.prototype.isMoving = function () {
	return (
		this.inertialPanningX !== 0 ||
		this.inertialPanningY !== 0 ||
		this.inertialAlphaOffset !== 0 ||
		this.inertialBetaOffset !== 0 ||
		this.inertialRadiusOffset !== 0 ||
		this.framing
	);
};

BABYLON.ArcRotateCamera.prototype.zoomBy = function (delta) {
	if (!this.fpvEnabled) {
		if (this.isOrtho()) {
			this.orthoLeft *= 1 - delta / 12;
			this.orthoRight *= 1 - delta / 12;
			this.adjustVerticalOrtho();
			this.radius *= 1 - delta / 12;
		} else {
			// the lower radius limit gets stuck sometimes, so let's set it
			this.lowerRadiusLimit = 1.5;
			this.inertialRadiusOffset = delta * (this.radius / 12);
			this.framing = false;
		}
		this.controller.changed();
	}
};

BABYLON.ArcRotateCamera.prototype.rotateBy = function (deltaXY) {
	if (!this.fpvEnabled) {
		if (this.clickOrigin) {
			var deltaX = deltaXY.x - this.clickOrigin.x,
				deltaY = deltaXY.y - this.clickOrigin.y;
			this.inertialAlphaOffset = deltaX * -0.0005;
			this.inertialBetaOffset = deltaY * -0.001;
		}
		this.framing = false;
	}
};

BABYLON.ArcRotateCamera.prototype.panBy = function (deltaXY) {
	var factor = this.isOrtho() ? 100000 : 10000;
	if (!this.fpvEnabled) {
		var deltaX = deltaXY.x - this.clickOrigin.x,
			deltaY = deltaXY.y - this.clickOrigin.y;
		this.inertialPanningX = deltaX * ((this.radius / factor) * -1);
		this.inertialPanningY = deltaY * (this.radius / factor);
		this.framing = false;
	}
};

BABYLON.ArcRotateCamera.prototype.toggleFPV = function () {
	this.setFPV(!this.fpvEnabled);
};

BABYLON.ArcRotateCamera.prototype.setFPV = function (setIt) {
	this.fpvEnabled = setIt;
	this.framing = false;
	this.inertialPanningX = 0;
	this.inertialPanningY = 0;
	this.inertialAlphaOffset = 0;
	this.inertialBetaOffset = 0;
	this.inertialRadiusOffset = 0;
	if (setIt) {
		this.saveViewpoint();
		this.parent = this.controller.beetle.body;
		this.position = new BABYLON.Vector3(0, 0, -0.5); // Z is vertical, so -0.5 moves back along Z
		this.target = new BABYLON.Vector3(0, 0, 0);
		this.upVector = new BABYLON.Vector3(0, 0, 1); // Z-up coordinate system
		this.lowerRadiusLimit = 0.5;
		this.radius = 0.5;
		this.light.specular = new BABYLON.Color3.Black();
		this.controller.changed();
	} else {
		this.parent = null;
		this.light.specular = new BABYLON.Color3.White();
		this.reset();
		this.restoreViewpoint();
	}
	this.controller.changed();
};

BABYLON.ArcRotateCamera.prototype.saveViewpoint = function () {
	this.oldViewpoint = {
		alpha: this.alpha,
		beta: this.beta,
		radius: this.radius,
		position: this.position.clone(),
		target: this.target.clone(),
	};
};

BABYLON.ArcRotateCamera.prototype.restoreViewpoint = function () {
	if (this.oldViewpoint) {
		this.position = this.oldViewpoint.position;
		this.target = this.oldViewpoint.target;
		this.alpha = this.oldViewpoint.alpha;
		this.beta = this.oldViewpoint.beta;
		this.radius = this.oldViewpoint.radius;
	}
};

BABYLON.ArcRotateCamera.prototype.toggleOrtho = function () {
	if (this.isOrtho()) {
		this.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
		this.radius /= 6;
	} else {
		this.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
		this.orthoRight = this.radius / 2;
		this.orthoLeft = this.orthoRight * -1;
		this.radius *= 6;
		this.adjustVerticalOrtho();
	}
	this.controller.changed();
};

BABYLON.ArcRotateCamera.prototype.isOrtho = function () {
	return this.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
};

BABYLON.ArcRotateCamera.prototype.adjustVerticalOrtho = function () {
	var offset = (this.controller.renderWidth / this.controller.renderHeight) * (this.radius / 60);
	this.orthoTop = this.orthoRight / 2 + offset;
	this.orthoBottom = this.orthoLeft + offset;
};

BeetleController.prototype.initLights = function () {
	this.camera.light = new BABYLON.PointLight("pointLight", this.camera.position, this.scene);
	this.camera.light.specular = new BABYLON.Color3.Black(); // no reflections
	this.camera.light.parent = this.camera;
};

BeetleController.prototype.initGrid = function () {
	var gridMaterial = new BABYLON.GridMaterial("default", this.scene);
	gridMaterial.majorUnitFrequency = 5;
	gridMaterial.gridRatio = 1;
	gridMaterial.backFaceCulling = false;
	gridMaterial.minorUnitVisibility = 0.45;
	gridMaterial.mainColor = new BABYLON.Color3(1, 1, 1);
	gridMaterial.lineColor = new BABYLON.Color3(1.0, 1.0, 1.0);
	gridMaterial.opacity = 0.98;

	this.grid = BABYLON.MeshBuilder.CreateGround("grid", { width: 400, height: 400 }, this.scene);
	this.grid.material = gridMaterial;
};

BeetleController.prototype.initAxes = function () {
	["x", "y", "z"].forEach((axis) => {
		// Labels
		this.axisLabels[axis] = new BABYLON.Sprite(
			axis,
			new BABYLON.SpriteManager("xManager", baseUrl + axis + ".png", 3, { width: 12, height: 16 })
		);
		this.axisLabels[axis].position = BABYLON.Vector3.FromArray([
			axis === "x" ? -1.5 : 0,
			axis === "z" ? 1.5 : 0,
			axis === "y" ? 1.5 : 0,
		]);

		// Lines, both for origin and Beetle
		[this.beetle, this].forEach((owner) => {
			owner.axisLines[axis] = new BABYLON.MeshBuilder.CreateLines(
				axis,
				{
					points: [
						new BABYLON.Vector3.Zero(),
						new BABYLON.Vector3(axis === "x" ? 1 : 0, axis === "z" ? 1 : 0, axis === "y" ? 1 : 0),
					],
					useVertexAlpha: false,
				},
				this.scene
			);

			owner.axisLines[axis].color = new BABYLON.Color3(
				axis === "y" ? 1 : 0, // R
				axis === "z" ? 1 : 0, // G
				axis === "x" ? 1 : 0 // B
			);

			if (owner === this.beetle) {
				owner.axisLines[axis].parent = this.beetle.body;
			}
		});
	});

	this.scene.registerBeforeRender((scene) => {
		["x", "y", "z"].forEach((axis) => {
			var label = this.axisLabels[axis],
				factor = this.camera.radius;

			if (this.camera.isOrtho()) {
				factor /= 6;
			}

			label.size = 0.02 * factor;
			label.position = BABYLON.Vector3.FromArray([
				axis === "x" ? 0.15 * factor : 0,
				axis === "z" ? 0.15 * factor : 0,
				axis === "y" ? 0.15 * factor : 0,
			]);

			[this.beetle, this].forEach((owner) => {
				owner.axisLines[axis].scaling.setAll(0.125 * factor);
			});
		});
	});
};

BeetleController.prototype.changed = function () {
	this.shouldRerender = true;
};

BeetleController.prototype.render = function () {
	if ((this.scene && this.shouldRerender) || this.camera.isMoving()) {
		this.scene.render();
		if (this.fullScreenMode) {
			world.changed();
		} else {
			this.dialog.changed();
		}
		if (this.firstTimeOpenCount > 5) {
			this.shouldRerender = false;
			this.firstTimeOpenCount += 1;
		}
	}
};

BeetleController.prototype.beetleTrailsBoundingBox = function () {
	var min = this.beetleTrails[0].getBoundingInfo().boundingBox.minimumWorld,
		max = this.beetleTrails[0].getBoundingInfo().boundingBox.maximumWorld;

	this.beetleTrails.forEach((obj) => {
		var box = obj.getBoundingInfo().boundingBox;
		min.x = Math.min(min.x, box.minimumWorld.x);
		min.y = Math.min(min.y, box.minimumWorld.y);
		min.z = Math.min(min.z, box.minimumWorld.z);
		max.x = Math.max(max.x, box.maximumWorld.x);
		max.y = Math.max(max.y, box.maximumWorld.y);
		max.z = Math.max(max.z, box.maximumWorld.z);
	});
	return new BABYLON.BoundingBox(min, max);
};

// User facing methods, called from blocks

BeetleController.prototype.clear = function () {
	this.beetleTrails.forEach((object) => object.dispose());
	this.beetleTrails = [];
	this.beetle.loggedSpritePositions = [];
	BeetleController.Cache.clear();
	this.changed();
};

BeetleController.prototype.beetleView = function () {
	var wasShowingAxes = this.dialog.axesEnabled(),
		wasShowingBeetle = this.dialog.beetleEnabled(),
		wasShowingGrid = this.dialog.gridEnabled(),
		wasFPV = this.dialog.fpvEnabled(),
		canvas = newCanvas(new Point(this.renderWidth, this.renderHeight), true),
		ctx = canvas.getContext("2d"),
		costume;

	if (wasShowingAxes) {
		this.dialog.toggleAxes();
	}
	if (wasShowingBeetle) {
		this.dialog.toggleBeetle();
	}
	if (wasShowingGrid) {
		this.dialog.toggleGrid();
	}
	if (!wasFPV) {
		this.camera.toggleFPV();
	}

	this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
	this.scene.render();
	ctx.drawImage(this.glCanvas, 0, 0, this.renderWidth, this.renderHeight);
	costume = new Costume(canvas, this.stage.newCostumeName(localize("render")));

	costume.shrinkWrap();

	if (wasShowingAxes) {
		this.dialog.toggleAxes();
	}
	if (wasShowingBeetle) {
		this.dialog.toggleBeetle();
	}
	if (wasShowingGrid) {
		this.dialog.toggleGrid();
	}
	if (!wasFPV) {
		this.camera.toggleFPV();
	}

	this.scene.clearColor = new BABYLON.Color3(0.5, 0.5, 0.5);
	this.scene.render();

	return costume;
};

BeetleController.prototype.currentView = function () {
	var canvas = newCanvas(new Point(this.renderWidth, this.renderHeight), true),
		ctx = canvas.getContext("2d"),
		costume;

	this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
	this.scene.render();
	ctx.drawImage(this.glCanvas, 0, 0, this.renderWidth, this.renderHeight);

	this.scene.clearColor = new BABYLON.Color3(0.5, 0.5, 0.5);
	this.scene.render();

	return canvas;
};

// Simple Cache //////////////////////////////////////////////////////////

BeetleController.Cache = {
	materials: new Map(),
};

BeetleController.Cache.clear = function () {
	this.materials.forEach((m) => m.dispose());
	this.materials = new Map();
};

BeetleController.Cache.getMaterial = function (color) {
	var key = color.r + "," + color.g + "," + color.b,
		material = this.materials.get(key);

	if (!material) {
		material = new BABYLON.StandardMaterial(color.toString()); // name
		material.diffuseColor.set(color.r, color.g, color.b);
		material.emissiveColor = material.diffuseColor;
		material.linkEmissiveWithDiffuse = true;
		material.roughness = 1;
		material.specularPower = 512;
		material.twoSidedLighting = true;
		material.diffuseFresnelParameters = new BABYLON.FresnelParameters();
		this.materials.set(key, material);
	}

	return material;
};

BeetleController.hash = function (object) {
	// TODO this is not being used at the moment
	var h1 = 0xdeadbeef,
		h2 = 0x41c6ce57,
		str = object.toString();
	for (var i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

// BeetleDialogMorph ////////////////////////////////////////////////////

// BeetleDialogMorph inherits from DialogBoxMorph:

BeetleDialogMorph.prototype = new DialogBoxMorph();
BeetleDialogMorph.prototype.constructor = BeetleDialogMorph;
BeetleDialogMorph.uber = DialogBoxMorph.prototype;

// BeetleDialogMorph instance creation

function BeetleDialogMorph(stage, controller, onAccept) {
	this.init(controller, onAccept);
}

BeetleDialogMorph.prototype.init = function (controller, onAccept) {
	this.controller = controller;

	this.padding = 12;
	this.onaccept = onAccept;

	this.initRenderView();
	this.initControlPanel();
	this.initMouseControls();

	BeetleDialogMorph.uber.init.call(this);
	this.labelString = "3D Beetle";
	this.createLabel();
	this.buildContents();
};

BeetleDialogMorph.prototype.buildContents = function () {
	this.addBody(new AlignmentMorph("column", this.padding * 2));
	this.body.add(this.renderView);
	this.body.add(this.controlPanel);
	this.controlPanel.fixLayout();
	this.body.fixLayout();

	this.addButton("exportSTL", "Export");
	this.addButton("ok", "Close");

	this.fixLayout();
};

BeetleDialogMorph.prototype.initRenderView = function () {
	var controller = this.controller;

	// a morph where we'll display the 3d content
	this.renderView = new Morph();
	this.renderView.setExtent(controller.renderExtent());

	this.renderView.render = function (ctx) {
		ctx.drawImage(controller.glCanvas, 0, 0, controller.renderWidth, controller.renderHeight);
	};

	this.fullScreenButton = new ToggleButtonMorph(
		null,
		this,
		"toggleFullScreen",
		[new SymbolMorph("fullScreen", 14), new SymbolMorph("normalScreen", 14)],
		() => this.controller.fullScreenMode // query
	);

	this.renderView.add(this.fullScreenButton);
	this.fullScreenButton.setRight(this.renderView.right() - 2);
	this.fullScreenButton.setTop(this.renderView.top() + 2);
	this.fullScreenButton.alpha = 0.5;

	this.renderView.userMenu = () => {
		this.userMenu();
	};

	this.renderView.step = function () {
		controller.render();
	};
};

BeetleDialogMorph.prototype.userMenu = function () {
	var ide = this.controller.stage.parentThatIsA(IDE_Morph),
		menu = new MenuMorph(ide),
		view = this.controller.currentView();
	menu.addItem("pic...", () => {
		ide.saveCanvasAs(view, "render");
	});
	return menu;
};

BeetleDialogMorph.prototype.toggleFullScreen = function () {
	var myself = this;
	this.controller.fullScreenMode = !this.controller.fullScreenMode;

	if (this.controller.fullScreenMode) {
		this.body.removeChild(this.renderView);
		world.add(this.renderView);

		this.renderView.setLeft(0);
		this.renderView.setTop(0);

		this.controller.renderWidth = world.width();
		this.controller.renderHeight = world.height();

		this.renderView.reactToWorldResize = function (rect) {
			myself.controller.renderWidth = rect.width();
			myself.controller.renderHeight = rect.height();
			myself.controller.engine.setSize(rect.width(), rect.height());
			this.changed();
			this.bounds = rect;
			myself.controller.changed();
			myself.fullScreenButton.setRight(rect.right() - 2);
			myself.fullScreenButton.setTop(rect.top() + 2);
		};
	} else {
		world.removeChild(this.renderView);
		this.body.add(this.renderView);

		this.renderView.setLeft(this.body.left());
		this.renderView.setTop(this.body.top());

		this.controller.renderWidth = 480;
		this.controller.renderHeight = 360;
	}

	this.controller.glCanvas.width = this.controller.renderWidth;
	this.controller.glCanvas.height = this.controller.renderHeight;
	this.renderView.setExtent(new Point(this.controller.renderWidth, this.controller.renderHeight));
	this.fullScreenButton.setRight(this.renderView.right() - 2);
	this.fullScreenButton.setTop(this.renderView.top() + 2);

	this.controller.changed();
};

BeetleDialogMorph.prototype.initControlPanel = function () {
	var columns = [
		[
			{
				label: "Beetle",
				type: "toggle",
				action: "toggleBeetle",
				query: "beetleEnabled",
			},
			{
				label: "Grid",
				type: "toggle",
				action: "toggleGrid",
				query: "gridEnabled",
			},
			{
				label: "Axes",
				type: "toggle",
				action: "toggleAxes",
				query: "axesEnabled",
			},
			{
				label: "Extrusion base",
				type: "toggle",
				action: "toggleExtrusionBase",
				query: "extrusionBaseEnabled",
			},
		],
		[
			{
				label: "Wireframe",
				type: "toggle",
				action: "toggleWireframe",
				query: "wireframeEnabled",
			},
			{
				label: "Ghost mode",
				type: "toggle",
				action: "toggleGhostMode",
				query: "ghostModeEnabled",
			},
			{
				label: "First person view",
				type: "toggle",
				action: "toggleFPV",
				query: "fpvEnabled",
			},
			{
				label: "Orthographic mode",
				type: "toggle",
				action: "toggleOrtho",
				query: "orthoEnabled",
			},
		],
		[
			{
				label: "Grid Size",
				type: "button",
				action: "adjustGridSize",
			},
			{
				label: "Zoom to fit",
				type: "button",
				action: "zoomToFit",
			},
			{
				label: "Reset Camera",
				type: "button",
				action: "resetCamera",
			},
		],
	];

	this.controlPanel = new AlignmentMorph("row", this.padding * 4);

	columns.forEach((column) => {
		var columnMorph = new AlignmentMorph("column", this.padding / 2);
		columnMorph.alignment = "left";
		this.controlPanel.add(columnMorph);
		column.forEach((item) => {
			if (item.type === "button") {
				columnMorph.add(new PushButtonMorph(this, item.action, item.label));
			} else if (item.type === "toggle") {
				columnMorph.add(new ToggleMorph("checkbox", this, item.action, item.label, item.query));
			}
		});
	});

	this.controlPanel.fixLayout = function () {
		var myself = this;
		AlignmentMorph.prototype.fixLayout.call(this);
		this.children.forEach((child) => {
			child.setTop(myself.top);
			child.fixLayout();
		});
	};
};

BeetleDialogMorph.prototype.initMouseControls = function () {
	var controller = this.controller;

	this.renderView.mouseScroll = function (y, x) {
		controller.camera.zoomBy(y);
	};

	this.renderView.mouseDownLeft = function (pos) {
		controller.camera.clickOrigin = pos;
	};
	this.renderView.mouseDownRight = this.renderView.mouseDownLeft;

	this.renderView.mouseMove = function (pos, button) {
		if (button === "left") {
			controller.camera.rotateBy(pos);
		} else if (button === "right") {
			controller.camera.panBy(pos);
		}
	};
};

BeetleDialogMorph.prototype.resetCamera = function () {
	this.controller.camera.reset();
	this.controlPanel.children.forEach((column) =>
		column.children.forEach((morph) => {
			if (morph.refresh) {
				morph.refresh();
			}
		})
	);
	this.controller.changed();
};

BeetleDialogMorph.prototype.zoomToFit = function () {
	if (this.controller.beetleTrails[0] && !this.controller.camera.framing) {
		if (this.fpvEnabled()) {
			this.resetCamera();
		}
		var box = this.controller.beetleTrailsBoundingBox(),
			cam = this.controller.camera,
			framingBehavior = new BABYLON.FramingBehavior();

		cam.inertialPanningX = 0;
		cam.inertialPanningY = 0;
		cam.inertialAlphaOffset = 0;
		cam.inertialBetaOffset = 0;
		cam.inertialRadiusOffset = 0;
		cam.framing = true;

		framingBehavior.attach(cam);
		cam.framingBehavior = framingBehavior;
		framingBehavior.zoomOnBoundingInfo(box.minimumWorld, box.maximumWorld, false, () => {
			cam.framing = false;
			framingBehavior.detach(cam);
		});
	}
};

BeetleDialogMorph.prototype.toggleGrid = function () {
	this.controller.grid.visibility = this.gridEnabled() ? 0 : 1;
	this.controller.changed();
};

BeetleDialogMorph.prototype.gridEnabled = function () {
	return this.controller.grid.visibility == 1;
};

BeetleDialogMorph.prototype.toggleAxes = function () {
	this.controller.axesEnabled = !this.controller.axesEnabled;
	["x", "y", "z"].forEach((axis) => {
		this.controller.axisLabels[axis].isVisible = this.controller.axesEnabled;
		[this.controller.beetle, this.controller].forEach((owner) => {
			owner.axisLines[axis].isVisible = this.controller.axesEnabled;
		});
	});
	this.controller.changed();
};

BeetleDialogMorph.prototype.axesEnabled = function () {
	return this.controller.axesEnabled;
};

BeetleDialogMorph.prototype.toggleBeetle = function () {
	var beetle = this.controller.beetle;
	if (this.beetleEnabled()) {
		beetle.hideBeetle();
	} else {
		beetle.show();
	}
	this.controller.changed();
};

BeetleDialogMorph.prototype.beetleEnabled = function () {
	return this.controller.beetle.isVisible();
};

BeetleDialogMorph.prototype.toggleExtrusionBase = function () {
	this.controller.beetle.extrusionBaseEnabled = !this.controller.beetle.extrusionBaseEnabled;
	this.controller.beetle.extrusionShapeOutline.visibility =
		this.controller.beetle.extrusionBaseEnabled && this.controller.beetle.extruding ? 1 : 0;
	this.controller.changed();
};

BeetleDialogMorph.prototype.extrusionBaseEnabled = function () {
	return this.controller.beetle.extrusionBaseEnabled;
};

BeetleDialogMorph.prototype.toggleWireframe = function () {
	this.controller.wireframeEnabled = !this.controller.wireframeEnabled;
	BeetleController.Cache.materials.forEach((material) => (material.wireframe = this.controller.wireframeEnabled));
	this.controller.changed();
};

BeetleDialogMorph.prototype.wireframeEnabled = function () {
	return this.controller.wireframeEnabled;
};

BeetleDialogMorph.prototype.toggleGhostMode = function () {
	this.controller.ghostModeEnabled = !this.controller.ghostModeEnabled;
	this.controller.beetleTrails.forEach((object) => (object.visibility = this.controller.ghostModeEnabled ? 0.25 : 1));
	this.controller.changed();
};

BeetleDialogMorph.prototype.ghostModeEnabled = function () {
	return this.controller.ghostModeEnabled;
};

BeetleDialogMorph.prototype.toggleFPV = function () {
	this.controller.camera.toggleFPV();
};

BeetleDialogMorph.prototype.fpvEnabled = function () {
	return this.controller.camera.fpvEnabled;
};

BeetleDialogMorph.prototype.toggleOrtho = function () {
	this.controller.camera.toggleOrtho();
};

BeetleDialogMorph.prototype.orthoEnabled = function () {
	return this.controller.camera.isOrtho();
};

BeetleDialogMorph.prototype.exportSTL = function () {
	BABYLON.STLExport.CreateSTL(
		this.controller.beetleTrails,
		true, // download
		"beetle-trails", // filename
		false, // binary ?
		undefined, // little endian?
		undefined, // do not bake transform
		undefined, // support instanced meshes
		undefined // exportIndividualMeshes
	);
};

BeetleDialogMorph.prototype.ok = function () {
	this.onaccept?.call(this);
	this.close();
};

BeetleDialogMorph.prototype.close = function () {
	BeetleDialogMorph.uber.destroy.call(this);
};

BeetleDialogMorph.prototype.adjustGridSize = function () {
	var currentSize = this.controller.grid.scaling.x * 400; // Current actual size
	var newSize = prompt("Enter new grid size (current: " + currentSize + "):", currentSize);

	if (newSize && !isNaN(newSize)) {
		var scale = newSize / 400;
		this.controller.grid.scaling.setAll(scale);
		this.controller.changed();
	}
};

// Beetle ////////////////////////////////////////////////////

function Beetle(controller) {
	this.init(controller);
}

Beetle.prototype.init = function (controller) {
	this.controller = controller;

	this.name = "beetle";
	this.currentModel = "beetle"; // Track current model
	this.pendingColor = null; // Store color if set before model loads

	this.shapeScale = new BABYLON.Vector2(1, 1);
	this.shapeOffset = new BABYLON.Vector2.Zero();
	this.movementScale = 1;
	this.extrusionScale = new BABYLON.Vector3(1, 1, 1);

	this.loadMeshes("beetle");
	this.wings = null;
	this.loadedMeshes = []; // Track loaded meshes for cleanup
	this.body = new BABYLON.TransformNode("body", this.controller.scene);
	this.shape = new BABYLON.TransformNode("shape", this.controller.scene);
	this.shape.parent = this.body;
	this.axisLines = {};

	// this.shape.rotation.y = Math.PI / 2; // radians(90)

	// extrusion
	this.extruding = false;
	this.extruded = false;
	this.extrusionShapeSelector = "circle";
	this.loggedSpritePositions = [];
	this.loggingSpritePositions = false;
	this.lineTrail = null;
	this.extrusionShape = null;
	this.lastExtrusionShape = null;
	this.extrusionShapeOutline = null;
	this.extrusionBaseEnabled = true;
	this.updateExtrusionShapeOutline();
	this.lastTransformMatrix = null;
	this.lastCap = null;

	this.controller.changed();
};

Beetle.prototype.initColor = function () {
	// Find out if there's a current sprite, or any sprite at all
	var sprite = this.controller.stage.parent.currentSprite,
		color;
	if (sprite instanceof StageMorph) {
		if (sprite.children[0]) {
			sprite = sprite.children[0];
		} else {
			return;
		}
	}
	this.setColor(sprite.color);
	this.controller.changed();
};

Beetle.prototype.setColor = function (color) {
	// Store the color in case wings isn't loaded yet
	this.pendingColor = color;

	// Only apply if wings is loaded
	if (this.wings && this.wings.material) {
		this.wings.material.diffuseColor = new BABYLON.Color3(color.r / 255, color.g / 255, color.b / 255);

		// any further extrusion will have to be a new mesh because of the new color
		if (this.extruding) {
			this.stopExtruding();
			this.extrudeToCurrentPoint();
		}

		this.controller.changed();
	}
	// If wings isn't loaded yet, the color will be applied when it loads
};

Beetle.prototype.loadMeshes = function (modelName) {
	modelName = modelName || "beetle";
	this.currentModel = modelName;

	["gray", "color", "black"].forEach((each) =>
		BABYLON.SceneLoader.ImportMesh(
			"",
			baseUrl + "meshes/",
			modelName + "-" + each + ".obj",
			this.controller.scene,
			(meshes) => {
				meshes.forEach((mesh) => {
					mesh.parent = this.shape;
					this.loadedMeshes.push(mesh); // Track for cleanup
				});
				if (each !== "black") {
					meshes.forEach((mesh) => {
						var material = new BABYLON.StandardMaterial(each + "_" + modelName, this.controller.scene);
						mesh.material = material;
						material.diffuseColor.set(0.5, 0.5, 0.5);
						material.emissiveColor = material.diffuseColor;
						material.linkEmissiveWithDiffuse = true;
						material.roughness = 1;
						material.specularPower = 512;
					});
				}
				if (each === "color") {
					this.wings = meshes[0];

					// Apply pending color if one was set before wings loaded
					if (this.pendingColor) {
						this.wings.material.diffuseColor = new BABYLON.Color3(
							this.pendingColor.r / 255,
							this.pendingColor.g / 255,
							this.pendingColor.b / 255
						);
					} else {
						// Otherwise initialize from current sprite color
						this.initColor();
					}

					this.controller.changed();
				}
			}
		)
	);
};

// Dispose of all loaded meshes
Beetle.prototype.clearMeshes = function () {
	// Remove meshes from body before disposing
	this.loadedMeshes.forEach((mesh) => {
		if (mesh.parent) {
			mesh.parent = null;
		}
		if (mesh.material) {
			mesh.material.dispose();
		}
		mesh.dispose();
	});
	this.loadedMeshes = [];
	this.wings = null;
};

// Helper method to check if beetle is ready for operations
Beetle.prototype.isReady = function () {
	return this.body && this.loadedMeshes.length > 0;
};

// Switch to a different model
Beetle.prototype.switchModel = function (modelName) {
	if (this.currentModel === modelName) {
		return; // Already using this model
	}

	// Clear existing meshes
	this.clearMeshes();

	// Load new model
	this.loadMeshes(modelName);

	this.controller.changed();
};

// Extrusion support

Beetle.prototype.newExtrusionShape = function (selector) {
	var path = [];
	if (selector instanceof List) {
		selector.asArray().forEach((p) => {
			if (p instanceof List) {
				path.push(new BABYLON.Vector3(Number(p.at(1)) * -1, 0, Number(p.at(2))));
			}
		});
	} else {
		switch (selector) {
			case "point":
				path.push(new BABYLON.Vector3(0, 0, 0));
				break;
			case "triangle":
				path.push(new BABYLON.Vector3(-0.5, 0, 0));
				path.push(new BABYLON.Vector3(0.5, 0, 0));
				path.push(new BABYLON.Vector3(0, 0, Math.sqrt(2) / 2));
				path.push(new BABYLON.Vector3(-0.5, 0, 0));
				break;
			case "square":
				path.push(new BABYLON.Vector3(-0.5, 0, 0.5));
				path.push(new BABYLON.Vector3(-0.5, 0, -0.5));
				path.push(new BABYLON.Vector3(0.5, 0, -0.5));
				path.push(new BABYLON.Vector3(0.5, 0, 0.5));
				path.push(new BABYLON.Vector3(-0.5, 0, 0.5));
				break;
			default:
			case "circle":
				var radius = 0.5,
					theta;
				// To switch y and z, place radius * sin(theta) in y, and 0 in z
				for (theta = 0; theta < 2 * Math.PI; theta += Math.PI / 16) {
					path.push(new BABYLON.Vector3(radius * Math.cos(theta), 0, radius * Math.sin(theta)));
				}
				path.push(path[0]);
				break;
			case "semicircle":
				var radius = 0.5,
					theta;
				for (theta = (Math.PI * 3) / 2; theta < (Math.PI * 5) / 2 + Math.PI / 16; theta += Math.PI / 16) {
					path.push(new BABYLON.Vector3(radius * Math.cos(theta), 0, radius * Math.sin(theta)));
				}
				break;
			case "line":
				path.push(new BABYLON.Vector3(0, 0, -0.5));
				path.push(new BABYLON.Vector3(0, 0, 0.5));
				break;
			case "sprite positions":
				path = this.loggedSpritePositions;
				break;
		}
	}

	return path;
};

Beetle.prototype.logSpritePosition = function (pos) {
	this.loggedSpritePositions.push(new BABYLON.Vector3(pos[0] * -1, 0, pos[1]));
	this.updateExtrusionShapeOutline();
	if (this.extruding) {
		this.stopExtruding();
		this.extrudeToCurrentPoint();
	}
};

Beetle.prototype.setLoggingSpritePosition = function (doIt, currentPos) {
	if (!this.loggingSpritePositions && doIt) {
		this.loggedSpritePositions = [];
		this.logSpritePosition(currentPos.itemsArray());
	}
	this.loggingSpritePositions = doIt;
};

Beetle.prototype.scaledExtrusionShape = function () {
	return this.extrusionShape.map(
		(p) =>
			new BABYLON.Vector3(
				(p.x * this.shapeScale.x + this.shapeOffset.x) * this.extrusionScale.x,
				0,
				(p.z * this.shapeScale.y + this.shapeOffset.y) * this.extrusionScale.z
			)
	);
};

Beetle.prototype.updateExtrusionShapeOutline = function () {
	if (this.extrusionShapeOutline) {
		this.controller.scene.removeMesh(this.extrusionShapeOutline);
	}
	this.extrusionShape = this.newExtrusionShape(this.extrusionShapeSelector);
	if (this.extrusionShape.length > 1) {
		// not extruding points, let's draw a shape outline
		this.extrusionShapeOutline = BABYLON.MeshBuilder.CreateLines(
			"extrusionShape",
			{
				points: this.scaledExtrusionShape(),
				useVertexAlpha: false,
			},
			this.controller.scene
		);
		this.extrusionShapeOutline.parent = this.body;
		this.extrusionShapeOutline.rotate(BABYLON.Axis.X, Math.PI / -2);
	}
	this.extrusionShapeOutline.visibility = this.extruding && this.extrusionBaseEnabled ? 1 : 0;
	this.controller.changed();
	if (this.lastTransformMatrix && !this.extruded) {
		// do this only when we've started extruding and NOT created any prisms
		// yet
		this.lastTransformMatrix = this.extrusionShapeOutline.computeWorldMatrix(true).clone();
		this.lastExtrusionShape = this.scaledExtrusionShape();
	}
};

Beetle.prototype.extrudeToCurrentPoint = function () {
	this.extruding = true;
	if (this.extrusionShape.length === 1) {
		this.extrudePoint();
	} else {
		this.extrudePolygon();
	}
	this.controller.changed();
};

Beetle.prototype.extrudePoint = function () {
	// to extrude a point is to draw a line
	var points = [];
	if (this.lineTrail) {
		points = this.lineTrail.points;
		this.controller.beetleTrails.splice(this.controller.beetleTrails.indexOf(this.lineTrail), 1);
		this.lineTrail.dispose();
	}
	points.push(this.body.position.clone());
	this.lineTrail = BABYLON.MeshBuilder.CreateLines(
		"lineTrail",
		{
			points: points,
			useVertexAlpha: false,
		},
		this.controller.scene
	);
	this.lineTrail.color = this.wings.material.diffuseColor.clone();
	this.lineTrail.points = points;
	this.controller.beetleTrails.push(this.lineTrail);
};

Beetle.prototype.extrudePolygon = function () {
	// to extrude a polygon is to build a prism or a surface, depending on
	// whether the polygon is closed
	var currentTransformMatrix = this.extrusionShapeOutline.computeWorldMatrix(true);
	this.extrusionShapeOutline.visibility = this.extrusionBaseEnabled ? 1 : 0;
	if (this.lastTransformMatrix) {
		var isVolume = // is the polygon closed?
				this.extrusionShape[0].equalsWithEpsilon(this.extrusionShape[this.extrusionShape.length - 1], 0.001),
			backFace = this.lastExtrusionShape.map((v) => BABYLON.Vector3.TransformCoordinates(v, this.lastTransformMatrix)),
			frontFace = this.scaledExtrusionShape().map((v) =>
				BABYLON.Vector3.TransformCoordinates(v, currentTransformMatrix)
			),
			numSides = this.extrusionShape.length,
			vertices = backFace.concat(frontFace).map((v) => v.asArray()),
			faces = [];

		// Add indices for all prism faces.
		// Since faces are always trapezoids, there are 4 vertices per face.
		for (var n = 0; n < numSides - 1; n++) {
			faces.push([(n % numSides) + numSides, n, (n + 1) % numSides, ((n + 1) % numSides) + numSides]);
		}
		var prism = new BABYLON.MeshBuilder.CreatePolyhedron("prism", {
			custom: { vertex: vertices, face: faces },
			sideOrientation: isVolume ? BABYLON.Mesh.FRONTSIDE : BABYLON.Mesh.DOUBLESIDE,
		});
		prism.material = BeetleController.Cache.getMaterial(this.wings.material.diffuseColor);
		prism.material.backFaceCulling = false;
		prism.material.wireframe = this.controller.wireframeEnabled;
		prism.visibility = this.controller.ghostModeEnabled ? 0.25 : 1;
		prism.convertToFlatShadedMesh();

		this.controller.beetleTrails.push(prism);
		this.extruded = true;

		if (isVolume) {
			this.computeExtrusionCaps(currentTransformMatrix);
		}
	}
	this.lastTransformMatrix = currentTransformMatrix.clone();
	this.lastExtrusionShape = this.scaledExtrusionShape();
};

Beetle.prototype.computeExtrusionCaps = function (currentTransformMatrix) {
	var backCap, frontCap;
	if (this.lastCap) {
		// Remove the intermediate caps from inside the current
		// extrusion.
		this.controller.scene.removeMesh(this.lastCap);
		this.controller.beetleTrails.splice(this.controller.beetleTrails.indexOf(this.lastCap), 1);
	} else {
		// Let's add the back cap. Only to be done on first
		// extrusion. That is, when there isn't a lastCap yet.
		backCap = BABYLON.MeshBuilder.CreatePolygon(
			"backcap",
			{
				shape: this.scaledExtrusionShape(),
				updatable: false,
			},
			this.controller.scene
		);
		backCap.material = BeetleController.Cache.getMaterial(this.wings.material.diffuseColor);
		backCap.material.wireframe = this.controller.wireframeEnabled;
		backCap.visibility = this.controller.ghostModeEnabled ? 0.25 : 1;
		this.controller.beetleTrails.push(backCap);
		backCap.bakeTransformIntoVertices(this.lastTransformMatrix);
	}

	// Let's add the new front cap.
	frontCap = BABYLON.MeshBuilder.CreatePolygon(
		"frontcap",
		{
			shape: this.scaledExtrusionShape(),
			updatable: false,
			sideOrientation: BABYLON.Mesh.BACKSIDE,
		},
		this.controller.scene
	);

	frontCap.material = BeetleController.Cache.getMaterial(this.wings.material.diffuseColor);
	frontCap.material.wireframe = this.controller.wireframeEnabled;
	frontCap.visibility = this.controller.ghostModeEnabled ? 0.25 : 1;
	this.controller.beetleTrails.push(frontCap);
	frontCap.bakeTransformIntoVertices(currentTransformMatrix);

	this.lastCap = frontCap;
};

Beetle.prototype.stopExtruding = function () {
	this.extruding = false;
	this.extruded = false;
	this.lastTransformMatrix = null;
	this.lastExtrusionShape = null;
	this.lastCap = null;
	this.extrusionShapeOutline.visibility = 0;
	this.lineTrail = null;
	this.controller.changed();
};

Beetle.prototype.showBeetle = function () {
	if (!this.isReady()) {
		return;
	}

	var extrusionShapeOutlineVisibility = this.extrusionShapeOutline.visibility;
	// Show all loaded meshes directly
	this.loadedMeshes.forEach((mesh) => (mesh.visibility = 1));
	this.extrusionShapeOutline.visibility = extrusionShapeOutlineVisibility;
};

Beetle.prototype.hideBeetle = function () {
	if (!this.isReady()) {
		return;
	}

	var extrusionShapeOutlineVisibility = this.extrusionShapeOutline.visibility;
	// Hide all loaded meshes directly
	this.loadedMeshes.forEach((mesh) => (mesh.visibility = 0));
	this.extrusionShapeOutline.visibility = extrusionShapeOutlineVisibility;
};

Beetle.prototype.isVisible = function () {
	return this.wings ? this.wings.visibility === 1 : true;
};

// User facing methods, called from blocks

Beetle.prototype.move = function (axis, steps) {
	var scaledSteps = Number(steps) * this.movementScale,
		vector = new BABYLON.Vector3(
			axis === "x" ? scaledSteps * 1 : 0,
			axis === "z" ? scaledSteps : 0,
			axis === "y" ? scaledSteps : 0
		);
	this.body.locallyTranslate(vector);
	this.controller.changed();
	if (this.extruding) {
		this.extrudeToCurrentPoint();
	}
};

Beetle.prototype.goto = function (x, y, z) {
	if (x !== "") {
		this.body.position.x = Number(x);
	}
	if (y !== "") {
		this.body.position.y = Number(z);
	}
	if (z !== "") {
		this.body.position.z = Number(y);
	}
	this.controller.changed();
	if (this.extruding) {
		this.extrudeToCurrentPoint();
	}
};

Beetle.prototype.getPosition = function () {
	return new List([this.body.position.x, this.body.position.z, this.body.position.y]);
};

Beetle.prototype.setRotations = function (x, y, z) {
	var oldRotation;
	if (this.body.rotationQuaternion) {
		oldRotation = this.body.rotationQuaternion.toEulerAngles();
	}
	this.body.rotationQuaternion = null;
	if (x !== "") {
		this.body.rotation.x = radians(Number(x) * -1);
	} else if (oldRotation) {
		this.body.rotation.x = oldRotation.x;
	}
	if (y !== "") {
		this.body.rotation.z = radians(Number(y) * -1);
	} else if (oldRotation) {
		this.body.rotation.z = oldRotation.z;
	}
	if (z !== "") {
		this.body.rotation.y = radians(Number(z) * -1);
	} else if (oldRotation) {
		this.body.rotation.y = oldRotation.y;
	}
	this.body.rotationQuaternion = this.body.rotation.toQuaternion();
	this.controller.changed();
};

Beetle.prototype.getRotation = function () {
	if (this.body.rotationQuaternion) {
		var rotation = this.body.rotationQuaternion.toEulerAngles();
		return new List([degrees(rotation.x), degrees(rotation.z), degrees(rotation.y * -1)]);
	} else {
		return new List([0, 0, 0]);
	}
};

Beetle.prototype.rotate = function (x, y, z) {
	if (x !== "") {
		this.body.rotate(BABYLON.Axis.X, radians(Number(x)) * 1);
	}
	if (y !== "") {
		this.body.rotate(BABYLON.Axis.Z, radians(Number(y)) * 1);
	}
	if (z !== "") {
		this.body.rotate(BABYLON.Axis.Y, radians(Number(z)) * -1);
	}
	this.controller.changed();
};

Beetle.prototype.pointTo = function (x, y, z) {
	this.body.lookAt(new BABYLON.Vector3(Number(x), Number(z), Number(y)));
	this.controller.changed();
};

Beetle.prototype.setScale = function (scale, which) {
	if (which == "shape") {
		if (scale instanceof List) {
			scale = new BABYLON.Vector2(Number(scale.itemsArray()[0]), Number(scale.itemsArray()[1]));
		} else {
			scale = new BABYLON.Vector2(Number(scale), Number(scale));
		}
		this.shapeScale = scale;
		this.updateExtrusionShapeOutline();
	} else {
		this.movementScale = Number(scale);
	}
};

Beetle.prototype.setOffset = function (offset) {
	this.shapeOffset.x = Number(offset[0]);
	this.shapeOffset.y = Number(offset[1]);
	this.updateExtrusionShapeOutline();
};

Beetle.prototype.scaleExtrusion = function (xScale, yScale, zScale) {
	// Store the scaling factors for use in extrusion operations
	this.extrusionScale = new BABYLON.Vector3(Number(xScale), Number(yScale), Number(zScale));

	// Update the extrusion shape outline if currently extruding
	if (this.extruding) {
		this.updateExtrusionShapeOutline();
	}

	this.controller.changed();
};

// Ananse Bot
Beetle.prototype.renderArc = function (width, height) {
	const ARC_SEGMENTS = 60;
	var xRadius = width / 2,
		yRadius = height;

	// Get beetle's current position and rotation
	var beetlePos = this.body.position;
	var beetleRotationMatrix = this.body.computeWorldMatrix(true);

	// Get thickness from shape scale and extrusion scale
	var thickness =
		Math.max(this.shapeScale.x, this.shapeScale.y) * Math.max(this.extrusionScale.x, this.extrusionScale.z);
	if (thickness < 0.1) thickness = 0.1; // Minimum thickness

	// Create the arc path points directly in world coordinates
	var arcPoints = [];

	// Use the beetle's actual internal position (no conversion needed)
	var arcX = beetlePos.x;
	var arcY = beetlePos.y;
	var arcZ = beetlePos.z;

	for (var theta = 0; theta <= Math.PI; theta += Math.PI / ARC_SEGMENTS) {
		var y = xRadius * Math.cos(theta) * this.extrusionScale.x;
		var z = yRadius * Math.sin(theta) * this.extrusionScale.z;

		// Create local point relative to beetle - swap Y and Z coordinates
		// Apply Y scaling to the Y component (depth/thickness)
		var localPoint = new BABYLON.Vector3(0, z * this.extrusionScale.y, y);

		// Extract only the rotation part of the matrix (3x3 upper-left)
		var rotationMatrix = beetleRotationMatrix.clone();
		rotationMatrix.m[12] = 0; // Remove translation X
		rotationMatrix.m[13] = 0; // Remove translation Y
		rotationMatrix.m[14] = 0; // Remove translation Z
		rotationMatrix.m[15] = 1; // Keep homogeneous coordinate

		// Transform by beetle's rotation only
		var rotatedPoint = BABYLON.Vector3.TransformCoordinates(localPoint, rotationMatrix);

		// Add beetle's position
		var worldPoint = rotatedPoint.add(beetlePos);

		arcPoints.push(worldPoint);
	}

	// Create one tube that follows the entire arc path
	var arcTube = BABYLON.MeshBuilder.CreateTube(
		"arcTube",
		{
			path: arcPoints,
			radius: thickness / 2,
			tessellation: 8,
			radiusFunction: function (i, distance) {
				return thickness / 2; // Constant radius
			},
		},
		this.controller.scene
	);

	// Apply beetle's color
	var material = BeetleController.Cache.getMaterial(this.wings.material.diffuseColor);
	arcTube.material = material;
	arcTube.material.wireframe = this.controller.wireframeEnabled;
	arcTube.visibility = this.controller.ghostModeEnabled ? 0.25 : 1;

	this.controller.beetleTrails.push(arcTube);

	this.controller.changed();
};

Beetle.prototype.renderTorus = function (width, length) {
	const ARC_SEGMENTS = 60;
	var xRadius = width / 2,
		yRadius = length / 2;

	// Get beetle's current position and rotation
	var beetlePos = this.body.position;
	var beetleRotationMatrix = this.body.computeWorldMatrix(true);

	// Get thickness from shape scale and extrusion scale
	var thickness =
		Math.max(this.shapeScale.x, this.shapeScale.y) * Math.max(this.extrusionScale.x, this.extrusionScale.z);
	if (thickness < 0.1) thickness = 0.1; // Minimum thickness

	// Create the torus path points (full circle instead of half circle)
	var torusPoints = [];
	for (var theta = 0; theta <= 2 * Math.PI + 0.1; theta += Math.PI / ARC_SEGMENTS) {
		var y = xRadius * Math.cos(theta) * this.extrusionScale.x;
		var z = yRadius * Math.sin(theta) * this.extrusionScale.z;

		// Create local point relative to beetle - swap Y and Z coordinates
		// Apply Y scaling to the Y component (depth/thickness)
		var localPoint = new BABYLON.Vector3(0, z * this.extrusionScale.y, y);

		// Extract only the rotation part of the matrix (3x3 upper-left)
		var rotationMatrix = beetleRotationMatrix.clone();
		rotationMatrix.m[12] = 0; // Remove translation X
		rotationMatrix.m[13] = 0; // Remove translation Y
		rotationMatrix.m[14] = 0; // Remove translation Z
		rotationMatrix.m[15] = 1; // Keep homogeneous coordinate

		// Transform by beetle's rotation only
		var rotatedPoint = BABYLON.Vector3.TransformCoordinates(localPoint, rotationMatrix);

		// Add beetle's position
		var worldPoint = rotatedPoint.add(beetlePos);

		torusPoints.push(worldPoint);
	}

	// Create one tube that follows the entire torus path
	var torusTube = BABYLON.MeshBuilder.CreateTube(
		"torusTube",
		{
			path: torusPoints,
			radius: thickness / 2,
			tessellation: 8,
			radiusFunction: function (i, distance) {
				return thickness / 2; // Constant radius
			},
		},
		this.controller.scene
	);

	// Apply beetle's color
	var material = BeetleController.Cache.getMaterial(this.wings.material.diffuseColor);
	torusTube.material = material;
	torusTube.material.wireframe = this.controller.wireframeEnabled;
	torusTube.visibility = this.controller.ghostModeEnabled ? 0.25 : 1;

	this.controller.beetleTrails.push(torusTube);

	this.controller.changed();
};

Beetle.prototype.renderSphere = function (radius) {
	if (!this.isReady()) {
		return;
	}

	// Get beetle's current position and rotation
	var beetlePos = this.body.position;
	var beetleRotationMatrix = this.body.computeWorldMatrix(true);

	// Create sphere with extrusion scaling
	var sphere = BABYLON.MeshBuilder.CreateSphere(
		"sphere",
		{
			diameter: radius * 2,
			segments: 32,
		},
		this.controller.scene
	);

	// Apply extrusion scaling
	sphere.scaling = this.extrusionScale.clone();

	// Position and orient the sphere
	sphere.position = beetlePos;
	if (this.body.rotationQuaternion) {
		sphere.rotationQuaternion = this.body.rotationQuaternion.clone();
	}

	// Apply beetle's color
	var material = BeetleController.Cache.getMaterial(this.wings.material.diffuseColor);
	sphere.material = material;
	sphere.material.wireframe = this.controller.wireframeEnabled;
	sphere.visibility = this.controller.ghostModeEnabled ? 0.25 : 1;

	this.controller.beetleTrails.push(sphere);
	this.controller.changed();
};

Beetle.prototype.renderBox = function (width, height, depth) {
	if (!this.isReady()) {
		return;
	}

	// Get beetle's current position and rotation
	var beetlePos = this.body.position;
	var beetleRotationMatrix = this.body.computeWorldMatrix(true);

	// Create box with extrusion scaling
	var box = BABYLON.MeshBuilder.CreateBox(
		"box",
		{
			width: width * this.extrusionScale.x,
			height: height * this.extrusionScale.z,
			depth: depth * this.extrusionScale.y,
		},
		this.controller.scene
	);

	// Position and orient the box
	box.position = beetlePos;
	if (this.body.rotationQuaternion) {
		box.rotationQuaternion = this.body.rotationQuaternion.clone();
	}

	// Apply beetle's color
	var material = BeetleController.Cache.getMaterial(this.wings.material.diffuseColor);
	box.material = material;
	box.material.wireframe = this.controller.wireframeEnabled;
	box.visibility = this.controller.ghostModeEnabled ? 0.25 : 1;

	this.controller.beetleTrails.push(box);
	this.controller.changed();
};

Beetle.prototype.renderCylinder = function (top, bottom, height) {
	if (!this.isReady()) {
		return;
	}

	// Get beetle's current position and rotation
	var beetlePos = this.body.position;
	var beetleRotationMatrix = this.body.computeWorldMatrix(true);

	// Create cylinder with extrusion scaling
	var cylinder = BABYLON.MeshBuilder.CreateCylinder(
		"cylinder",
		{
			height: height * this.extrusionScale.z,
			diameterTop: top * 2 * this.extrusionScale.x,
			diameterBottom: bottom * 2 * this.extrusionScale.x,
			tessellation: 90,
		},
		this.controller.scene
	);

	// Position and orient the cylinder
	cylinder.position = beetlePos;
	if (this.body.rotationQuaternion) {
		cylinder.rotationQuaternion = this.body.rotationQuaternion.clone();
	}

	// Apply beetle's color
	var material = BeetleController.Cache.getMaterial(this.wings.material.diffuseColor);
	cylinder.material = material;
	cylinder.material.wireframe = this.controller.wireframeEnabled;
	cylinder.visibility = this.controller.ghostModeEnabled ? 0.25 : 1;

	this.controller.beetleTrails.push(cylinder);
	this.controller.changed();
};

Beetle.prototype.renderTorusKnot = function (radius, tube, p, q, heightScale) {
	if (!this.isReady()) {
		return;
	}

	// Get beetle's current position and rotation
	var beetlePos = this.body.position;
	var beetleRotationMatrix = this.body.computeWorldMatrix(true);

	// Create torus knot with extrusion scaling
	var torusKnot = BABYLON.MeshBuilder.CreateTorusKnot(
		"torusKnot",
		{
			radius: radius * this.extrusionScale.x,
			tube: tube * this.extrusionScale.y,
			radialSegments: 24,
			tubularSegments: 10,
			p: p,
			q: q,
			heightScale: heightScale * this.extrusionScale.z,
		},
		this.controller.scene
	);

	// Position and orient the torus knot
	torusKnot.position = beetlePos;
	if (this.body.rotationQuaternion) {
		torusKnot.rotationQuaternion = this.body.rotationQuaternion.clone();
	}

	// Apply beetle's color
	var material = BeetleController.Cache.getMaterial(this.wings.material.diffuseColor);
	torusKnot.material = material;
	torusKnot.material.wireframe = this.controller.wireframeEnabled;
	torusKnot.visibility = this.controller.ghostModeEnabled ? 0.25 : 1;

	this.controller.beetleTrails.push(torusKnot);
	this.controller.changed();
};

Beetle.prototype.translateBy3D = function (number, dimension) {
	if (dimension === "width") {
		this.move("y", number);
	} else if (dimension === "height") {
		this.move("z", number);
	} else if (dimension === "depth") {
		this.move("x", number);
	}
};

Beetle.prototype.moveForward = function (dist) {
	// Don't move if no meshes are loaded (during model switching)
	if (!this.isReady()) {
		return;
	}

	var scaledDist = Number(dist) * this.movementScale;

	// Move along the beetle's local X-axis (forward direction)
	// Similar to Three.js's translateZ()
	var vector = new BABYLON.Vector3(scaledDist, 0, 0);
	this.body.locallyTranslate(vector);

	this.controller.changed();
	if (this.extruding) {
		this.extrudeToCurrentPoint();
	}
};

// Camera control methods
Beetle.prototype.rotateCamera = function (degrees, axis) {
	var radians = (degrees * Math.PI) / 180;
	var camera = this.controller.camera;

	switch (axis.toLowerCase()) {
		case "x":
			camera.beta += radians;
			break;
		case "y":
			camera.alpha += radians;
			break;
		case "z":
			// For Z rotation, we need to adjust both alpha and beta
			// This is a simplified implementation
			camera.alpha += radians * 0.5;
			camera.beta += radians * 0.5;
			break;
	}

	this.controller.changed();
};

Beetle.prototype.zoomToFit = function () {
	this.controller.dialog.zoomToFit();
};

Beetle.prototype.toggleBeetleVisibility = function () {
	this.controller.dialog.toggleBeetle();
};

Beetle.prototype.resetCameraToInitial = function () {
	var camera = this.controller.camera;

	// Reset to initial camera position (same as the initCamera method)
	camera.radius = 10;
	camera.setTarget(BABYLON.Vector3.Zero());
	camera.alpha = (315 * Math.PI) / 180; // 315 degrees
	camera.beta = Math.PI / 3; // 60 degrees
	camera.framing = false;

	// Disable FPV if enabled
	if (camera.fpvEnabled) {
		camera.setFPV(false);
	}

	// Disable orthographic mode if enabled
	if (camera.isOrtho()) {
		camera.toggleOrtho();
	}

	this.controller.changed();
};

// SnapExtensions API ////////////////////////////////////////////////////

// Buttons

SnapExtensions.buttons.palette.push({
	category: "3D Beetle",
	label: "Open 3D Window",
	hideable: false,
	action: function () {
		var stage = this.parentThatIsA(StageMorph);
		if (!stage.beetleController) {
			stage.beetleController = new BeetleController(stage);
		}
		stage.beetleController.open();
	},
});

// Initialize the extension

(function () {
	var ide = world.children[0],
		stage = ide.stage;

	// Redo palette so the button actually shows up
	world.children[0].flushBlocksCache();
	world.children[0].refreshPalette();

	// Init controller
	if (!stage.beetleController) {
		stage.beetleController = new BeetleController(stage);
	}

	stage.beetleController.open();
})();

// Primitives

SnapExtensions.primitives.set("bb_switchmodel(modelName)", function (modelName) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.switchModel(modelName);
});

SnapExtensions.primitives.set("bb_getmodel()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return "beetle";
	}
	return stage.beetleController.beetle.currentModel;
});

SnapExtensions.primitives.set("bb_clear()", function (steps) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.clear();
});

SnapExtensions.primitives.set("bb_move(axis, steps)", function (axis, steps) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.move(axis, steps);
});

SnapExtensions.primitives.set("bb_goto(x, y, z)", function (x, y, z) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.goto(x, y, z);
});

SnapExtensions.primitives.set("bb_position()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	return stage.beetleController.beetle.getPosition();
});

SnapExtensions.primitives.set("bb_setrot(x, y, z)", function (x, y, z) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.setRotations(x, y, z);
});

SnapExtensions.primitives.set("bb_rotation()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	return stage.beetleController.beetle.getRotation();
});

SnapExtensions.primitives.set("bb_rotate(x, y, z)", function (x, y, z) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.rotate(x, y, z);
});

SnapExtensions.primitives.set("bb_pointto(x, y, z)", function (x, y, z) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.pointTo(x, y, z);
});

SnapExtensions.primitives.set("bb_setextrusionbase(base)", function (base) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.extrusionShapeSelector = base;
	stage.beetleController.beetle.updateExtrusionShapeOutline();
});

SnapExtensions.primitives.set("bb_extrusionbasepoints()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	return new List(stage.beetleController.beetle.extrusionShape.map((point) => new List([point.x * -1, point.z])));
});

SnapExtensions.primitives.set("bb_logspritepositions(bool, currentPos)", function (doIt, currentPos) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.setLoggingSpritePosition(doIt, currentPos);
});

SnapExtensions.primitives.set("bb_startextruding()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.extrudeToCurrentPoint();
});

SnapExtensions.primitives.set("bb_stopextruding()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.stopExtruding();
});

SnapExtensions.primitives.set("bb_setscale(scale, which)", function (scale, which) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.setScale(scale, which);
});

SnapExtensions.primitives.set("bb_scale(which)", function (which) {
	var stage = this.parentThatIsA(StageMorph),
		scale;
	if (!stage.beetleController) {
		return;
	}
	scale = stage.beetleController.beetle[which + "Scale"];
	if (which === "shape") {
		if (scale.x === scale.y) {
			scale = scale.x;
		} else {
			scale = new List([scale.x, scale.y]);
		}
	}
	return scale;
});

SnapExtensions.primitives.set("bb_setoffset(offset)", function (offset) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.setOffset(offset.itemsArray());
});

SnapExtensions.primitives.set("bb_beetleView()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	return stage.beetleController.beetleView();
});

SnapExtensions.primitives.set("ananse_renderArc(width, height)", function (width, height) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.renderArc(width, height);
});

SnapExtensions.primitives.set("ananse_renderTorus(width, length)", function (width, length) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.renderTorus(width, length);
});

SnapExtensions.primitives.set("ananse_renderSphere(radius)", function (radius) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.renderSphere(radius);
});

SnapExtensions.primitives.set("ananse_renderBox(width, height, depth)", function (width, height, depth) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.renderBox(width, height, depth);
});

SnapExtensions.primitives.set("ananse_renderCylinder(top, bottom, height)", function (top, bottom, height) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.renderCylinder(top, bottom, height);
});

SnapExtensions.primitives.set(
	"ananse_renderTorusKnot(radius, tube, p, q, heightScale)",
	function (radius, tube, p, q, heightScale) {
		var stage = this.parentThatIsA(StageMorph);
		if (!stage.beetleController) {
			return;
		}
		stage.beetleController.beetle.renderTorusKnot(radius, tube, p, q, heightScale);
	}
);

SnapExtensions.primitives.set("ananse_translateBy3D(number, dimension)", function (number, dimension) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.translateBy3D(number, dimension);
});

SnapExtensions.primitives.set("ananse_hide()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.hideBeetle();
});

SnapExtensions.primitives.set("ananse_show()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.showBeetle();
});

SnapExtensions.primitives.set("ananse_moveForward(dist)", function (dist) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.moveForward(dist);
});

SnapExtensions.primitives.set("bb_scaleExtrusion(x, y, z)", function (x, y, z) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.scaleExtrusion(x, y, z);
});

SnapExtensions.primitives.set("bb_rotateCamera(degrees, axis)", function (degrees, axis) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.rotateCamera(degrees, axis);
});

SnapExtensions.primitives.set("bb_zoomToFit()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.zoomToFit();
});

SnapExtensions.primitives.set("bb_toggleBeetleVisibility()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.toggleBeetleVisibility();
});

SnapExtensions.primitives.set("bb_resetCameraToInitial()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.resetCameraToInitial();
});
