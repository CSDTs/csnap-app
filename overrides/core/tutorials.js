// Tutorial CSDT
StageMorph.prototype.tutorial = false;
StageMorph.prototype.hideCostumesTab = false;
StageMorph.prototype.hideSoundsTab = false;
StageMorph.prototype.decategorize = false;
StageMorph.prototype.changeBlocks = false;
StageMorph.prototype.enableGlide = false;
StageMorph.prototype.basicLayout = false;

IDE_Morph.prototype.testTutorialLayout = function () {
	// StageMorph.prototype.tutorial = !StageMorph.prototype.tutorial;
	this.createControlBar();
	this.createCategories();
	this.createPalette();
	// this.createStage();
	this.createSpriteBar();
	this.createSpriteEditor();
	this.createCorralBar();
	this.createCorral();

	this.fixLayout();

	return this.stage.tutorial;
};

IDE_Morph.prototype.setCostumeTabVisibility = function (bool) {
	StageMorph.prototype.showCostumesTab = bool;
};

IDE_Morph.prototype.setCategoriesVisibility = function (bool) {
	StageMorph.prototype.decategorize = bool;
};

IDE_Morph.prototype.setBasicWorkbookLayout = function (bool) {
	StageMorph.prototype.basicLayout = bool;
};

IDE_Morph.prototype.renderTutorialLayout = function () {
	this.createControlBar();
	this.createCategories();
	this.createPalette();
	// this.createStage();
	this.createSpriteBar();
	this.createSpriteEditor();
	this.createCorralBar();
	this.createCorral();

	this.fixLayout();

	if (StageMorph.prototype.basicLayout || StageMorph.prototype.decategorize) this.toggleStageSize(true);
};

IDE_Morph.prototype.getCurrentScript = function () {};

IDE_Morph.prototype.loadTutorial = function (xml, changeBlocks, coreList, whitelist, callback = null) {
	let myself = this;
	StageMorph.prototype.tutorial = true;
	this.disableBackup = changeBlocks;
	this.initialScaleSize = 0.7;
	this.openProjectString(xml, () => {
		// myself.displayTutorialBlocks(coreList, whitelist);
		if (callback) callback();
	});
};

IDE_Morph.prototype.displayTutorialBlocks = function (coreList, whitelist) {
	let myself = this;
	const current = coreList.map((block) => {
		return { selector: block, visible: whitelist.indexOf(block) >= 0 };
	});
	for (core of current) {
		if (core.visible) delete StageMorph.prototype.hiddenPrimitives[core.selector];
		else StageMorph.prototype.hiddenPrimitives[core.selector] = true;
	}
	myself.flushBlocksCache();
	myself.refreshPalette();
	myself.categories.refreshEmpty();
};

IDE_Morph.prototype.hideTutorialBlock = function (selector) {
	StageMorph.prototype.hiddenPrimitives[selector] = true;

	this.flushBlocksCache();
	this.refreshPalette();
	this.categories.refreshEmpty();
};

IDE_Morph.prototype.showTutorialBlock = function (selector) {
	delete StageMorph.prototype.hiddenPrimitives[selector];

	this.flushBlocksCache();
	this.refreshPalette();
	this.categories.refreshEmpty();
};
IDE_Morph.prototype.toggleSinglePalette = function () {
	this.toggleUnifiedPalette();
	this.refreshPalette();
};
IDE_Morph.prototype.enableSinglePalette = function () {
	if (this.scene.unifiedPalette) return;
	this.setUnifiedPalette(true);
	this.recordUnsavedChanges();
	this.refreshPalette();
};

IDE_Morph.prototype.disableSinglePalette = function () {
	if (!this.scene.unifiedPalette) return;
	this.setUnifiedPalette(false);
	this.recordUnsavedChanges();
	this.refreshPalette();
};

IDE_Morph.prototype.enableSinglePaletteCategories = function () {
	if (!this.scene.unifiedPalette) return;
	if (this.scene.showCategories) return;
	this.toggleCategoryNames(true);
	this.recordUnsavedChanges();
	this.refreshPalette();
};
IDE_Morph.prototype.disableSinglePaletteCategories = function () {
	if (!this.scene.unifiedPalette) return;
	if (!this.scene.showCategories) return;
	this.toggleCategoryNames(false);
	this.recordUnsavedChanges();
	this.refreshPalette();
};

IDE_Morph.prototype.enableSinglePaletteButtons = function () {
	if (!this.scene.unifiedPalette) return;
	if (this.scene.showPaletteButtons) return;
	this.togglePaletteButtons(true);
	this.recordUnsavedChanges();
	this.refreshPalette();
};
IDE_Morph.prototype.disableSinglePaletteButtons = function () {
	if (!this.scene.unifiedPalette) return;
	if (!this.scene.showPaletteButtons) return;
	this.togglePaletteButtons(false);
	this.recordUnsavedChanges();
	this.refreshPalette();
};

