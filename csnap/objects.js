SpriteMorph.prototype.originalInit = SpriteMorph.prototype.init;
SpriteMorph.prototype.init = function (globals) {
	this.originalInit(globals);
};

SpriteMorph.prototype.categories.push("arduino");
SpriteMorph.prototype.blockColor["arduino"] = new Color(24, 167, 181);

SpriteMorph.prototype.originalInitBlocks = SpriteMorph.prototype.initBlocks;
SpriteMorph.prototype.originalPrimitiveBlocks = SpriteMorph.prototype.primitiveBlocks;
SpriteMorph.prototype.primitiveArduinoBlocks = function () {
	return {
		translatePercent: {
			only: SpriteMorph,
			type: "command",
			category: "motion",
			spec: "translate by %n of %drc",
			defaults: [100, ["width"]],
		},
		flipVertical: {
			only: SpriteMorph,
			type: "command",
			category: "looks",
			spec: "flip vertical",
		},
		flipHorizontal: {
			only: SpriteMorph,
			type: "command",
			category: "looks",
			spec: "flip horizontal",
		},
		reflectXAxis: {
			only: SpriteMorph,
			type: "command",
			category: "looks",
			spec: "reflect across x axis",
		},
		reflectYAxis: {
			only: SpriteMorph,
			type: "command",
			category: "looks",
			spec: "reflect across y axis",
		},
		newSizeOfCurrent: {
			only: SpriteMorph,
			type: "command",
			category: "looks",
			spec: "scale by factor %n percent",
			defaults: [100],
		},
		pointAtAngle: {
			only: SpriteMorph,
			type: "command",
			category: "motion",
			spec: "point at angle %n",
			defaults: [0],
		},
		rotateByDegrees: {
			only: SpriteMorph,
			type: "command",
			category: "motion",
			spec: "rotate by %n degrees",
			defaults: [0],
		},
		getAngle: {
			only: SpriteMorph,
			type: "reporter",
			category: "motion",
			spec: "angle",
		},
		smoothBorders: {
			type: "command",
			category: "pen",
			spec: "fix borders",
		},
		flatLineEnds: {
			type: "command",
			category: "pen",
			spec: "flat line end? %b",
		},
		doSetScaleFactor: {
			only: SpriteMorph,
			type: "command",
			category: "looks",
			spec: "scale %scft by factor %n percent",
			defaults: [null, 100],
		},
		degreesToRadians: {
			only: SpriteMorph,
			type: "reporter",
			category: "other",
			spec: "degrees to radians %n",
			defaults: [0],
		},
		getBorderState: {
			only: SpriteMorph,
			type: "reporter",
			category: "pen",
			spec: "pen border",
		},
		setBorder: {
			type: "command",
			category: "pen",
			spec: "set pen border: size %n color %n",
			defaults: [0, 0],
		},
		setBorderHue: {
			type: "command",
			category: "pen",
			spec: "set pen border color: %n",
			defaults: [0],
		},
		setBorderShade: {
			type: "command",
			category: "pen",
			spec: "set pen border shade: %n",
			defaults: [0],
		},
		setBorderSize: {
			type: "command",
			category: "pen",
			spec: "set pen border size: %n ",
			defaults: [0],
		},
		borderPathLengthHelp: {
			type: "command",
			category: "pen",
			spec: "path length rotate length %n flip %b",
			defaults: [0, false],
		},
		getPenBorderAttribute: {
			type: "reporter",
			category: "pen",
			spec: "pen border %penBorder",
			defaults: [["size"]],
		},
		setEffect: {
			type: "command",
			category: "looks",
			spec: "set %eff effect to %n",
			defaults: [["color"], 0],
		},
		exportAsCSV: {
			type: "command",
			category: "variables",
			spec: "display %l and %l as a CSV",
		},
		changeEffect: {
			type: "command",
			category: "looks",
			spec: "change %eff effect by %n",
			defaults: [["color"], 25],
		},
		getEffect: {
			type: "reporter",
			category: "looks",
			spec: "%eff effect",
			defaults: [["color"]],
		},

		legacySetCostumeColor: {
			type: "command",
			category: "looks",
			spec: "(legacy) set costume color to %n ",
		},
	};
};

SpriteMorph.prototype.initArduinoBlocks = function () {};

SpriteMorph.prototype.primitiveBlocks = function () {
	return Object.assign(SpriteMorph.prototype.originalPrimitiveBlocks(), SpriteMorph.prototype.primitiveArduinoBlocks());
};
SpriteMorph.prototype.preInitBlocks = function () {
	SpriteMorph.prototype.blocks = this.primitiveBlocks();
	this.initArduinoBlocks();
};

SpriteMorph.prototype.initBlocks = function () {
	SpriteMorph.prototype.blocks = this.primitiveBlocks();
	this.initArduinoBlocks();
	this.initHyperZip();
};

SpriteMorph.prototype.preInitBlocks();

