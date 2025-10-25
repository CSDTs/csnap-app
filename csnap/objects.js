var IDE_Morph;

SpriteMorph.prototype.originalInit = SpriteMorph.prototype.init;
SpriteMorph.prototype.init = function (globals) {
	this.originalInit(globals);
};

// SpriteMorph.prototype.categories.push("ai");
// SpriteMorph.prototype.blockColor["ai"] = new Color(24, 167, 181);

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
		printList: {
			type: "command",
			category: "variables",
			spec: "print list %l",
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

		changeCostumeShade: {
			type: "command",
			category: "looks",
			spec: "(legacy) change costume shade by %n ",
		},

		setScaleGlide: {
			only: SpriteMorph,
			type: "command",
			category: "looks",
			spec: "glide set scale to %n %",
			defaults: [50],
		},
		changeCostumeShade: {
			type: "command",
			category: "looks",
			spec: "(legacy) change costume shade by %n",
			defaults: [100],
		},
		setCostumeShade: {
			type: "command",
			category: "looks",
			spec: "(legacy) set costume shade to %n",
			defaults: [100],
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
SpriteMorph.prototype.blockTemplates = function (category, all = false) {
	var myself = this,
		blocks = myself.originalBlockTemplates(category, all);

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

	if (category === "unified") {
		blocks.push(block("receiveGo"));
		return blocks;
	} else if (category === "motion") {
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

SpriteMorph.prototype.categoryText = function (category) {
	var txt = new StringMorph(localize(category[0].toUpperCase().concat(category.slice(1))), 11, null, true);
	txt.setColor(this.paletteTextColor);
	txt.category = category;
	return txt;
};

SpriteMorph.prototype.originalFreshPalette = SpriteMorph.prototype.freshPalette;
StageMorph.prototype.originalFreshPalette = StageMorph.prototype.freshPalette;
SpriteMorph.prototype.freshPalette = function (category) {
	// If we're in tutorial mode and using unified palette, show only specific blocks
	if (StageMorph.prototype.tutorial && category === "unified") {
		var myself = this,
			palette = new ScrollFrameMorph(null, null, this.sliderColor),
			unit = SyntaxElementMorph.prototype.fontSize,
			ide = this.parentThatIsA(IDE_Morph),
			x = 0,
			y = 5,
			blocks = [],
			hideNextSpace = false,
			shade = new Color(140, 140, 140),
			searchButton,
			makeButton,
			all = false,
			inheritedVars = this.inheritedVariableNames();

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

		if (!ide || !ide.config.noOwnBlocks) {
			makeButton = new PushButtonMorph(this, "makeBlock", new SymbolMorph("cross", 16));
			makeButton.alpha = 0.2;
			makeButton.padding = 1;
			makeButton.hint = localize("Make a block") + "...";
			makeButton.labelShadowColor = shade;
			makeButton.edge = 0;
			makeButton.padding = 3;
			makeButton.fixLayout();
			palette.toolBar.add(makeButton);
		}

		palette.toolBar.fixLayout();
		palette.add(palette.toolBar);

		// Define exactly which blocks to show in unified tutorial mode
		function block(selector, isGhosted) {
			if (StageMorph.prototype.hiddenPrimitives[selector] && !isGhosted) {
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

		function variableWatcherToggle(varName, isGlobal) {
			return new ToggleMorph(
				"checkbox",
				this,
				function () {
					myself.toggleVariableWatcher(varName, isGlobal);
				},
				null,
				function () {
					return myself.showingVariableWatcher(varName, isGlobal);
				},
				null
			);
		}

		function variableBlock(varName, isLocal) {
			var newBlock = SpriteMorph.prototype.variableBlock(varName, isLocal);
			newBlock.isDraggable = false;
			newBlock.isTemplate = true;
			if (contains(inheritedVars, varName)) {
				newBlock.ghost();
			}
			return newBlock;
		}

		// Add only the specific blocks you want

		blocks.push(block("receiveGo"));
		blocks.push(block("doRepeat"));
		blocks.push(block("receiveMessage"));
		blocks.push(block("doBroadcast"));
		blocks.push("-");
		blocks.push(block("gotoXY"));
		blocks.push(block("pointAtAngle"));
		blocks.push(block("rotateByDegrees"));
		blocks.push(block("translatePercent"));
		blocks.push(block("changeXPosition"));
		blocks.push(block("turnLeft"));
		blocks.push(block("forward"));

		blocks.push(block("doSwitchToCostume"));
		blocks.push(block("setEffect"));
		blocks.push(block("reflectYAxis"));
		blocks.push(block("setScale"));
		blocks.push(block("newSizeOfCurrent"));

		blocks.push(block("clear"));
		blocks.push(block("doStamp"));
		blocks.push(block("setSize"));

		blocks.push("-");

		// blocks.push(this.makeVariableButton());
		if (this.variables.allNames().length > 0) {
			blocks.push(this.deleteVariableButton());
		}
		blocks.push("-");

		varNames = this.allGlobalVariableNames(true, all);
		if (varNames.length > 0) {
			varNames.forEach((name) => {
				blocks.push(variableWatcherToggle(name, true));
				blocks.push(variableBlock(name));
			});
			blocks.push("-");
		}

		varNames = this.allLocalVariableNames(true, all);
		if (varNames.length > 0) {
			varNames.forEach((name) => {
				blocks.push(variableWatcherToggle(name));
				blocks.push(variableBlock(name, true));
			});
			blocks.push("-");
		}

		blocks.push(block("doSetVar"));
		blocks.push(block("doChangeVar"));

		blocks.push(block("reportQuotient"));
		blocks.push(block("reportProduct"));
		blocks.push(block("reportBoolean"));
		blocks.push(block("reportRandom"));

		var allCustomBlocks = [];

		// Add local custom blocks
		if (this.customBlocks) {
			this.customBlocks.forEach(function (definition) {
				if (!definition.isHelper) {
					// Don't show helper blocks
					allCustomBlocks.push(definition.templateInstance());
				}
			});
		}

		// Add global custom blocks
		var stage = this.parentThatIsA(StageMorph);
		if (stage && stage.globalBlocks) {
			stage.globalBlocks.forEach(function (definition) {
				if (!definition.isHelper) {
					// Don't show helper blocks
					allCustomBlocks.push(definition.templateInstance());
				}
			});
		}

		// Add custom blocks to the blocks array
		blocks = blocks.concat(allCustomBlocks);

		// Add more blocks here as needed:
		// blocks.push(block("move"));
		// blocks.push(block("turnLeft"));
		// etc.

		// Add the blocks to the palette
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
	}

	// For non-tutorial or non-unified, use the original method
	return this.originalFreshPalette(category);
};

// SpriteMorph.prototype.freshPalette = function (category) {
// 	var myself = this,
// 		palette = new ScrollFrameMorph(null, null, this.sliderColor),
// 		unit = SyntaxElementMorph.prototype.fontSize,
// 		ide = this.parentThatIsA(IDE_Morph),
// 		showCategories,
// 		showButtons,
// 		x = 0,
// 		y = 5,
// 		ry = 0,
// 		blocks,
// 		hideNextSpace = false,
// 		shade = new Color(140, 140, 140),
// 		searchButton,
// 		makeButton;

// 	palette.owner = this;
// 	palette.padding = unit / 2;
// 	palette.color = this.paletteColor;
// 	palette.growth = new Point(0, MorphicPreferences.scrollBarSize);

// 	// toolbar:

// 	palette.toolBar = new AlignmentMorph("column");

// 	searchButton = new PushButtonMorph(this, "searchBlocks", new SymbolMorph("magnifierOutline", 16));
// 	searchButton.alpha = 0.2;
// 	searchButton.padding = 1;
// 	searchButton.hint = localize("find blocks") + "...";
// 	searchButton.labelShadowColor = shade;
// 	searchButton.edge = 0;
// 	searchButton.padding = 3;
// 	searchButton.fixLayout();
// 	palette.toolBar.add(searchButton);

// 	if (!ide || !ide.config.noOwnBlocks) {
// 		makeButton = new PushButtonMorph(this, "makeBlock", new SymbolMorph("cross", 16));
// 		makeButton.alpha = 0.2;
// 		makeButton.padding = 1;
// 		makeButton.hint = localize("Make a block") + "...";
// 		makeButton.labelShadowColor = shade;
// 		makeButton.edge = 0;
// 		makeButton.padding = 3;
// 		makeButton.fixLayout();
// 		palette.toolBar.add(makeButton);
// 	}

// 	palette.toolBar.fixLayout();
// 	palette.add(palette.toolBar);

// 	// menu:
// 	palette.userMenu = function () {
// 		var menu = new MenuMorph();
// 		ide = ide || this.parentThatIsA(IDE_Morph);

// 		menu.addPair(
// 			[new SymbolMorph("magnifyingGlass", MorphicPreferences.menuFontSize), localize("find blocks") + "..."],
// 			() => myself.searchBlocks(),
// 			"^F"
// 		);
// 		if (!ide.config.noOwnBlocks) {
// 			menu.addItem("hide blocks...", () => new BlockVisibilityDialogMorph(myself).popUp(myself.world()));
// 			menu.addLine();
// 			menu.addItem("make a category...", () => this.parentThatIsA(IDE_Morph).createNewCategory());
// 			if (SpriteMorph.prototype.customCategories.size) {
// 				menu.addItem("delete a category...", () => this.parentThatIsA(IDE_Morph).deleteUserCategory());
// 			}
// 		}
// 		return menu;
// 	};

// 	if (category === "unified") {
// 		// In a Unified Palette custom blocks appear following each category,
// 		// but there is only 1 make a block button (at the end).

// 		ide = ide || this.parentThatIsA(IDE_Morph);
// 		showCategories = ide.scene.showCategories;
// 		showButtons = ide.scene.showPaletteButtons;
// 		blocks = SpriteMorph.prototype.allCategories().reduce((blocks, category) => {
// 			let header = [this.categoryText(category), "-"],
// 				primitives = this.getPrimitiveTemplates(category),
// 				customs = this.customBlockTemplatesForCategory(category),
// 				showHeader =
// 					showCategories &&
// 					!["lists", "other"].includes(category) &&
// 					(primitives.some((item) => item instanceof BlockMorph) || customs.length);

// 			// hide category names
// 			if (!showCategories && category !== "variables") {
// 				primitives = primitives.filter((each) => each !== "-" && each !== "=" && each && !each.hideWithCategory);
// 			}

// 			// hide "make / delete a variable" buttons
// 			if (!showButtons && category === "variables") {
// 				primitives = primitives.filter(
// 					(each) => !(each instanceof PushButtonMorph && each.hideable && !(each instanceof ToggleMorph))
// 				);
// 			}

// 			return blocks.concat(
// 				showHeader ? header : [],
// 				primitives,
// 				showHeader ? "=" : null,
// 				customs,
// 				showHeader ? "=" : "-"
// 			);
// 		}, []);
// 	} else {
// 		// ensure we do not modify the cached array
// 		blocks = this.getPrimitiveTemplates(category).slice();
// 	}

// 	if (category !== "unified" || showButtons) {
// 		ide = ide || this.parentThatIsA(IDE_Morph);
// 		if (!ide || !ide.config.noOwnBlocks) {
// 			blocks.push("=");
// 			blocks.push(this.makeBlockButton(category));
// 		}
// 	}

// 	if (category !== "unified") {
// 		blocks.push("=");
// 		blocks.push(...this.customBlockTemplatesForCategory(category));
// 	}
// 	if (category === "variables") {
// 		blocks.push(...this.customBlockTemplatesForCategory("lists"));
// 		blocks.push(...this.customBlockTemplatesForCategory("other"));
// 	}

// 	blocks.forEach((block) => {
// 		if (block === null) {
// 			return;
// 		}
// 		if (block === "-") {
// 			if (hideNextSpace) {
// 				return;
// 			}
// 			y += unit * 0.8;
// 			hideNextSpace = true;
// 		} else if (block === "=") {
// 			if (hideNextSpace) {
// 				return;
// 			}
// 			y += unit * 1.6;
// 			hideNextSpace = true;
// 		} else if (block === "#") {
// 			x = 0;
// 			y = ry === 0 ? y : ry;
// 		} else {
// 			hideNextSpace = false;
// 			if (x === 0) {
// 				y += unit * 0.3;
// 			}
// 			block.setPosition(new Point(x, y));
// 			palette.addContents(block);
// 			if (block instanceof ToggleMorph) {
// 				x = block.right() + unit / 2;
// 			} else if (block instanceof RingMorph) {
// 				x = block.right() + unit / 2;
// 				ry = block.bottom();
// 			} else {
// 				x = 0;
// 				y += block.height();
// 			}
// 		}
// 	});

// 	palette.scrollX(palette.padding);
// 	palette.scrollY(palette.padding);
// 	return palette;
// };

StageMorph.prototype.freshPalette = SpriteMorph.prototype.freshPalette;

SpriteMorph.prototype.originalInitBlockMigrations = SpriteMorph.prototype.initBlockMigrations;

SpriteMorph.prototype.initBlockMigrations = function () {
	this.originalInitBlockMigrations();
	SpriteMorph.prototype.originalBlockMigrations = SpriteMorph.prototype.blockMigrations;

	SpriteMorph.prototype.blockMigrations = {
		...this.originalBlockMigrations,
		translate_percent: {
			selector: "translatePercent",
			offset: 0,
		},
		changeCostumeColor: {
			selector: "legacySetCostumeColor",
			// inputs: [["color"]],
			offset: 0,
		},
		// setCostumeShade: {
		// 	selector: "setEffect",
		// 	inputs: [["brightness"]],
		// 	offset: 1,
		// },
		// changeCostumeShade: {
		// 	selector: "changeEffect",
		// 	inputs: [["brightness"]],
		// 	offset: 1,
		// },
		setCostumeColor: {
			selector: "setEffect",
			inputs: [["color"]],
			offset: 1,
		},
		setCostumeOpacity: {
			selector: "setEffect",
			inputs: [["brightness"]],
			offset: 1,
		},
		changeCostumeOpacity: {
			selector: "setEffect",
			inputs: [["brightness"]],
			offset: 1,
		},
		flipXAxis: {
			selector: "reflectXAxis",
			offset: 1,
		},
		flipYAxis: {
			selector: "reflectYAxis",
			offset: 1,
		},
		penSize: {
			selector: "getPenAttribute",
			inputs: [["size"]],
			offset: 1,
		},
	};
};

SpriteMorph.prototype.initBlockMigrations();
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
SpriteMorph.prototype.printList = function (list) {
	window.open("data:text/" + "plain," + list.asText());
};
SpriteMorph.prototype.changeCostumeShade = function (num) {
	return this.changeEffect("brightness", num);
};

SpriteMorph.prototype.setCostumeShade = function (num) {
	return this.setEffect("brightness", num);
};

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

// SpriteMorph.prototype.categories = [...SpriteMorph.prototype.originalCategories, "ai"];

// SpriteMorph.prototype.blockColor = {
// 	...SpriteMorph.prototype.originalBlockColor,
// 	ai: new Color(100, 100, 100),
// };

////////MISC////////

SpriteMorph.prototype.changeBlockVisibility = function (aBlock, hideIt, quick) {
	var ide = this.parentThatIsA(IDE_Morph),
		dict,
		cat;
	if (aBlock.isCustomBlock) {
		(aBlock.isGlobal ? aBlock.definition : this.getMethod(aBlock.semanticSpec)).isHelper = !!hideIt;
	} else if (aBlock.selector === "reportGetVar") {
		this.variables.find(aBlock.blockSpec).vars[aBlock.blockSpec].isHidden = !!hideIt;
	} else {
		if (hideIt) {
			StageMorph.prototype.hiddenPrimitives[aBlock.selector] = true;
		} else {
			delete StageMorph.prototype.hiddenPrimitives[aBlock.selector];
		}
	}
	if (quick) {
		this.recordUserEdit("palette", hideIt ? "hide" : "show", aBlock.abstractBlockSpec());
		return;
	}
	dict = {
		doWarp: "control",
		reifyScript: "operators",
		reifyReporter: "operators",
		reifyPredicate: "operators",
		doDeclareVariables: "variables",
	};
	cat = dict[aBlock.selector] || aBlock.category;
	if (cat === "lists") {
		cat = "variables";
	}
	ide.flushBlocksCache(cat);
	ide.refreshPalette();
	this.recordUserEdit("palette", hideIt ? "hide" : "show", aBlock.abstractBlockSpec());
};

// export function showPrimitive() {
// 	var ide = this.parentThatIsA(IDE_Morph),
// 	  dict,
// 	  cat;
// 	if (!ide) {
// 	  return;
// 	}
// 	delete StageMorph.prototype.hiddenPrimitives[this.selector];
// 	dict = {
// 	  doWarp: "control",
// 	  reifyScript: "operators",
// 	  reifyReporter: "operators",
// 	  reifyPredicate: "operators",
// 	  doDeclareVariables: "variables",
// 	};
// 	cat = dict[this.selector] || this.category;
// 	if (cat === "lists") {
// 	  cat = "variables";
// 	}
// 	ide.flushBlocksCache(cat);
// 	ide.refreshPalette();
//   }

//////////////SpriteMorph//////////

SpriteMorph.prototype.originanInit = SpriteMorph.prototype.init;

SpriteMorph.prototype.init = function (globals) {
	////////////////////////////////
	//CSDT Edits
	this.originalPixels = null;
	this.hasSaturation = false;
	this.hasBrightness = false;
	this.hasBorder = false;
	// this.flippedX = false;
	// this.flippedY = false;
	// this.isNotFlipBack = true;
	this.colorShiftCostume = null;
	this.borderColor = new Color(255, 0, 0);
	this.borderSize = 0;
	this.normalExtent = new Point(60, 60); // only for costume-less situation
	this.lineList = []; //For borders
	////////////////////////////////

	this.originalInit(globals);
};

// SpriteMorph.prototype.freshPalette = function (category) {
// 	// TODO Quick fix for tutorials (showing custom pen blocks by default)
// 	// if (StageMorph.prototype.decategorize) {
// 	// 	category = "pen";
// 	// }
// 	var myself = this,
// 		palette = new ScrollFrameMorph(null, null, this.sliderColor),
// 		unit = SyntaxElementMorph.prototype.fontSize,
// 		ide = this.parentThatIsA(IDE_Morph),
// 		showCategories,
// 		showButtons,
// 		x = 0,
// 		y = 5,
// 		ry = 0,
// 		blocks,
// 		hideNextSpace = false,
// 		shade = new Color(140, 140, 140),
// 		searchButton,
// 		makeButton;

// 	palette.owner = this;
// 	palette.padding = unit / 2;
// 	palette.color = this.paletteColor;
// 	palette.growth = new Point(0, MorphicPreferences.scrollBarSize);

// 	// toolbar:

// 	palette.toolBar = new AlignmentMorph("column");

// 	searchButton = new PushButtonMorph(this, "searchBlocks", new SymbolMorph("magnifierOutline", 16));
// 	searchButton.alpha = 0.2;
// 	searchButton.padding = 1;
// 	searchButton.hint = localize("find blocks") + "...";
// 	searchButton.labelShadowColor = shade;
// 	searchButton.edge = 0;
// 	searchButton.padding = 3;
// 	searchButton.fixLayout();
// 	palette.toolBar.add(searchButton);

// 	if (!ide || !ide.config.noOwnBlocks) {
// 		makeButton = new PushButtonMorph(this, "makeBlock", new SymbolMorph("cross", 16));
// 		makeButton.alpha = 0.2;
// 		makeButton.padding = 1;
// 		makeButton.hint = localize("Make a block") + "...";
// 		makeButton.labelShadowColor = shade;
// 		makeButton.edge = 0;
// 		makeButton.padding = 3;
// 		makeButton.fixLayout();
// 		palette.toolBar.add(makeButton);
// 	}

// 	palette.toolBar.fixLayout();
// 	palette.add(palette.toolBar);

// 	// menu:
// 	palette.userMenu = function () {
// 		var menu = new MenuMorph();
// 		ide = ide || this.parentThatIsA(IDE_Morph);

// 		menu.addPair(
// 			[new SymbolMorph("magnifyingGlass", MorphicPreferences.menuFontSize), localize("find blocks") + "..."],
// 			() => myself.searchBlocks(),
// 			"^F"
// 		);
// 		if (!ide.config.noOwnBlocks) {
// 			menu.addItem("hide blocks...", () => new BlockVisibilityDialogMorph(myself).popUp(myself.world()));
// 			menu.addLine();
// 			menu.addItem("make a category...", () => this.parentThatIsA(IDE_Morph).createNewCategory());
// 			if (SpriteMorph.prototype.customCategories.size) {
// 				menu.addItem("delete a category...", () => this.parentThatIsA(IDE_Morph).deleteUserCategory());
// 			}
// 		}
// 		return menu;
// 	};

// 	if (category === "unified") {
// 		// In a Unified Palette custom blocks appear following each category,
// 		// but there is only 1 make a block button (at the end).
// 		ide = ide || this.parentThatIsA(IDE_Morph);
// 		showCategories = ide.scene.showCategories;
// 		showButtons = ide.scene.showPaletteButtons;
// 		blocks = SpriteMorph.prototype.allCategories().reduce((blocks, category) => {
// 			let header = [this.categoryText(category), "-"],
// 				primitives = this.getPrimitiveTemplates(category),
// 				customs = this.customBlockTemplatesForCategory(category),
// 				showHeader =
// 					showCategories &&
// 					!["lists", "other"].includes(category) &&
// 					(primitives.some((item) => item instanceof BlockMorph) || customs.length);

// 			// hide category names
// 			if (!showCategories && category !== "variables") {
// 				primitives = primitives.filter((each) => each !== "-" && each !== "=" && each && !each.hideWithCategory);
// 			}

// 			// hide "make / delete a variable" buttons
// 			if (!showButtons && category === "variables") {
// 				primitives = primitives.filter(
// 					(each) => !(each instanceof PushButtonMorph && each.hideable && !(each instanceof ToggleMorph))
// 				);
// 			}

// 			return blocks.concat(
// 				showHeader ? header : [],
// 				primitives,
// 				showHeader ? "=" : null,
// 				customs,
// 				showHeader ? "=" : "-"
// 			);
// 		}, []);
// 	} else {
// 		// ensure we do not modify the cached array
// 		blocks = this.getPrimitiveTemplates(category).slice();
// 	}

// 	if (category !== "unified" || showButtons) {
// 		ide = ide || this.parentThatIsA(IDE_Morph);
// 		if (!ide || !ide.config.noOwnBlocks) {
// 			blocks.push("=");
// 			blocks.push(this.makeBlockButton(category));
// 		}
// 	}

// 	if (category !== "unified") {
// 		blocks.push("=");
// 		blocks.push(...this.customBlockTemplatesForCategory(category));
// 	}
// 	if (category === "variables") {
// 		blocks.push(...this.customBlockTemplatesForCategory("lists"));
// 		blocks.push(...this.customBlockTemplatesForCategory("other"));
// 	}

// 	blocks.forEach((block) => {
// 		if (block === null) {
// 			return;
// 		}
// 		if (block === "-") {
// 			if (hideNextSpace) {
// 				return;
// 			}
// 			y += unit * 0.8;
// 			hideNextSpace = true;
// 		} else if (block === "=") {
// 			if (hideNextSpace) {
// 				return;
// 			}
// 			y += unit * 1.6;
// 			hideNextSpace = true;
// 		} else if (block === "#") {
// 			x = 0;
// 			y = ry === 0 ? y : ry;
// 		} else {
// 			hideNextSpace = false;
// 			if (x === 0) {
// 				y += unit * 0.3;
// 			}
// 			block.setPosition(new Point(x, y));
// 			palette.addContents(block);
// 			if (block instanceof ToggleMorph) {
// 				x = block.right() + unit / 2;
// 			} else if (block instanceof RingMorph) {
// 				x = block.right() + unit / 2;
// 				ry = block.bottom();
// 			} else {
// 				x = 0;
// 				y += block.height();
// 			}
// 		}
// 	});

// 	palette.scrollX(palette.padding);
// 	palette.scrollY(palette.padding);
// 	return palette;
// };

Costume.prototype.shrinkToFit = function (extentPoint) {
	if (this.getNoFit()) return;
	if (extentPoint.x < this.width() || extentPoint.y < this.height()) {
		this.contents = this.thumbnail(extentPoint, null, true);
	}
};

Costume.prototype.getNoFit = function () {
	return this.noFit;
};

Costume.prototype.noFit = false;

//StageMorph

StageMorph.prototype.trailsLogAsSVG = function () {
	var bottomLeft = this.trailsLog[0][0],
		topRight = bottomLeft,
		maxWidth = this.trailsLog[0][3],
		shift,
		box,
		p1,
		p2,
		svg;

	// determine bounding box and max line width
	this.trailsLog.forEach((line) => {
		bottomLeft = bottomLeft.min(line[0]);
		bottomLeft = bottomLeft.min(line[1]);
		topRight = topRight.max(line[0]);
		topRight = topRight.max(line[1]);
		maxWidth = Math.max(maxWidth, line[3]);
	});
	box = bottomLeft.corner(topRight).expandBy(maxWidth / 2);
	shift = new Point(-bottomLeft.x, topRight.y).translateBy(maxWidth / 2);
	svg =
		'<svg xmlns="http://www.w3.org/2000/svg" ' +
		'preserveAspectRatio="none" ' +
		'viewBox="0 0 ' +
		box.width() +
		" " +
		box.height() +
		'" ' +
		'width="' +
		box.width() +
		'" height="' +
		box.height() +
		'" ' +
		// 'style="background-color:black" ' + // for supporting backgrounds
		">";
	svg += "<!-- Generated by CSnap Pro! - https://csdt.org/ -->";

	// for debugging the viewBox:
	// svg += '<rect width="100%" height="100%" fill="black"/>'

	this.trailsLog.forEach((line) => {
		p1 = this.normalizePoint(line[0]).translateBy(shift);
		p2 = this.normalizePoint(line[1]).translateBy(shift);
		svg +=
			'<line x1="' +
			p1.x +
			'" y1="' +
			p1.y +
			'" x2="' +
			p2.x +
			'" y2="' +
			p2.y +
			'" ' +
			'style="stroke:' +
			line[2].toRGBstring() +
			";" +
			"stroke-opacity:" +
			line[2].a +
			";" +
			"stroke-width:" +
			line[3] +
			";stroke-linecap:" +
			line[4] +
			'" />';
	});
	svg += "</svg>";
	return {
		src: svg,
		rot: new Point(-box.origin.x, box.corner.y),
	};
};

StageMorph.prototype.userMenu = function () {
	var ide = this.parentThatIsA(IDE_Morph),
		menu = new MenuMorph(this);

	if (ide && (ide.isAppMode || ide.config.noSpriteEdits)) {
		// menu.addItem('help', 'nop');
		return menu;
	}
	menu.addItem("edit", "edit");
	menu.addItem("show all", "showAll");
	menu.addItem("pic...", () => ide.saveCanvasAs(this.fullImage(), this.name), "save a picture\nof the stage");
	menu.addLine();
	menu.addItem(
		"stl...",
		() => {
			ide.exportAsSTL();
		},
		"save a stl of\nthe stage (High\nContrast Required)"
	);
	menu.addItem(
		"advanced stl...",
		() => {
			ide.launchSTLParamsPrompt(ide.getProjectName());
		},
		"save a stl of\nthe stage (High\nContrast Required)"
	);
	menu.addLine();
	menu.addItem(
		"pen trails",
		() => {
			var costume = ide.currentSprite.reportPenTrailsAsCostume().copy();
			ide.currentSprite.addCostume(costume);
			ide.currentSprite.wearCostume(costume);
			ide.hasChangedMedia = true;
			ide.spriteBar.tabBar.tabTo("costumes");
		},
		ide.currentSprite instanceof SpriteMorph
			? "turn all pen trails and stamps\n" + "into a new costume for the\ncurrently selected sprite"
			: "turn all pen trails and stamps\n" + "into a new background for the stage"
	);
	if (this.trailsLog.length) {
		menu.addItem("svg...", "exportTrailsLogAsSVG", "export pen trails\nline segments as SVG");
		menu.addItem("poly svg...", "exportTrailsLogAsPolySVG", "export pen trails\nline segments as polyline SVG");
		menu.addItem("dst...", "exportTrailsLogAsDST", "export pen trails\nas DST embroidery file");
		menu.addItem("exp...", "exportTrailsLogAsEXP", "export pen trails\nas EXP embroidery file");
	}
	return menu;
};

StageMorph.prototype.fancyThumbnail = function (extentPoint, excludedSprite, nonRetina, recycleMe, noWatchers) {
	// Multiply extent by 2 for higher quality (unless already scaled)
	var highResExtent = new Point(extentPoint.x * 3, extentPoint.y * 3);

	var src = this.getImage(),
		scale = Math.min(highResExtent.x / src.width, highResExtent.y / src.height),
		trg = newCanvas(highResExtent, nonRetina, recycleMe),
		ctx = trg.getContext("2d"),
		fb,
		fimg;

	ctx.save();
	ctx.scale(scale, scale);
	ctx.drawImage(src, 0, 0);
	ctx.drawImage(this.penTrails(), 0, 0, this.dimensions.x * this.scale, this.dimensions.y * this.scale);
	if (this.projectionSource) {
		ctx.save();
		ctx.globalAlpha = 1 - this.projectionTransparency / 100;
		ctx.drawImage(this.projectionLayer(), 0, 0, this.dimensions.x * this.scale, this.dimensions.y * this.scale);
		ctx.restore();
	}
	this.children.forEach((morph) => {
		if ((isSnapObject(morph) || !noWatchers) && morph.isVisible && morph !== excludedSprite) {
			fb = morph.fullBounds();
			fimg = morph.fullImage();
			if (fimg.width && fimg.height) {
				ctx.drawImage(morph.fullImage(), fb.origin.x - this.bounds.origin.x, fb.origin.y - this.bounds.origin.y);
			}
		}
	});
	ctx.restore();
	return trg;
};

// Override thumbnail to use beetle 3D view when beetle library is loaded
StageMorph.prototype.thumbnail = function (extentPoint, recycleMe, noWatchers) {
	// Multiply extent by 2 for higher quality
	var highResExtent = new Point(extentPoint.x * 3, extentPoint.y * 3);

	// Check if beetle library is loaded and beetleController exists
	if (this.beetleController && typeof this.beetleController.currentView === "function") {
		// Use beetle's 3D view for the thumbnail
		var beetleCanvas = this.beetleController.currentView();
		// Scale the beetle canvas to match the requested extent
		var scale = Math.min(highResExtent.x / beetleCanvas.width, highResExtent.y / beetleCanvas.height);
		var trg = newCanvas(highResExtent, false, recycleMe);
		var ctx = trg.getContext("2d");
		ctx.save();
		ctx.scale(scale, scale);
		ctx.drawImage(beetleCanvas, 0, 0);
		ctx.restore();
		return trg;
	}
	// Fall back to default behavior - call the original fancyThumbnail method
	return this.fancyThumbnail(highResExtent, null, false, recycleMe, noWatchers);
};
////////////////////////////////////////////////////////////////
// Main block overrides
////////////////////////////////////////////////////////////////

SpriteMorph.prototype.setEffect = function (effect, value) {
	var eff = effect instanceof Array ? effect[0] : effect.toString();
	if (
		!contains(
			[
				"color",
				"saturation",
				"brightness",
				"ghost",
				"fisheye",
				"whirl",
				"pixelate",
				"mosaic",
				"negative",
				// depracated, but still supported in legacy projects:
				"duplicate",
				"comic",
				"confetti",
			],
			eff
		)
	) {
		throw new Error(localize("unsupported graphic effect") + ': "' + eff + '"');
	}
	if (eff === "ghost") {
		this.alpha = 1 - Math.min(Math.max(+value || 0, 0), 100) / 100;
	} else {
		// Ad Hoc way of fixing color and saturation with the images
		if (eff === "color") {
			this.graphicsValues["saturation"] = this.hasSaturation ? this.graphicsValues["saturation"] : 100;
			this.graphicsValues["brightness"] = this.hasBrightness ? this.graphicsValues["brightness"] : 68;
		} else if (eff === "saturation") {
			this.hasSaturation = true;
		} else if (eff === "brightness") {
			this.hasBrightness = true;
		}
		this.graphicsValues[eff] = +value;
	}
	this.rerender();
};

SpriteMorph.prototype.applyGraphicsEffects = function (canvas) {
	// For every effect: apply transform of that effect(canvas, stored value)
	// Graphic effects from Scratch are heavily based on ScratchPlugin.c

	var ctx, imagedata, w, h;

	function transform_fisheye(imagedata, value) {
		var pixels, newImageData, newPixels, centerX, centerY, w, h, x, y, dx, dy, r, angle, srcX, srcY, i, srcI;

		w = imagedata.width;
		h = imagedata.height;
		pixels = imagedata.data;
		newImageData = ctx.createImageData(w, h);
		newPixels = newImageData.data;

		centerX = w / 2;
		centerY = h / 2;
		value = Math.max(0, (value + 100) / 100);
		for (y = 0; y < h; y++) {
			for (x = 0; x < w; x++) {
				dx = (x - centerX) / centerX;
				dy = (y - centerY) / centerY;
				r = Math.pow(Math.sqrt(dx * dx + dy * dy), value);
				if (r <= 1) {
					angle = Math.atan2(dy, dx);
					srcX = Math.floor(centerX + r * Math.cos(angle) * centerX);
					srcY = Math.floor(centerY + r * Math.sin(angle) * centerY);
				} else {
					srcX = x;
					srcY = y;
				}
				i = (y * w + x) * 4;
				srcI = (srcY * w + srcX) * 4;
				newPixels[i] = pixels[srcI];
				newPixels[i + 1] = pixels[srcI + 1];
				newPixels[i + 2] = pixels[srcI + 2];
				newPixels[i + 3] = pixels[srcI + 3];
			}
		}
		return newImageData;
	}

	function transform_whirl(imagedata, value) {
		var pixels,
			newImageData,
			newPixels,
			w,
			h,
			centerX,
			centerY,
			x,
			y,
			radius,
			scaleX,
			scaleY,
			whirlRadians,
			radiusSquared,
			dx,
			dy,
			d,
			factor,
			angle,
			srcX,
			srcY,
			i,
			srcI,
			sina,
			cosa;

		w = imagedata.width;
		h = imagedata.height;
		pixels = imagedata.data;
		newImageData = ctx.createImageData(w, h);
		newPixels = newImageData.data;

		centerX = w / 2;
		centerY = h / 2;
		radius = Math.min(centerX, centerY);
		if (w < h) {
			scaleX = h / w;
			scaleY = 1;
		} else {
			scaleX = 1;
			scaleY = w / h;
		}
		whirlRadians = -radians(value);
		radiusSquared = radius * radius;
		for (y = 0; y < h; y++) {
			for (x = 0; x < w; x++) {
				dx = scaleX * (x - centerX);
				dy = scaleY * (y - centerY);
				d = dx * dx + dy * dy;
				if (d < radiusSquared) {
					factor = 1 - Math.sqrt(d) / radius;
					angle = whirlRadians * (factor * factor);
					sina = Math.sin(angle);
					cosa = Math.cos(angle);
					srcX = Math.floor((cosa * dx - sina * dy) / scaleX + centerX);
					srcY = Math.floor((sina * dx + cosa * dy) / scaleY + centerY);
				} else {
					srcX = x;
					srcY = y;
				}
				i = (y * w + x) * 4;
				srcI = (srcY * w + srcX) * 4;
				newPixels[i] = pixels[srcI];
				newPixels[i + 1] = pixels[srcI + 1];
				newPixels[i + 2] = pixels[srcI + 2];
				newPixels[i + 3] = pixels[srcI + 3];
			}
		}
		return newImageData;
	}

	function transform_pixelate(imagedata, value) {
		var pixels, newImageData, newPixels, w, h, x, y, srcX, srcY, i, srcI;

		w = imagedata.width;
		h = imagedata.height;
		pixels = imagedata.data;
		newImageData = ctx.createImageData(w, h);
		newPixels = newImageData.data;

		value = Math.floor(Math.abs(value / 10) + 1);
		for (y = 0; y < h; y++) {
			for (x = 0; x < w; x++) {
				srcX = Math.floor(x / value) * value;
				srcY = Math.floor(y / value) * value;
				i = (y * w + x) * 4;
				srcI = (srcY * w + srcX) * 4;
				newPixels[i] = pixels[srcI];
				newPixels[i + 1] = pixels[srcI + 1];
				newPixels[i + 2] = pixels[srcI + 2];
				newPixels[i + 3] = pixels[srcI + 3];
			}
		}
		return newImageData;
	}

	function transform_mosaic(imagedata, value) {
		var pixels, i, l, newImageData, newPixels, srcI;
		pixels = imagedata.data;
		newImageData = ctx.createImageData(imagedata.width, imagedata.height);
		newPixels = newImageData.data;

		value = Math.round((Math.abs(value) + 10) / 10);
		value = Math.max(0, Math.min(value, Math.min(imagedata.width, imagedata.height)));
		for (i = 0, l = pixels.length; i < l; i += 4) {
			srcI = (i * value) % l;
			newPixels[i] = pixels[srcI];
			newPixels[i + 1] = pixels[srcI + 1];
			newPixels[i + 2] = pixels[srcI + 2];
			newPixels[i + 3] = pixels[srcI + 3];
		}
		return newImageData;
	}

	function transform_duplicate(imagedata, value) {
		var pixels, i;
		pixels = imagedata.data;
		for (i = 0; i < pixels.length; i += 4) {
			pixels[i] = pixels[i * value];
			pixels[i + 1] = pixels[i * value + 1];
			pixels[i + 2] = pixels[i * value + 2];
			pixels[i + 3] = pixels[i * value + 3];
		}
		return imagedata;
	}

	function transform_colorDimensions(imagedata, hueShift, saturationShift, brightnessShift) {
		var pixels = imagedata.data,
			l = pixels.length,
			clr = new Color(),
			index,
			dim;

		// Allows for saturation and brightness to be natural 50 normal
		let sat = -100 + saturationShift * 2;
		let bri = -100 + brightnessShift * 2;

		for (index = 0; index < l; index += 4) {
			clr.r = pixels[index];
			clr.g = pixels[index + 1];
			clr.b = pixels[index + 2];

			dim = clr[SpriteMorph.prototype.penColorModel]();
			dim[0] = dim[0] * 100 + hueShift;
			if (dim[0] < 0 || dim[0] > 100) {
				// wrap the hue
				dim[0] = (dim[0] < 0 ? 100 : 0) + (dim[0] % 100);
			}
			// dim[0] = dim[0] / 100;
			// dim[1] = dim[1] + saturationShift / 100;
			// dim[2] = dim[2] + brightnessShift / 100;

			dim[0] = dim[0] / 100;
			dim[1] = dim[1] + sat / 100;
			dim[2] = dim[2] + bri / 100;

			clr["set_" + SpriteMorph.prototype.penColorModel].apply(clr, dim);
			pixels[index] = clr.r;
			pixels[index + 1] = clr.g;
			pixels[index + 2] = clr.b;
		}
		return imagedata;
	}

	function transform_negative(imagedata, value) {
		var pixels, i, l, rcom, gcom, bcom;
		pixels = imagedata.data;
		for (i = 0, l = pixels.length; i < l; i += 4) {
			rcom = 255 - pixels[i];
			gcom = 255 - pixels[i + 1];
			bcom = 255 - pixels[i + 2];

			if (pixels[i] < rcom) {
				//compare to the complement
				pixels[i] += value;
			} else if (pixels[i] > rcom) {
				pixels[i] -= value;
			}
			if (pixels[i + 1] < gcom) {
				pixels[i + 1] += value;
			} else if (pixels[i + 1] > gcom) {
				pixels[i + 1] -= value;
			}
			if (pixels[i + 2] < bcom) {
				pixels[i + 2] += value;
			} else if (pixels[i + 2] > bcom) {
				pixels[i + 2] -= value;
			}
		}
		return imagedata;
	}

	function transform_comic(imagedata, value) {
		var pixels, i, l;
		pixels = imagedata.data;
		for (i = 0, l = pixels.length; i < l; i += 4) {
			pixels[i] += Math.sin(i * value) * 127 + 128;
			pixels[i + 1] += Math.sin(i * value) * 127 + 128;
			pixels[i + 2] += Math.sin(i * value) * 127 + 128;
		}
		return imagedata;
	}

	function transform_confetti(imagedata, value) {
		var pixels, i, l;
		pixels = imagedata.data;
		for (i = 0, l = pixels.length; i < l; i += 1) {
			pixels[i] = Math.sin(value * pixels[i]) * 127 + pixels[i];
		}
		return imagedata;
	}

	if (this.graphicsChanged()) {
		w = Math.ceil(this.width());
		h = Math.ceil(this.height());
		if (!canvas.width || !canvas.height || !w || !h) {
			// too small to get image data, abort
			return canvas;
		}
		ctx = canvas.getContext("2d");
		imagedata = ctx.getImageData(0, 0, w, h);

		if (this.graphicsValues.fisheye) {
			imagedata = transform_fisheye(imagedata, this.graphicsValues.fisheye);
		}
		if (this.graphicsValues.whirl) {
			imagedata = transform_whirl(imagedata, this.graphicsValues.whirl);
		}
		if (this.graphicsValues.pixelate) {
			imagedata = transform_pixelate(imagedata, this.graphicsValues.pixelate);
		}
		if (this.graphicsValues.mosaic) {
			imagedata = transform_mosaic(imagedata, this.graphicsValues.mosaic);
		}
		if (this.graphicsValues.duplicate) {
			imagedata = transform_duplicate(imagedata, this.graphicsValues.duplicate);
		}
		if (this.graphicsValues.color || this.graphicsValues.saturation || this.graphicsValues.brightness) {
			imagedata = transform_colorDimensions(
				imagedata,
				this.graphicsValues.color,
				this.graphicsValues.saturation,
				this.graphicsValues.brightness
			);
		}
		if (this.graphicsValues.negative) {
			imagedata = transform_negative(imagedata, this.graphicsValues.negative);
		}
		if (this.graphicsValues.comic) {
			imagedata = transform_comic(imagedata, this.graphicsValues.comic);
		}
		if (this.graphicsValues.confetti) {
			imagedata = transform_confetti(imagedata, this.graphicsValues.confetti);
		}

		ctx.putImageData(imagedata, 0, 0);
	}

	return canvas;
};

SpriteMorph.prototype.isVariableNameInUse = function (vName, isGlobal) {
	if (isGlobal) {
		return contains(this.variables.allNames(), vName);
	}
	if (contains(this.variables.names(), vName)) {
		return true;
	}
	return contains(this.globalVariables().names(), vName);
};

SpriteMorph.prototype.clear = function () {
	this.parent.clearPenTrails();

	// CSDT Clear border list
	this.lineList = [];
	this.clearEffects();
	this.setVisibility(true);
	this.hasBorder = false;
	this.borderColor = new Color(255, 0, 0);
	this.borderSize = 0;

	if (this.isVariableNameInUse("base image size")) this.deleteVariable("base image size");
	if (this.isVariableNameInUse("style image size")) this.deleteVariable("style image size");
	if (this.isVariableNameInUse("stylization ratio")) this.deleteVariable("stylization ratio");
	if (this.isVariableNameInUse("conversion mode")) this.deleteVariable("conversion mode");
};

SpriteMorph.prototype.doSwitchToCostume = function (id, noShadow) {
	var w = 0,
		h = 0,
		stage;
	if (id instanceof List) {
		// try to turn a list of pixels into a costume
		if (id.quickShape().at(2) <= 4) {
			if (this.costume) {
				// recycle dimensions of current costume
				w = this.costume.width();
				h = this.costume.height();
			}
			if (w * h !== id.length()) {
				// assume stage's dimensions
				stage = this.parentThatIsA(StageMorph);
				w = stage.dimensions.x;
				h = stage.dimensions.y;
			}
		} // else try to interpret the pixels as matrix
		id = Process.prototype.reportNewCostume(id, w, h, this.newCostumeName(localize("snap")));
	}
	if (id instanceof Costume) {
		// allow first-class costumes
		this.wearCostume(id, noShadow);
		return;
	}
	if (id instanceof Array && id[0] === "current") {
		return;
	}

	var num,
		arr = this.costumes.asArray(),
		costume;
	if (contains([localize("Turtle"), localize("Empty")], id instanceof Array ? id[0] : null)) {
		costume = null;
	} else {
		if (id === -1) {
			this.doWearPreviousCostume();
			return;
		}
		costume = detect(arr, (cst) => snapEquals(cst.name, id));
		if (costume === null) {
			num = parseFloat(id);
			if (num === 0) {
				costume = null;
			} else {
				costume = arr[num - 1] || null;
			}
		}
	}
	this.wearCostume(costume, noShadow);
	this.clearEffects();
};

SpriteMorph.prototype.clearEffects = function () {
	var effect;
	for (effect in this.graphicsValues) {
		if (this.graphicsValues.hasOwnProperty(effect)) {
			this.setEffect([effect], 0);
		}
	}
	this.setEffect(["ghost"], 0);

	//Defaults for random color issue
	this.setEffect(["ghost"], 0);
	this.setVisibility(true);
	this.hasBrightness = false;
	this.hasSaturation = false;
	this.graphicsValues["saturation"] = 50;
	this.graphicsValues["brightness"] = 50;
};

SpriteMorph.prototype.doWearNextCostume = function () {
	if (this.colorShiftCostume) this.colorShiftCostume = null;
	var arr = this.costumes.asArray(),
		idx;
	if (arr.length > 1) {
		idx = arr.indexOf(this.costume);
		if (this.costume?.csdtColorIdx && this.costume?.csdtColorIdx >= 1) idx = this.costume.csdtColorIdx - 1;
		if (idx > -1) {
			idx += 1;
			if (idx > arr.length - 1) {
				idx = 0;
			}
			this.wearCostume(arr[idx]);
		}
	}
};
////////////////////////////////////////////////////////////////
//Blocks that you want to add to the list can be pushed to whatever category you want to add them to
////////////////////////////////////////////////////////////////
SpriteMorph.prototype.setBorderSize = function (size) {
	// pen size
	if (!isNaN(size)) {
		this.borderSize = Math.min(Math.max(+size, 0.0001), 1000);
		this.hasBorder = true;
	}
};

SpriteMorph.prototype.moveBy = function (delta, justMe) {
	// override the inherited default to make sure my parts follow
	// unless it's justMe (a correction)
	var start = this.isDown && !justMe && this.parent ? this.rotationCenter() : null;
	SpriteMorph.uber.moveBy.call(this, delta);
	if (start) {
		console.log(this.hasBorder);
		if (this.hasBorder) this.drawBorderedLine(start, this.rotationCenter());
		else this.drawLine(start, this.rotationCenter());
	}
	if (!justMe) {
		this.parts.forEach((part) => part.moveBy(delta));
		this.instances.forEach((instance) => {
			if (instance.cachedPropagation) {
				var inheritsX = instance.inheritsAttribute("x position"),
					inheritsY = instance.inheritsAttribute("y position");
				if (inheritsX && inheritsY) {
					instance.moveBy(delta);
				} else if (inheritsX) {
					instance.moveBy(new Point(delta.x, 0));
				} else if (inheritsY) {
					instance.moveBy(new Point(0, delta.y));
				}
			}
		});
	}
};

SpriteMorph.prototype.drawLine = function (start, dest, isBorder = false) {
	var stagePos = this.parent.bounds.origin,
		stageScale = this.parent.scale,
		context = this.parent.penTrails().getContext("2d"),
		from = start.subtract(stagePos).divideBy(stageScale),
		to = dest.subtract(stagePos).divideBy(stageScale),
		damagedFrom = from.multiplyBy(stageScale).add(stagePos),
		damagedTo = to.multiplyBy(stageScale).add(stagePos),
		damaged = damagedFrom
			.rectangle(damagedTo)
			.expandBy(Math.max((this.size * stageScale) / 2, 1))
			.intersect(this.parent.visibleBounds())
			.spread();

	if (this.isDown) {
		// record for later svg conversion
		if (StageMorph.prototype.enablePenLogging) {
			this.parent.trailsLog.push([
				this.snapPoint(start),
				this.snapPoint(dest),
				this.color.copy(),
				this.size,
				this.useFlatLineEnds ? "butt" : "round",
			]);
		}

		// draw on the pen-trails layer
		if (isBorder && this.borderSize > 0) {
			console.log("enters border drawing");
			context.lineWidth = this.size + this.borderSize;
			context.strokeStyle = this.borderColor.toString();
		} else {
			context.lineWidth = this.size;
			context.strokeStyle = this.color.toString();
		}
		if (this.useFlatLineEnds) {
			context.lineCap = "butt";
			context.lineJoin = "miter";
		} else {
			context.lineCap = "round";
			context.lineJoin = "round";
		}
		context.beginPath();
		context.moveTo(from.x, from.y);
		context.lineTo(to.x, to.y);
		context.stroke();
		if (this.isWarped === false) {
			this.world().broken.push(damaged);
		}
		this.parent.cachedPenTrailsMorph = null;
	}
};

////////////////////////////////////////////////////////////////
//Blocks that you want to add to the list can be pushed to whatever category you want to add them to
////////////////////////////////////////////////////////////////

// function checkForStyleTransferImage(type) {
// 	let img = document.querySelector(`#${type}-img`);
// 	if (img) return true;
// 	return false;
// }

// function getStyleTransferImage(type) {
// 	let image = document.querySelector(`#${type}-img`);
// 	if (image) return image;
// 	throw new Error(`You have not set a ${type} image yet`);
// }

// function createStyleTransferImage(payload) {
// 	// console.log(payload);
// 	let visualizer = document.getElementById("visualizer");
// 	let image = document.createElement("IMG");

// 	image.id = `${payload.type}-img`;
// 	image.src = payload.data;

// 	image.width = payload.width;
// 	image.height = payload.height;

// 	image.dataset.costume = payload.costume;

// 	visualizer.appendChild(image);
// }

// function createCanvasForStyleTransfer(src) {
// 	let canvas = document.createElement("canvas");
// 	let ctx = canvas.getContext("2d");
// 	canvas.width = 200;
// 	canvas.height = 200;
// 	let img = new Image();
// 	img.src = src;

// 	// get the scale
// 	var scale = Math.min(canvas.width / img.width, canvas.height / img.height);
// 	// get the top left position of the image
// 	var x = canvas.width / 2 - (img.width / 2) * scale;
// 	var y = canvas.height / 2 - (img.height / 2) * scale;
// 	ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
// 	return canvas;
// }

// function createStyleTransferPromptLabels(a, b, isWide = false) {
// 	let row = new AlignmentMorph("row", 4);
// 	let left = new AlignmentMorph("column", 2);
// 	let right = new AlignmentMorph("column", 2);

// 	left.alignment = "left";
// 	left.setColor(this.color);
// 	left.setWidth(isWide ? 365 : 165);
// 	left.setHeight(25);

// 	right.alignment = "left";
// 	right.setColor(this.color);
// 	right.setWidth(10);
// 	right.setHeight(25);

// 	left.add(a);
// 	right.add(b);
// 	row.add(left);
// 	row.add(right);

// 	return [left, right, row];
// }

// function isCanvasBlank(canvas) {
// 	return !canvas
// 		.getContext("2d")
// 		.getImageData(0, 0, canvas.width, canvas.height)
// 		.data.some((channel) => channel !== 0);
// }
// function handleGetParam(myself, param) {
// 	let ide = myself.parentThatIsA(IDE_Morph);

// 	try {
// 		return ide.getVar(param);
// 	} catch (e) {
// 		//variable doesn't exist, so create it:
// 		let pair = [param, true];

// 		if (myself.isVariableNameInUse(pair[0])) {
// 			myself.inform("that name is already in use");
// 		} else {
// 			myself.addVariable(pair[0], pair[1]);
// 			myself.parentThatIsA(IDE_Morph).refreshPalette();
// 		}
// 		return ide.getVar(param);
// 	}
// }

// function handleSetParam(myself, param, value) {
// 	let ide = myself.parentThatIsA(IDE_Morph);
// 	try {
// 		ide.setVar(param, value);
// 	} catch (e) {
// 		//variable doesn't exist, so create it:
// 		let pair = [param, true];

// 		if (myself.isVariableNameInUse(pair[0])) {
// 			myself.inform("that name is already in use");
// 		} else {
// 			myself.addVariable(pair[0], pair[1]);
// 			myself.parentThatIsA(IDE_Morph).refreshPalette();
// 		}

// 		ide.setVar(param, value);
// 	}
// }

// /**
//  * Creates the NST image by calling the NST library
//  *
//  * @param {bool} isAdvanced Is the conversion prompting the user for additional modifications? Or just using default values?
//  * @param {bool} isDownloadable Determines if the final product is downloaded to the user's device or not.
//  */

// SpriteMorph.prototype.createImageUsingStyleTransfer = function (isAdvanced, isDownloadable) {
// 	let ide = this.parentThatIsA(IDE_Morph);
// 	let baseImage, styleImage;
// 	this.clearConvertedStyleTransferImage();

// 	if (checkForStyleTransferImage("base") && checkForStyleTransferImage("style")) {
// 		baseImage = getStyleTransferImage("base");
// 		styleImage = getStyleTransferImage("style");

// 		if (isAdvanced) {
// 			ide.callStyleTransferPrompt([baseImage.src, styleImage.src], isDownloadable);
// 			return;
// 		}

// 		let checkForParams = (param) => {
// 			let value = 1.0;
// 			try {
// 				value = parseFloat(ide.getVar(param)) / 100.0;
// 			} catch (e) {
// 				value = 1.0;
// 			}
// 			return value;
// 		};

// 		let checkMode = () => {
// 			let value = "fast";
// 			try {
// 				value = ide.getVar("conversion mode");
// 			} catch (e) {
// 				value = "fast";
// 			}
// 			return value;
// 		};

// 		let mode = checkMode();

// 		let payload = {
// 			contentImage: baseImage.src,
// 			sourceImage: styleImage.src,
// 			styleModel: mode === "fast" ? "mobilenet" : "inception",
// 			transformModel: mode === "fast" ? "separable" : "original",
// 			styleRatio: checkForParams("stylization ratio"),
// 			contentSize: checkForParams("base image size"),
// 			sourceSize: checkForParams("style image size"),
// 			download: isDownloadable || false,
// 		};

// 		window.application.generateStylizedImage(payload);
// 		return;
// 	}
// 	if (!checkForStyleTransferImage("base")) throw new Error("You need to set a base image before creating.");
// 	if (!checkForStyleTransferImage("style")) throw new Error("You need to set a style image before creating.");
// };

// /**
//  * Since by default, NST images aren't saved to the project (space reasons), this switches the current
//  * costume to the created NST image if one exists.
//  */
// SpriteMorph.prototype.switchToASTCostume = function () {
// 	if (isCanvasBlank(document.querySelector("#style-canvas"))) return;

// 	let image = document.querySelector("#style-canvas");
// 	let cos = new Costume(image, "processed");

// 	this.parentThatIsA(IDE_Morph).currentSprite.wearCostume(cos);
// };

// /**
//  * Creates specific variables that allows the user to programmatically set various properties for NST
//  *
//  * @param {option} param Which parameter (base size, style size, style ratio) to set
//  * @param {float} value The value to set
//  */
// SpriteMorph.prototype.setStyleTransferParameter = function (param, value) {
// 	if (param == "" || value == "") return;
// 	handleSetParam(this, param, value);
// };

// /**
//  * Like the setStyleTransferParameter function, sets mode specifically
//  * @param {option} value Which mode to set the NST to (fast and meh quality, or high quality and slow)
//  */
// SpriteMorph.prototype.setStyleTransferMode = function (value) {
// 	if (value == "") return;
// 	handleSetParam(this, "conversion mode", value);
// };

// /**
//  * Get's the value of the style transfer mode variables
//  *
//  * @param {option} param Which value are you trying to get (base / style size, style ratio)
//  * @returns Value of specified param
//  */
// SpriteMorph.prototype.getStyleTransferParameter = function (param) {
// 	if (param == "") return;
// 	return handleGetParam(this, param);
// };

// /**
//  * Get's the value of the style transfer mode
//  *
//  * @returns Value of the current mode
//  */
// SpriteMorph.prototype.getStyleTransferMode = function () {
// 	return handleGetParam(this, "conversion mode");
// };

// /**
//  * Uses an available costume on the project as part of the NST conversion
//  *
//  * @param {option} name Name of the costume, pulled from the list of costumes currently on project
//  * @param {option} type Which image are you setting? Base or Style
//  */
// SpriteMorph.prototype.useCostumeForStyleTransferImage = function (name, type) {
// 	if (type == "") return;
// 	this.clearStyleTransferImage(type);

// 	let cst;
// 	let isCostumeNumber = Process.prototype.reportIsA(name, "number");

// 	if (isCostumeNumber) cst = this.costumes.asArray()[name - 1];
// 	else cst = detect(this.costumes.asArray(), (cost) => cost.name === name);

// 	if (cst == undefined) throw new Error("Costume does not exist");
// 	let payload = {
// 		data: cst.contents.toDataURL(),
// 		type: type,
// 		width: cst.contents.width,
// 		height: cst.contents.height,
// 		costume: name,
// 	};

// 	createStyleTransferImage(payload);
// };

// /**
//  * Uses what is currently stamped on the stage as part of the NST conversion
//  *
//  * @param {option} type Which image are you setting? Base or Style
//  */
// SpriteMorph.prototype.useStageForStyleTransferImage = function (type) {
// 	if (type == "") return;
// 	this.clearStyleTransferImage(type);

// 	let ide = this.parentThatIsA(IDE_Morph);

// 	// let finalImg = document.createElement("IMG");
// 	// let visualizer = document.getElementById("visualizer");
// 	// let stage = ide.stage.fullImage().toDataURL();

// 	// finalImg.id = `${type}-img`;
// 	// finalImg.src = data;

// 	// finalImg.style.width = "auto";
// 	// finalImg.style.height = "auto";
// 	// visualizer.appendChild(finalImg);

// 	let payload = {
// 		data: ide.stage.fullImage().toDataURL(),
// 		type: type,
// 		width: ide.stage.dimensions.x,
// 		height: ide.stage.dimensions.y,
// 		costume: "",
// 	};

// 	createStyleTransferImage(payload);
// };

// /**
//  * Clears an already set base or style image from the NST
//  *
//  * @param {option} type Which image (base or style) are you trying to clear?
//  */
// SpriteMorph.prototype.clearStyleTransferImage = function (type) {
// 	let vis = document.querySelector("#visualizer");
// 	let target = document.querySelector(`#${type}-img`);

// 	if (target) vis.removeChild(target);
// };

// /**
//  * Clears the generated NST image
//  */
// SpriteMorph.prototype.clearConvertedStyleTransferImage = function () {
// 	let target = document.querySelector("#converted-image");

// 	if (target.src) target.removeAttribute("src");
// };

// /**
//  * Checks to see if a base or style image has been set
//  *
//  * @param {option} type Which image (base or style) to verify its existence
//  * @returns boolean if the selected image is set or not
//  */
// SpriteMorph.prototype.checkIfImageWasGenerated = function (type) {
// 	return document.querySelector(`#${type}-img`) != null;
// };

// /**
//  * Checks if the NST image is finished and ready to be used
//  * @returns boolean if NST image is ready
//  */
// SpriteMorph.prototype.checkIfImageWasConverted = function () {
// 	return document.querySelector(`#converted-image`).src != "";
// };

// /**
//  * Allows the user to save the NST image as a costume, rather than just wearing it.
//  */
// SpriteMorph.prototype.saveStyleTransferImageAsCostume = function () {
// 	if (!document.querySelector("#style-canvas")) return;

// 	let image = document.querySelector("#style-canvas");

// 	let cos = new Costume(image, "ast_" + Date.now().toString());

// 	let ide = this.parentThatIsA(IDE_Morph);
// 	ide.currentSprite.addCostume(cos);
// 	ide.currentSprite.wearCostume(cos);
// };

// /**
//  * Displays error if an image is too large. Pretty much just a user error message if something breaks.
//  */
// SpriteMorph.prototype.sizeErrorHandlingAST = function () {
// 	new DialogBoxMorph().inform(
// 		"AI Image Sizing",
// 		"One of your images is too big. Max size is 1080p. Please try again with smaller images.",
// 		this.world()
// 	);
// };

// /**
//  * Programmatically toggle the loading bar for NST software
//  *
//  * @param {boolean} bool Determines if the custom loading bar should be displayed
//  */
// SpriteMorph.prototype.toggleASTProgress = function (bool) {
// 	let progress = document.querySelector("#vis-progress");
// 	if (bool) {
// 		progress.style.display = "inline-flex";
// 		progress.hidden = !bool;
// 	} else {
// 		progress.style.display = "none";
// 		progress.hidden = bool;
// 	}
// };

////////////////////////////////////////////////////////////////
//Legacy Blocks
////////////////////////////////////////////////////////////////

// SpriteMorph.prototype.changeCostumeShade = function (num) {
// 	return function (num) {
// 		num = (num * 255) / 100;
// 		var flipBackX = false,
// 			flipBackY = false,
// 			costume = this.costumes.contents[this.getCostumeIdx() - 1];
// 		if (this.flippedY) {
// 			this.flipYAxis();
// 			flipBackY = true;
// 		}
// 		if (this.flippedX) {
// 			this.flipXAxis();
// 			flipBackX = true;
// 		}
// 		if (!costume.originalPixels) {
// 			costume.originalPixels = costume.contents
// 				.getContext("2d")
// 				.getImageData(0, 0, costume.contents.width, costume.contents.height);
// 		}
// 		if (!costume.costumeColor) {
// 			costume.costumeColor = new Color(0, 0, 0);
// 		}
// 		var temp = costume.contents.getContext("2d").getImageData(0, 0, costume.contents.width, costume.contents.height);
// 		for (var I = 0, L = temp.data.length; I < L; I += 4) {
// 			if (temp.data[I + 3] > 0) {
// 				// If it's not a transparent pixel
// 				temp.data[I] = (temp.data[I] / 255) * num;
// 				temp.data[I + 1] = (temp.data[I + 1] / 255) * num;
// 				temp.data[I + 2] = (temp.data[I + 2] / 255) * num;
// 			}
// 		}
// 		costume.contents.getContext("2d").putImageData(temp, 0, 0);
// 		this.costumes.contents[this.getCostumeIdx() - 1] = costume;
// 		if (flipBackY) {
// 			this.flipYAxis();
// 		}
// 		if (flipBackX) {
// 			this.flipXAxis();
// 		}
// 		this.changed();
// 		this.drawNew();
// 	};
// };

// (function () {
// 	return function (num) {
// 	num = num*255/100;
// 	var flipBackX = false, flipBackY = false, costume = this.costumes.contents[this.getCostumeIdx()-1];
// 	if(this.flippedY)
// 	{
// 		this.flipYAxis();
// 		flipBackY = true;
// 	}
// 	if(this.flippedX)
// 	{
// 		this.flipXAxis();
// 		flipBackX = true;
// 	}
// 	if(costume.colored)
// 	{
// 		if(!this.costumes.contents[this.getCostumeIdx()-1].costumeColor) {
// 			 this.costumes.contents[this.getCostumeIdx()-1].costumeColor = new Color(0,0,0);
// 		}
// 		var hsv = this.costumes.contents[this.getCostumeIdx()-1].costumeColor.hsv();
// 		hsv[1] = 1;
// 		hsv[2] = Math.max(Math.min(+num || 0, 100), 0) / 100;
// 		this.costumes.contents[this.getCostumeIdx()-1].costumeColor.set_hsv.apply(this.costumes.contents[this.getCostumeIdx()-1].costumeColor, hsv);
// 		this.costumes.contents[this.getCostumeIdx()-1].setColor(this.costumes.contents[this.getCostumeIdx()-1].costumeColor);
// 	}
// 	else{
// 		if(!costume.originalPixels) {
// 			costume.originalPixels = costume.contents.getContext('2d')
// 			   .getImageData(0, 0, costume.contents.width,
// 				  costume.contents.height);
// 		 }
// 		 if(!costume.costumeColor) {
// 			 costume.costumeColor = new Color(0,0,0);
// 		 }
// 		var temp = costume.contents.getContext('2d')
// 			   .getImageData(0, 0, costume.contents.width,
// 				  costume.contents.height);
// 		 for(var I = 0, L = costume.originalPixels.data.length; I < L; I += 4){
// 			if(temp.data[I + 3] > 0){
// 			   // If it's not a transparent pixel
// 			   temp.data[I] = costume.originalPixels.data[I] / 255 * num;
// 			   temp.data[I + 1] = costume.originalPixels.data[I + 1] / 255 * num;
// 			   temp.data[I + 2] = costume.originalPixels.data[I + 2] / 255 * num;
// 			}
// 		 }
// 		 costume.contents.getContext('2d')
// 			.putImageData(temp, 0, 0);
// 		this.costumes.contents[this.getCostumeIdx()-1] = costume;
// 	}
// 	if(flipBackY)
// 	{
// 		this.flipYAxis();
// 	}
// 	if(flipBackX)
// 	{
// 		this.flipXAxis();
// 	}
//     this.changed();
//     this.drawNew();
// 	};
// }());

// //# sourceURL=setCostumeShade.js