IDE_Morph.prototype.toggleCorralBar = function (forceValue = null) {
	if (forceValue) IDE_Morph.prototype.hideCorralBar = forceValue;
	else IDE_Morph.prototype.hideCorralBar = !IDE_Morph.prototype.hideCorralBar;
	this.createCorralBar();
	this.fixLayout();
};

IDE_Morph.prototype.toggleSpriteBar = function (forceValue = null) {
	if (forceValue) {
		IDE_Morph.prototype.hideSpriteBar = forceValue;
	} else {
		IDE_Morph.prototype.hideSpriteBar = !IDE_Morph.prototype.hideSpriteBar;
	}

	this.createSpriteBar();
	this.fixLayout();
};

IDE_Morph.prototype.disableTutorialTabs = function () {
	if (StageMorph.prototype.hideSoundsTab && StageMorph.prototype.hideSoundsTab) return;

	StageMorph.prototype.hideSoundsTab = true;
	StageMorph.prototype.hideCostumesTab = true;

	this.createSpriteBar();
	this.fixLayout();
};

IDE_Morph.prototype.enableTutorialTabs = function () {
	if (!StageMorph.prototype.hideSoundsTab && !StageMorph.prototype.hideSoundsTab) return;

	StageMorph.prototype.hideSoundsTab = false;
	StageMorph.prototype.hideCostumesTab = false;

	this.createSpriteBar();
	this.fixLayout();
};

IDE_Morph.prototype.toggleTabs = function (forceValue = null) {
	if (forceValue) {
		StageMorph.prototype.hideSoundsTab = forceValue;
		StageMorph.prototype.hideCostumesTab = forceValue;
	} else {
		StageMorph.prototype.hideSoundsTab = !StageMorph.prototype.hideSoundsTab;
		StageMorph.prototype.hideCostumesTab = !StageMorph.prototype.hideCostumesTab;
	}

	this.createSpriteBar();
	this.fixLayout();
};

IDE_Morph.prototype.fetchBlockList = function () {
	return Object.keys(this.stage.children[0].blocks);
};

IDE_Morph.prototype.loadWorkbookFile = function (xml) {
	this.setBasicWorkbookLayout(true);
	this.initialScaleSize = 0.6;
	IDE_Morph.prototype.isSmallStage = true;
	// this.renderBlocks = false;
	ScriptsMorph.prototype.enableKeyboard = false;

	this.droppedText(xml);
	// this.toggleStageSize();
	// this.renderTutorialLayout();
};

IDE_Morph.prototype.loadCustomXML = function (xml) {
	// this.setBasicWorkbookLayout(true);
	this.initialScaleSize = 0.6;
	IDE_Morph.prototype.isSmallStage = true;
	// this.renderBlocks = false;
	// ScriptsMorph.prototype.enableKeyboard = false;

	this.droppedText(xml);
	// this.toggleStageSize();
	// this.renderTutorialLayout();
};

// TODO Newest version of snap hides blocks by a select menu, not a show/hide primitive toggle. So hide and show primitive functions are useless now..
IDE_Morph.prototype.hideBlocks = function (tutBlocks) {
	let currentBlocks = this.palette.contents.children;

	let hiddenBlocks = currentBlocks.filter((block) => tutBlocks.includes(block.selector));
	hiddenBlocks.map((block) => block.hidePrimitive());
	setTimeout(function () {
		hiddenBlocks.map((block) => block.showPrimitive());
		console.log(StageMorph.prototype.hiddenPrimitives);
	}, 3000);
};

// IDE_Morph.prototype.backup = function (callback) {
//   // in case of unsaved changes let the user confirm whether to
//   // abort the operation or go ahead with it.
//   // Save the current project for the currently logged in user
//   // to localstorage, then perform the given callback, e.g.
//   // load a new project.

//   if (this.hasUnsavedEdits && this.disableBackup) {
//     this.confirm(
//       "Replace the current project with a new one?",
//       "Unsaved Changes!",
//       () => this.backupAndDo(callback)
//     );
//   } else {
//     callback();
//   }
// };

IDE_Morph.prototype.backup = function (callback) {
	// in case of unsaved changes let the user confirm whether to
	// abort the operation or go ahead with it.
	// Save the current project for the currently logged in user
	// to localstorage, then perform the given callback, e.g.
	// load a new project.
	if (this.hasUnsavedEdits() && this.disableBackup) {
		this.confirm("Replace the current project with a new one?", "Unsaved Changes!", () => this.backupAndDo(callback));
	} else {
		callback();
	}
};

// BlockMorph.prototype.showPrimitive = function () {
//   var ide = this.parentThatIsA(IDE_Morph),
//     dict,
//     cat;
//   if (!ide) {
//     return;
//   }
//   delete StageMorph.prototype.hiddenPrimitives[this.selector];
//   dict = {
//     doWarp: "control",
//     reifyScript: "operators",
//     reifyReporter: "operators",
//     reifyPredicate: "operators",
//     doDeclareVariables: "variables",
//   };
//   cat = dict[this.selector] || this.category;
//   if (cat === "lists") {
//     cat = "variables";
//   }
//   ide.flushBlocksCache(cat);
//   ide.refreshPalette();
// };