SpriteMorph.prototype.originalBlockTemplates = SpriteMorph.prototype.blockTemplates;
SpriteMorph.prototype.blockTemplates = function (category) {
	var myself = this,
		blocks = myself.originalBlockTemplates(category);

	function block(selector, isGhosted) {
		if (StageMorph.prototype.hiddenPrimitives[selector] && !all) {
			return null;
		}
		var newBlock = SpriteMorph.prototype.blockForSelector(selector, true);
		newBlock.isDraggable = false;
		newBlock.isTemplate = true;
		if (isGhosted) {
			newBlock.ghost();
		}
		return newBlock;
	}

	function watcherToggle(selector) {
		if (StageMorph.prototype.hiddenPrimitives[selector]) {
			return null;
		}
		var info = SpriteMorph.prototype.blocks[selector];
		return new ToggleMorph(
			"checkbox",
			this,
			function () {
				myself.toggleWatcher(selector, localize(info.spec), myself.blockColor[info.category]);
			},
			null,
			function () {
				return myself.showingWatcher(selector);
			},
			null
		);
	}

	function addCSDTMotionBlocks(blocks) {
		blocks.push(watcherToggle("getAngle"));
		blocks.push(block("getAngle"));
		blocks.push(block("translatePercent"));
		blocks.push(block("pointAtAngle"));
		blocks.push(block("rotateByDegrees"));
		blocks.push("-");
	}

	function addCSDTLooksBlocks(blocks) {
		blocks.push(block("flipVertical"));
		blocks.push(block("flipHorizontal"));
		blocks.push(block("reflectXAxis"));
		blocks.push(block("reflectYAxis"));
		blocks.push(block("newSizeOfCurrent"));
		blocks.push(block("doSetScaleFactor"));
		blocks.push("-");
	}

	function addCSDTPenBlocks(blocks) {
		blocks.push(block("flatLineEnds"));
		blocks.push(block("setBorderSize"));
		blocks.push(block("setBorderHue"));
		blocks.push(block("setBorderShade"));
		blocks.push(block("smoothBorders"));
		blocks.push(block("getPenBorderAttribute"));
		blocks.push("-");
	}

	//TODO: Re-add the decatorize blocks for tutorials

	if (category === "motion") {
		blocks.push("=");
		addCSDTMotionBlocks(blocks);
	} else if (category === "looks") {
		blocks.push("=");
		addCSDTLooksBlocks(blocks);
	} else if (category === "pen") {
		blocks.push("=");
		addCSDTPenBlocks(blocks);
	}

	return blocks;
};

SpriteMorph.prototype.freshPalette = function (category) {
	var myself = this,
		palette = new ScrollFrameMorph(null, null, this.sliderColor),
		unit = SyntaxElementMorph.prototype.fontSize,
		ide,
		showCategories,
		showButtons,
		x = 0,
		y = 5,
		ry = 0,
		blocks,
		hideNextSpace = false,
		shade = new Color(140, 140, 140),
		searchButton,
		makeButton;

	palette.owner = this;
	palette.padding = unit / 2;
	palette.color = this.paletteColor;
	palette.growth = new Point(0, MorphicPreferences.scrollBarSize);

	// toolbar:

	palette.toolBar = new AlignmentMorph("column");

	searchButton = new PushButtonMorph(this, "searchBlocks", new SymbolMorph("magnifierOutline", 16));
	searchButton.alpha = 0.2;
	searchButton.padding = 1;
	searchButton.hint = localize("find blocks") + "...";
	searchButton.labelShadowColor = shade;
	searchButton.edge = 0;
	searchButton.padding = 3;
	searchButton.fixLayout();
	palette.toolBar.add(searchButton);

	makeButton = new PushButtonMorph(this, "makeBlock", new SymbolMorph("cross", 16));
	makeButton.alpha = 0.2;
	makeButton.padding = 1;
	makeButton.hint = localize("Make a block") + "...";
	makeButton.labelShadowColor = shade;
	makeButton.edge = 0;
	makeButton.padding = 3;
	makeButton.fixLayout();
	palette.toolBar.add(makeButton);

	palette.toolBar.fixLayout();
	palette.add(palette.toolBar);

	// menu:
	palette.userMenu = function () {
		var menu = new MenuMorph();

		menu.addPair(
			[new SymbolMorph("magnifyingGlass", MorphicPreferences.menuFontSize), localize("find blocks") + "..."],
			() => myself.searchBlocks(),
			"^F"
		);
		menu.addItem("hide blocks...", () => new BlockVisibilityDialogMorph(myself).popUp(myself.world()));
		menu.addLine();
		menu.addItem("make a category...", () => this.parentThatIsA(IDE_Morph).createNewCategory());
		if (SpriteMorph.prototype.customCategories.size) {
			menu.addItem("delete a category...", () => this.parentThatIsA(IDE_Morph).deleteUserCategory());
		}
		return menu;
	};

	if (category === "unified") {
		// In a Unified Palette custom blocks appear following each category,
		// but there is only 1 make a block button (at the end).
		ide = this.parentThatIsA(IDE_Morph);
		showCategories = ide.scene.showCategories;
		showButtons = ide.scene.showPaletteButtons;
		blocks = SpriteMorph.prototype.allCategories().reduce((blocks, category) => {
			let header = [this.categoryText(category), "-"],
				primitives = this.getPrimitiveTemplates(category),
				customs = this.customBlockTemplatesForCategory(category),
				showHeader =
					showCategories &&
					!["lists"].includes(category) && // removing "other" exclusion
					(primitives.some((item) => item instanceof BlockMorph) || customs.length);

			// hide category names
			if (!showCategories && category !== "variables") {
				primitives = primitives.filter((each) => each !== "-" && each !== "=");
			}

			// hide "make / delete a variable" buttons
			if (!showButtons && category === "variables") {
				primitives = primitives.filter((each) => !(each instanceof PushButtonMorph && !(each instanceof ToggleMorph)));
			}

			return blocks.concat(
				showHeader ? header : [],
				primitives,
				showHeader ? "=" : null,
				customs,
				showHeader ? "=" : "-"
			);
		}, []);
	} else {
		// ensure we do not modify the cached array
		blocks = this.getPrimitiveTemplates(category).slice();
	}

	if (category !== "unified" || showButtons) {
		blocks.push("=");
		blocks.push(this.makeBlockButton(category));
	}

	if (category !== "unified") {
		blocks.push("=");
		blocks.push(...this.customBlockTemplatesForCategory(category));
	}
	if (category === "variables") {
		blocks.push(...this.customBlockTemplatesForCategory("lists"));
		// blocks.push(...this.customBlockTemplatesForCategory('other'));
	}

	blocks.forEach((block) => {
		if (block === null) {
			return;
		}
		if (block === "-") {
			if (hideNextSpace) {
				return;
			}
			y += unit * 0.8;
			hideNextSpace = true;
		} else if (block === "=") {
			if (hideNextSpace) {
				return;
			}
			y += unit * 1.6;
			hideNextSpace = true;
		} else if (block === "#") {
			x = 0;
			y = ry === 0 ? y : ry;
		} else {
			hideNextSpace = false;
			if (x === 0) {
				y += unit * 0.3;
			}
			block.setPosition(new Point(x, y));
			palette.addContents(block);
			if (block instanceof ToggleMorph) {
				x = block.right() + unit / 2;
			} else if (block instanceof RingMorph) {
				x = block.right() + unit / 2;
				ry = block.bottom();
			} else {
				x = 0;
				y += block.height();
			}
		}
	});

	palette.scrollX(palette.padding);
	palette.scrollY(palette.padding);
	return palette;
};
StageMorph.prototype.freshPalette = SpriteMorph.prototype.freshPalette;

