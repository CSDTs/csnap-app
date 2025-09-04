export function init(globals) {
	this.name = localize("Sprite");
	this.variables = new VariableFrame(globals || null, this);
	this.scripts = new ScriptsMorph();
	this.customBlocks = [];
	this.costumes = new List();
	this.costumes.type = "costume";
	this.costume = null;
	this.sounds = new List();
	this.sounds.type = "sound";
	this.normalExtent = new Point(60, 60); // only for costume-less situation
	this.scale = 1;
	this.rotationStyle = 1; // 1 = full, 2 = left/right, 0 = off
	this.instrument = null;
	this.version = Date.now(); // for observer optimization
	this.isTemporary = false; // indicate a temporary Scratch-style clone
	this.isCorpse = false; // indicate whether a sprite/clone has been deleted
	this.cloneOriginName = "";

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

	// volume and stereo-pan support, experimental:
	this.volume = 100;
	this.gainNode = null; // must be lazily initialized in Chrome, sigh...
	this.pan = 0;
	this.pannerNode = null; // must be lazily initialized in Chrome, sigh...

	// frequency player, experimental
	this.freqPlayer = null; // Note, to be lazily initialized

	// pen color dimensions support
	this.cachedColorDimensions = [0, 0, 0]; // not serialized

	// only temporarily for serialization
	this.inheritedMethodsCache = [];

	// sprite nesting properties
	this.parts = []; // not serialized, only anchor (name)
	this.anchor = null;
	this.nestingScale = 1;
	this.rotatesWithAnchor = true;
	this.layers = null; // cache for dragging nested sprites, don't serialize

	this.primitivesCache = {}; // not to be serialized (!)
	this.paletteCache = {}; // not to be serialized (!)
	this.categoriesCache = null; // not to be serialized (!)
	this.rotationOffset = ZERO; // not to be serialized (!)
	this.idx = 0; // not to be serialized (!) - used for de-serialization

	this.graphicsValues = {
		color: 0,
		fisheye: 0,
		whirl: 0,
		pixelate: 0,
		mosaic: 0,
		duplicate: 0,
		negative: 0,
		comic: 0,
		confetti: 0,
		saturation: 0,
		brightness: 0,
	};

	// sprite inheritance
	this.exemplar = null;
	this.instances = [];
	this.cachedPropagation = false; // not to be persisted
	this.inheritedAttributes = []; // 'x position', 'direction', 'size' etc...

	// video- and rendering state
	this.imageExtent = ZERO;
	this.imageOffset = ZERO;
	this.imageData = {}; // version: date, pixels: Uint32Array
	this.motionAmount = 0;
	this.motionDirection = 0;
	this.frameNumber = 0;

	SpriteMorph.uber.init.call(this);

	this.isCachingImage = true;
	this.isFreeForm = true;
	this.cachedColorDimensions = this.color[this.penColorModel]();
	this.isDraggable = true;
	this.isDown = false;
	this.heading = 90;
	this.fixLayout();
	this.rerender();
}
export function freshPalette(category) {
	// Quick fix for tutorials (showing custom pen blocks by default)
	if (StageMorph.prototype.decategorize) {
		category = "pen";
	}

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
					!["lists", "other"].includes(category) &&
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
		blocks.push(...this.customBlockTemplatesForCategory("other"));
	}

	//TODO: Need to figure out how to set all created blocks for StageMorph.prototype.decategorize
	//Somewhere here... this

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
			// Render blocks based on parent (tutorial)
			// if (stage.parent.renderBlocks) {
			//   palette.addContents(block);
			// }
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

export function shrinkToFit(extentPoint) {
	if (this.getNoFit()) return;
	if (extentPoint.x < this.width() || extentPoint.y < this.height()) {
		this.contents = this.thumbnail(extentPoint, null, true);
	}
}

export function getNoFit() {
	return this.noFit;
}
export let noFit = false;