////////////////////////////////////////////////////////////////
// New Block Definitions
////////////////////////////////////////////////////////////////

// Translate sprite by its width or height
SpriteMorph.prototype.translatePercent = function (percent, direction) {
	var width = 0,
		height = 0,
		newX = 0,
		newY = 0,
		dist = 0,
		angle = 0,
		X = 0,
		Y = 0;

	if (this.costume != null) {
		width = this.costume.contents.width * this.scale;
		height = this.costume.contents.height * this.scale;
	} else {
		width = 32 * this.scale;
		height = 20 * this.scale;
	}

	if (direction[0] === "height") {
		newY = this.yPosition() + (height * percent) / 100;
		dist = Math.sqrt(Math.pow(this.yPosition() - newY, 2));
		angle = this.heading * (Math.PI / 180);
	} else {
		newX = this.xPosition() + (width * percent) / 100;
		dist = Math.sqrt(Math.pow(this.xPosition() - newX, 2));
		angle = this.heading * (Math.PI / 180) + Math.PI / 2;
	}
	if (dist != 0) {
		X = (-percent / Math.abs(percent)) * dist * Math.cos(angle) + this.xPosition();
		Y = (percent / Math.abs(percent)) * dist * Math.sin(angle) + this.yPosition();
		this.gotoXY(X, Y);
		this.positionTalkBubble();
	}
};

// Scales the sprite based on its current size
SpriteMorph.prototype.newSizeOfCurrent = function (percent) {
	let val = this.getScale() * (percent / 100);
	this.setScale(val);
};

//Reports the current angle of the sprite
SpriteMorph.prototype.getAngle = function () {
	return 90 - this.direction();
};

// Reports the current border state
SpriteMorph.prototype.getBorderState = function () {
	return this.hasBorder;
};

// Sets the thickness and color of a pen border
SpriteMorph.prototype.setBorder = function (size, color) {
	if (size != 0) {
		this.hasBorder = true;
	} else {
		this.hasBorder = false;
	}
	this.borderSize = this.setBorderSize(size);
	this.borderColor = this.setBorderHue(color);
};

// Returns various attributes of a pen border
SpriteMorph.prototype.getPenBorderAttribute = function (attrib) {
	var name = attrib instanceof Array ? attrib[0] : attrib.toString(),
		options = ["active", "size", "hue"];
	if (name === "size") {
		return this.borderSize;
	} else if (name == "hue") {
		return this.borderColor;
	}
	return this.hasBorder;
};

// Hacky way to simulate border paths
SpriteMorph.prototype.borderPathLengthHelp = function (length, flip) {
	this.rotateByDegrees(flip ? 90 : -90);
	this.forward(length * (flip ? 0.5 : 1) + this.borderSize / (flip ? 2 : 1));
	this.rotateByDegrees(flip ? -90 : 90);
	this.down();
	this.forward(1);
	this.up();
	if (flip) {
		this.forward(-1);
	}
};

// Alternative to direction, rotates sprite to a specific angle
SpriteMorph.prototype.pointAtAngle = function (angle) {
	let val = 0 - angle + 90;
	this.setHeading(val);
};

// Rotates a sprite based on its current angle
SpriteMorph.prototype.rotateByDegrees = function (angle) {
	this.turnLeft(angle);
};

// Flips the sprite (lakota)
SpriteMorph.prototype.flip = function () {
	var cst;
	var xP = 100;
	var yP = -100;
	cst = this.costume;

	if (!isFinite(+xP * +yP) || isNaN(+xP * +yP)) {
		throw new Error("expecting a finite number\nbut getting Infinity or NaN");
	}

	// If the costume is a turtle, don't do this stretch...
	if (cst != null) {
		cst = cst.stretched(Math.round((cst.width() * +xP) / 100), Math.round((cst.height() * +yP) / 100));
	}

	this.doSwitchToCostume(cst);
};

// Reflect sprite across x axis
SpriteMorph.prototype.reflectXAxis = function () {
	this.flipVertical();
	this.gotoXY(this.xPosition(), this.yPosition() * -1);
};

// Reflect sprite across y axis
SpriteMorph.prototype.reflectYAxis = function () {
	this.flipHorizontal();
	this.gotoXY(this.xPosition() * -1, this.yPosition());
};

// Flips the sprite vertically (relative)
SpriteMorph.prototype.flipVertical = function () {
	// this.flip();
	// this.pointAtAngle((this.getAngle() * -1));
	var cst;
	var xP = 100;
	var yP = -100;
	cst = this.costume;

	if (!isFinite(+xP * +yP) || isNaN(+xP * +yP)) {
		throw new Error("expecting a finite number\nbut getting Infinity or NaN");
	}

	// If the costume is a turtle, don't do this stretch...
	if (cst != null) {
		cst = cst.stretched(Math.round((cst.width() * +xP) / 100), Math.round((cst.height() * +yP) / 100));
	}

	this.doSwitchToCostume(cst);
};

// Flips the sprite horizontally (relative)
SpriteMorph.prototype.flipHorizontal = function () {
	// this.flip();
	// this.pointAtAngle(180 - this.getAngle());
	var cst;
	var xP = -100;
	var yP = 100;
	cst = this.costume;

	if (!isFinite(+xP * +yP) || isNaN(+xP * +yP)) {
		throw new Error("expecting a finite number\nbut getting Infinity or NaN");
	}
	// If the costume is a turtle, don't do this stretch...
	if (cst != null) {
		cst = cst.stretched(Math.round((cst.width() * +xP) / 100), Math.round((cst.height() * +yP) / 100));
	}
	this.doSwitchToCostume(cst);
};

// Based on direction, scales the sprite (by its current size)
SpriteMorph.prototype.doSetScaleFactor = function (direction, percent) {
	var cst, xP, yP;
	cst = this.costume;

	if (direction[0] === "x") {
		xP = percent;
		yP = 100;
	} else if (direction[0] === "y") {
		xP = 100;
		yP = percent;
	} else if (direction[0] === "x_and_y") {
		xP = percent;
		yP = percent;
	} else {
		xP = percent;
		yP = percent;
	}

	if (!isFinite(+xP * +yP) || isNaN(+xP * +yP)) {
		throw new Error("expecting a finite number\nbut getting Infinity or NaN");
	}
	// If the costume is a turtle, don't do this stretch...
	if (cst != null) {
		cst = cst.stretched(Math.round((cst.width() * +xP) / 100), Math.round((cst.height() * +yP) / 100));
	}

	this.doSwitchToCostume(cst);
};

// Allows for flat ends
SpriteMorph.prototype.flatLineEnds = function (bool) {
	SpriteMorph.prototype.useFlatLineEnds = bool;
};

// Converts degrees to radians
SpriteMorph.prototype.degreesToRadians = function (degrees) {
	return (3.141592653589 * degrees) / 180;
};

// Converts radians to degrees
SpriteMorph.prototype.radiansToDegrees = function (radians) {
	return (180 * radians) / 3.141592653589;
};

////////////////////////////////////////////////////////////////
// Legacy Block Definitions
// TODO Need to add for backwards compatibility for older projects
// TODO Fractals, 3D stuff, bead loom (getCoordinateScale, setCoordinateScale), /
// TODO cont.  graffiti(getBorderShade, setBorderShade, changeBorderShade), Mixer, Quilting(exportAsCSV, printList), Rhythm Wheels, Sensing(parseString, getData), Skateboarding, Tutorial,
////////////////////////////////////////////////////////////////

SpriteMorph.prototype.legacySetCostumeColor = function (color) {
	let oldCostume, currentPix, newCostume;

	let currentIdx = this.getCostumeIdx();
	if (this.colorShiftCostume) currentIdx = this.colorShiftCostume;

	this.colorShiftCostume = currentIdx;

	if (this.costume?.csdtColorIdx) {
		this.doSwitchToCostume(this.costume.csdtColorIdx);
	}

	const convertColors = (pix, col) => {
		let costumeColor = new Color(255, 255, 255);
		let currentPixels = this.costume.contents
			.getContext("2d")
			.getImageData(0, 0, this.costume.contents.width, this.costume.contents.height);
		let originalPixels = this.costume.contents
			.getContext("2d")
			.getImageData(0, 0, this.costume.contents.width, this.costume.contents.height);

		let hsv = costumeColor.hsv();
		hsv[0] = Math.max(Math.min(+col || 0, 100), 0) / 100;
		hsv[1] = 1; // we gotta fix this at some time
		costumeColor.set_hsv.apply(costumeColor, hsv);

		for (var I = 0, L = originalPixels.data.length; I < L; I += 4) {
			if (currentPixels.data[I + 3] > 0) {
				// If it's not a transparent pixel
				currentPixels.data[I] = (originalPixels.data[I] / 255) * costumeColor.r;
				currentPixels.data[I + 1] = (originalPixels.data[I + 1] / 255) * costumeColor.g;
				currentPixels.data[I + 2] = (originalPixels.data[I + 2] / 255) * costumeColor.b;
			}
		}
		return currentPixels;
	};

	oldCostume = Process.prototype.reportNewCostume(
		this.costume.rasterized().pixels(),
		this.costume.width(),
		this.costume.height(),
		this.costume.name
	);

	currentPix = convertColors(oldCostume.rasterized().pixels(), color);

	newCostume = Process.prototype.reportNewCostume(
		oldCostume.rasterized().pixels(),
		this.costume.width(),
		this.costume.height(),
		this.costume.name
	);

	newCostume.contents.getContext("2d").putImageData(currentPix, 0, 0);

	this.clearEffects();

	this.doSwitchToCostume(newCostume);

	this.costume.csdtColorIdx = currentIdx;
};

SpriteMorph.prototype.smoothBorders = function (start, dest) {
	var tempSize = this.size,
		tempColor = this.color;

	for (let line = 0; line < this.lineList.length; line++) {
		this.size = this.lineList[line][2];
		this.color = this.lineList[line][3];
		this.drawLine(this.lineList[line][0], this.lineList[line][1], false);
	}

	this.size = tempSize;
	this.color = tempColor;
	this.lineList = [];
};

SpriteMorph.prototype.getBorderSize = function () {
	return this.borderSize;
};

SpriteMorph.prototype.changeHue = function (delta) {
	this.setHue(this.getHue() + (+delta || 0));
};

SpriteMorph.prototype.getBorderHue = function () {
	return this.borderColor;
};

SpriteMorph.prototype.setBorderHue = function (num) {
	var hsv = this.borderColor.hsv(),
		x = this.xPosition(),
		y = this.yPosition();

	hsv[0] = Math.max(Math.min(+num || 0, 100), 0) / 100;
	hsv[1] = 1; // we gotta fix this at some time
	this.borderColor.set_hsv.apply(this.borderColor, hsv);
	if (!this.costume) {
		this.drawNew();
		this.changed();
	}
	this.gotoXY(x, y);
};

SpriteMorph.prototype.getBorderShade = function () {
	return this.borderColor.hsv()[2] * 50 + (50 - this.borderColor.hsv()[1] * 50);
};

SpriteMorph.prototype.setBorderShade = function (num) {
	let myself = this;
	var hsv = this.borderColor.hsv(),
		x = this.xPosition(),
		y = this.yPosition();

	//Num goes in 0-100 range. 0 is black, 50 is the unchanged hue, 100 is white
	num = Math.max(Math.min(+num || 0, 100), 0) / 50;
	hsv[1] = 1;
	hsv[2] = 1;

	if (num > 1) {
		hsv[1] = 2 - num; //Make it more white
	} else {
		hsv[2] = num; //Make it more black
	}

	this.borderColor.set_hsv.apply(myself.borderColor, hsv);
	if (!this.costume) {
		this.drawNew();
		this.changed();
	}
	this.gotoXY(x, y);
};

SpriteMorph.prototype.changeBorderShade = function (delta) {
	return this.setBorderShade(this.getBorderShade() + (+delta || 0));
};

SpriteMorph.prototype.drawBorderedLine = function (start, dest) {
	//drawLine wrapper to draw line and border in one go
	this.drawLine(start, dest, true);
	this.drawLine(start, dest, false);

	if (this.isDown) {
		this.lineList[this.lineList.length] = [start, dest, this.size, this.color];
	}
};

SpriteMorph.prototype.exportAsCSV = function (radius_data, angle_data) {
	function roundFloat(val) {
		var rounded_val = Math.round(val * 10) / 10;
		return rounded_val;
	}

	function roundPoints() {
		for (var i = 0; i < radii.length; i++) {
			radii[i] = roundFloat(radii[i]);
			angles[i] = roundFloat(angles[i]) % 360;
		}
	}

	//opens a new window and writes data in CSV format.
	function writeToWindow(points) {
		var str = "";
		var ide = this.world.children[0];
		var radii = [];
		var angles = [];

		var keys = [];

		for (var key of points.keys()) {
			keys.push(key);
		}

		keys.sort(function (a, b) {
			return a - b;
		});

		for (var j = 0; j < keys.length; j++) {
			var values = points.get(keys[j]);
			for (var k = 0; k < values.length; k++) {
				radii.push(keys[j]);
				angles.push(values[k]);
			}
		}

		for (var i = 0; i < radii.length; i++) {
			str += radii[i] + "," + angles[i];
			if (i !== radii.length - 1) {
				str += "\n";
			}
		}
		ide.saveFileAs(str, "data:text/csv", ide.projectName + " csvData");
	}

	function orderRadially(radii, angles) {
		var ordered_points = new Map();
		var ordered_radii = [];
		var ordered_angles = [];
		//iterate through radii, populate map
		//sort map values (arrays of angles)
		//iterate through map in order (small to large radii) and output back to two arrays
		for (var i = 0; i < radii.length; i++) {
			var unordered_angles = [];
			if (ordered_points.has(radii[i])) {
				unordered_angles = ordered_points.get(radii[i]);
				unordered_angles.push(angles[i]);
			} else {
				ordered_points.set(radii[i], unordered_angles);
			}
		}

		return ordered_points;
	}

	//function create an array from a CSnap list object
	function makeArray(input_data) {
		var data_array = [];
		var data_string = input_data.asText(); //converts CSnap list object to a text string
		for (var i = 0; i < data_string.length; i++) {
			var val = "";
			while (data_string[i] !== "," && i < data_string.length) {
				//read through variable-length values until I hit a comma
				val += data_string[i];
				i++;
			}

			if (val !== "") {
				data_array.push(val);
			}
		}
		return data_array;
	}

	var radii = makeArray(radius_data);
	var angles = makeArray(angle_data);
	roundPoints();
	var points = orderRadially(radii, angles);
	writeToWindow(points);
};

//# sourceURL=exportAsCSV.js

////////////////////////////////////////////////////////////////
// Situational Block Definitions
// * Not really intended to be added to the list
////////////////////////////////////////////////////////////////
SpriteMorph.prototype.drawLogSpiral = function (c, endangle, getSize, penGrowth, isClockwise) {
	var xOrigin,
		yOrigin,
		startingDirection,
		beta,
		t,
		tinc,
		roffset,
		r,
		h,
		start,
		end,
		segments,
		startAngle,
		clockwise,
		size;
	this.down();
	segments = 5;

	if (isClockwise === null || typeof isClockwise === undefined) {
		clockwise = false;
	} else {
		clockwise = isClockwise;
	}

	if (clockwise) {
		if (endangle < 0) {
			startingDirection = 90 - this.direction() - endangle + degrees(Math.atan(1 / c)) - 180;
		} else {
			startingDirection = 90 - this.direction() + degrees(Math.atan(1 / c));
		}
	} else {
		if (endangle < 0) {
			startingDirection = 90 - this.direction() + endangle + (180 - degrees(Math.atan(1 / c)));
		} else {
			startingDirection = 90 - this.direction() - degrees(Math.atan(1 / c));
		}
	}

	size = 2 * (getSize / Math.exp(c * this.degreesToRadians(Math.abs(endangle))));
	roffset = size * Math.exp(c * this.degreesToRadians(0));

	if (endangle < 0) {
		start = Math.abs(endangle);
		end = 0;
		r = size * Math.exp(c * this.degreesToRadians(Math.abs(endangle)));
		if (clockwise) {
			xOrigin =
				this.xPosition() -
				(r * Math.cos(radians(startingDirection - start)) - roffset * Math.cos(radians(startingDirection)));
			yOrigin =
				this.yPosition() -
				(r * Math.sin(radians(startingDirection - start)) - roffset * Math.sin(radians(startingDirection)));
		} else {
			xOrigin =
				this.xPosition() -
				(r * Math.cos(radians(start + startingDirection)) - roffset * Math.cos(radians(startingDirection)));
			yOrigin =
				this.yPosition() -
				(r * Math.sin(radians(start + startingDirection)) - roffset * Math.sin(radians(startingDirection)));
		}
	} else {
		start = 0;
		end = endangle;
		xOrigin = this.xPosition();
		yOrigin = this.yPosition();
	}

	t = start;
	if (end > start) {
		tinc = 1;
	} else {
		tinc = -1;
	}

	let repeatCounter = Math.abs((end - start) / tinc) / segments;

	for (let i = 0; i < repeatCounter; i++) {
		//  Find way to do warp
		for (let j = 0; j < segments; j++) {
			r = size * Math.exp(c * this.degreesToRadians(t));
			if (!clockwise) {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			} else {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t * -1 + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			}
			t = t + tinc;
			this.changeSize(penGrowth);
			if (clockwise) {
				this.turn(tinc);
			} else {
				this.turnLeft(tinc);
			}
		}
	}

	let modCounter = Math.abs((end - start) / tinc) % segments;

	for (let k = 0; k < modCounter; k++) {
		r = size * Math.exp(c * this.degreesToRadians(t));
		if (!clockwise) {
			this.gotoXY(
				xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
				yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
			);
		} else {
			this.gotoXY(
				xOrigin + r * Math.cos(radians(t * -1 + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
				yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
			);
		}
		t = t + tinc;
		this.changeSize(penGrowth);
		if (clockwise) {
			this.turn(tinc);
		} else {
			this.turnLeft(tinc);
		}
	}

	this.up();
};

SpriteMorph.prototype.drawCircle = function (diameter, sweep) {
	var anglecount, stepinc, numbsides, cdirection;
	this.down();

	cdirection = 1;
	if (sweep < 0) {
		cdirection = -1;
	}

	sweep = Math.abs(sweep);
	anglecount = 0;
	stepinc = 1;
	numbsides = 3.141592653589 / Math.asin(stepinc / diameter);

	var i;

	while (360 / numbsides + anglecount <= sweep) {
		if (anglecount + 6 > sweep) {
			while (360 / numbsides + anglecount <= sweep) {
				this.turnLeft((360.0 * cdirection) / numbsides);
				this.forward(stepinc);
				anglecount = anglecount + 360 / numbsides;
			}
		} else {
			for (i = 0; i < 6; i++) {
				this.turnLeft((360 * cdirection) / numbsides);
				this.forward(stepinc);
				anglecount += 360 / numbsides;
			}
		}
	}

	if ((cdirection = 1)) {
		this.turnLeft(sweep - anglecount);
	} else {
		this.turn(sweep - anglecount);
	}
	this.up();
};

//Just try to have only two branches, hence "Limited Tanu"
SpriteMorph.prototype.drawLimitedTanu = function (c, endangle, getSize, penGrowth, isClockwise) {
	var xOrigin,
		yOrigin,
		startingDirection,
		t,
		tinc,
		roffset,
		r,
		start,
		end,
		segments,
		clockwise,
		size,
		tempx,
		tempy,
		temppensize,
		tempclockwize;
	this.down();
	segments = 5;

	if (isClockwise === null || typeof isClockwise === undefined) {
		clockwise = false;
	} else {
		clockwise = isClockwise;
	}

	if (clockwise) {
		if (endangle < 0) {
			startingDirection = 90 - this.direction() - endangle + degrees(Math.atan(1 / c)) - 180;
		} else {
			startingDirection = 90 - this.direction() + degrees(Math.atan(1 / c));
		}
	} else {
		if (endangle < 0) {
			startingDirection = 90 - this.direction() + endangle + (180 - degrees(Math.atan(1 / c)));
		} else {
			startingDirection = 90 - this.direction() - degrees(Math.atan(1 / c));
		}
	}

	size = 2 * (getSize / Math.exp(c * this.degreesToRadians(Math.abs(endangle))));
	roffset = size * Math.exp(c * this.degreesToRadians(0));

	if (endangle < 0) {
		start = Math.abs(endangle);
		end = 0;
		r = size * Math.exp(c * this.degreesToRadians(Math.abs(endangle)));
		if (clockwise) {
			xOrigin =
				this.xPosition() -
				(r * Math.cos(radians(startingDirection - start)) - roffset * Math.cos(radians(startingDirection)));
			yOrigin =
				this.yPosition() -
				(r * Math.sin(radians(startingDirection - start)) - roffset * Math.sin(radians(startingDirection)));
		} else {
			xOrigin =
				this.xPosition() -
				(r * Math.cos(radians(start + startingDirection)) - roffset * Math.cos(radians(startingDirection)));
			yOrigin =
				this.yPosition() -
				(r * Math.sin(radians(start + startingDirection)) - roffset * Math.sin(radians(startingDirection)));
		}
	} else {
		start = 0;
		end = endangle;
		xOrigin = this.xPosition();
		yOrigin = this.yPosition();
	}

	t = start;
	if (end > start) {
		tinc = 1;
	} else {
		tinc = -1;
	}

	let repeatCounter = Math.abs((end - start) / tinc) / segments;
	let stoppingpoint = 0;
	//distinguish two different mother spiral drawing patterns
	if (endangle < 0) {
		stoppingpoint = (repeatCounter * segments * 0.3).toFixed(0);
	} else {
		stoppingpoint = (repeatCounter * segments * 0.7).toFixed(0);
	}

	for (let i = 0; i < repeatCounter; i++) {
		//  Find way to do warp
		for (let j = 0; j < segments; j++) {
			r = size * Math.exp(c * this.degreesToRadians(t));
			if (!clockwise) {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			} else {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t * -1 + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			}
			t = t + tinc;
			this.changeSize(penGrowth);
			if (clockwise) {
				this.turn(tinc);
			} else {
				this.turnLeft(tinc);
			}

			if (i * 5 + j == stoppingpoint) {
				tempx = this.xPosition();
				tempy = this.yPosition();
				temppensize = this.size; //this is the pensize, not the size of the spiral
				//tempdirection = 135 - this.getAngle();

				if (endangle > 0) {
					tempdirection = 180 + this.getAngle();
				} else {
					tempdirection = this.getAngle();
				}

				//tempdirection = this.direction();
				//This is the direction variable, not where the pen is pointing at this point
			}
		}
	}
	let modCounter = Math.abs((end - start) / tinc) % segments;

	for (let k = 0; k < modCounter; k++) {
		r = size * Math.exp(c * this.degreesToRadians(t));
		if (!clockwise) {
			this.gotoXY(
				xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
				yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
			);
		} else {
			this.gotoXY(
				xOrigin + r * Math.cos(radians(t * -1 + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
				yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
			);
		}
		t = t + tinc;
		this.changeSize(penGrowth);
		if (clockwise) {
			this.turn(tinc);
		} else {
			this.turnLeft(tinc);
		}
	}
	this.up();

	this.gotoXY(tempx, tempy);
	this.setSize(temppensize); //temppensize
	var newspiralsize = getSize * 0.375;
	var newclockwize = !isClockwise; //reverse the clockwise
	var temppengrowth = Math.abs(penGrowth) * -1; //pengrawth will always be negative - drawing outside to inside
	this.pointAtAngle(tempdirection);

	var newsweep = Math.abs(endangle) * -0.618;
	this.drawLogSpiral(c, newsweep, newspiralsize, temppengrowth, newclockwize);
};

//Below is the tanu prototype
SpriteMorph.prototype.drawTanu = function (c, endangle, getSize, penGrowth, isClockwise, depth, percentage) {
	var xOrigin,
		yOrigin,
		startingDirection,
		t,
		tinc,
		roffset,
		r,
		start,
		end,
		segments,
		clockwise,
		size,
		tempx,
		tempy,
		temppensize,
		tempclockwize;

	if (depth >= 1) {
		//implement the below function if the depth value is one (one spiral) or more. end if not
		this.down();
		segments = 5;

		if (isClockwise === null || typeof isClockwise === undefined) {
			clockwise = false;
		} else {
			clockwise = isClockwise;
		}

		if (clockwise) {
			if (endangle < 0) {
				startingDirection = 90 - this.direction() - endangle + degrees(Math.atan(1 / c)) - 180;
			} else {
				startingDirection = 90 - this.direction() + degrees(Math.atan(1 / c));
			}
		} else {
			if (endangle < 0) {
				startingDirection = 90 - this.direction() + endangle + (180 - degrees(Math.atan(1 / c)));
			} else {
				startingDirection = 90 - this.direction() - degrees(Math.atan(1 / c));
			}
		}

		size = 2 * (getSize / Math.exp(c * this.degreesToRadians(Math.abs(endangle))));
		roffset = size * Math.exp(c * this.degreesToRadians(0));

		if (endangle < 0) {
			start = Math.abs(endangle);
			end = 0;
			r = size * Math.exp(c * this.degreesToRadians(Math.abs(endangle)));
			if (clockwise) {
				xOrigin =
					this.xPosition() -
					(r * Math.cos(radians(startingDirection - start)) - roffset * Math.cos(radians(startingDirection)));
				yOrigin =
					this.yPosition() -
					(r * Math.sin(radians(startingDirection - start)) - roffset * Math.sin(radians(startingDirection)));
			} else {
				xOrigin =
					this.xPosition() -
					(r * Math.cos(radians(start + startingDirection)) - roffset * Math.cos(radians(startingDirection)));
				yOrigin =
					this.yPosition() -
					(r * Math.sin(radians(start + startingDirection)) - roffset * Math.sin(radians(startingDirection)));
			}
		} else {
			start = 0;
			end = endangle;
			xOrigin = this.xPosition();
			yOrigin = this.yPosition();
		}

		t = start;
		if (end > start) {
			tinc = 1;
		} else {
			tinc = -1;
		}

		let repeatCounter = Math.abs((end - start) / tinc) / segments;
		let stoppingpoint = 0;
		//distinguish two different mother spiral drawing patterns
		if (endangle < 0) {
			stoppingpoint = (repeatCounter * segments * 0.3).toFixed(0);
		} else {
			stoppingpoint = (repeatCounter * segments * 0.7).toFixed(0);
		}

		for (let i = 0; i < repeatCounter; i++) {
			//  Find way to do warp
			for (let j = 0; j < segments; j++) {
				r = size * Math.exp(c * this.degreesToRadians(t));
				if (!clockwise) {
					this.gotoXY(
						xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
						yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
					);
				} else {
					this.gotoXY(
						xOrigin +
							r * Math.cos(radians(t * -1 + startingDirection)) -
							roffset * Math.cos(radians(startingDirection)),
						yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
					);
				}
				t = t + tinc;
				this.changeSize(penGrowth);
				if (clockwise) {
					this.turn(tinc);
				} else {
					this.turnLeft(tinc);
				}

				if (i * 5 + j == stoppingpoint) {
					tempx = this.xPosition();
					tempy = this.yPosition();
					temppensize = this.size; //this is the pensize, not the size of the spiral
					//tempdirection = 135 - this.getAngle();

					if (endangle > 0) {
						tempdirection = 180 + this.getAngle();
					} else {
						tempdirection = this.getAngle();
					}

					//tempdirection = this.direction();
					//This is the direction variable, not where the pen is pointing at this point
				}
			}
		}
		let modCounter = Math.abs((end - start) / tinc) % segments;

		for (let k = 0; k < modCounter; k++) {
			r = size * Math.exp(c * this.degreesToRadians(t));
			if (!clockwise) {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			} else {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t * -1 + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			}
			t = t + tinc;
			this.changeSize(penGrowth);
			if (clockwise) {
				this.turn(tinc);
			} else {
				this.turnLeft(tinc);
			}
		}
		this.up();

		if (depth > 1) {
			//this means it has to go to the branching point
			this.gotoXY(tempx, tempy);
			this.setSize(temppensize); //temppensize
			var newspiralsize = getSize * percentage;
			var newclockwize = !isClockwise; //reverse the clockwise
			var temppengrowth = Math.abs(penGrowth) * -1; //pengrawth will always be negative - drawing outside to inside
			this.pointAtAngle(tempdirection);
			var newdepth = depth - 1;

			var newsweep = Math.abs(endangle) * -0.618;
			this.drawTanu(c, newsweep, newspiralsize, temppengrowth, newclockwize, newdepth, percentage);
		}
	}
	this.up();
};

SpriteMorph.prototype.originalCategories = SpriteMorph.prototype.categories;
SpriteMorph.prototype.originalBlockColor = SpriteMorph.prototype.blockColor;

SpriteMorph.prototype.categories = [...SpriteMorph.prototype.originalCategories, "ai"];

SpriteMorph.prototype.blockColor = {
	...SpriteMorph.prototype.originalBlockColor,
	ai: new Color(100, 100, 100),
};
