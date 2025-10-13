// Tutorial CSDT
StageMorph.prototype.tutorial = false;
StageMorph.prototype.hideCostumesTab = false;
StageMorph.prototype.hideSoundsTab = false;
StageMorph.prototype.decategorize = false;
StageMorph.prototype.changeBlocks = false;
StageMorph.prototype.enableGlide = false;
StageMorph.prototype.basicLayout = false;

// IDE_Morph.prototype.testTutorialLayout = function () {
// 	// StageMorph.prototype.tutorial = !StageMorph.prototype.tutorial;
// 	this.createControlBar();
// 	this.createCategories();
// 	this.createPalette();
// 	// this.createStage();
// 	this.createSpriteBar();
// 	this.createSpriteEditor();
// 	this.createCorralBar();
// 	this.createCorral();

// 	this.fixLayout();

// 	return this.stage.tutorial;
// };

// IDE_Morph.prototype.setCostumeTabVisibility = function (bool) {
// 	StageMorph.prototype.showCostumesTab = bool;
// };

// IDE_Morph.prototype.setCategoriesVisibility = function (bool) {
// 	// if (bool) this.categories.hide();
// 	// else this.categories.show();
// 	// // StageMorph.prototype.decategorize = bool;
// };

// IDE_Morph.prototype.setBasicWorkbookLayout = function (bool) {
// 	StageMorph.prototype.basicLayout = bool;
// };

// IDE_Morph.prototype.renderTutorialLayout = function () {
// 	this.createControlBar();
// 	this.createCategories();
// 	this.createPalette();
// 	// this.createStage();
// 	this.createSpriteBar();
// 	this.createSpriteEditor();
// 	this.createCorralBar();
// 	this.createCorral();

// 	this.fixLayout();

// 	if (StageMorph.prototype.basicLayout || StageMorph.prototype.decategorize) this.toggleStageSize(true);
// };

// IDE_Morph.prototype.getCurrentScript = function () {};

// IDE_Morph.prototype.hideTutorialBlock = function (selector) {
// 	StageMorph.prototype.hiddenPrimitives[selector] = true;

// 	this.flushBlocksCache();
// 	this.refreshPalette();
// 	this.categories.refreshEmpty();
// };

// IDE_Morph.prototype.showTutorialBlock = function (selector) {
// 	delete StageMorph.prototype.hiddenPrimitives[selector];

// 	this.flushBlocksCache();
// 	this.refreshPalette();
// 	this.categories.refreshEmpty();
// };
// IDE_Morph.prototype.toggleSinglePalette = function () {
// 	this.toggleUnifiedPalette();
// 	this.refreshPalette();
// };

// IDE_Morph.prototype.enableSinglePaletteCategories = function () {
// 	// if (!this.scene.unifiedPalette) return;
// 	// if (this.scene.showCategories) return;
// 	// this.toggleCategoryNames(true);
// 	// this.recordUnsavedChanges();
// 	// this.refreshPalette();
// };
// IDE_Morph.prototype.disableSinglePaletteCategories = function () {
// 	// if (!this.scene.unifiedPalette) return;
// 	// if (!this.scene.showCategories) return;
// 	// this.toggleCategoryNames(false);
// 	// this.recordUnsavedChanges();
// 	// this.refreshPalette();
// };

// IDE_Morph.prototype.enableSinglePaletteButtons = function () {
// 	if (!this.scene.unifiedPalette) return;
// 	if (this.scene.showPaletteButtons) return;
// 	this.togglePaletteButtons(true);
// 	this.recordUnsavedChanges();
// 	this.refreshPalette();
// };

// IDE_Morph.prototype.toggleCorralBar = function (forceValue = null) {
// 	if (forceValue) IDE_Morph.prototype.hideCorralBar = forceValue;
// 	else IDE_Morph.prototype.hideCorralBar = !IDE_Morph.prototype.hideCorralBar;
// 	this.createCorralBar();
// 	this.fixLayout();
// };

// IDE_Morph.prototype.toggleSpriteBar = function (forceValue = null) {
// 	if (forceValue) {
// 		IDE_Morph.prototype.hideSpriteBar = forceValue;
// 	} else {
// 		IDE_Morph.prototype.hideSpriteBar = !IDE_Morph.prototype.hideSpriteBar;
// 	}

// 	this.createSpriteBar();
// 	this.fixLayout();
// };

// IDE_Morph.prototype.enableTutorialTabs = function () {
// 	if (!StageMorph.prototype.hideSoundsTab && !StageMorph.prototype.hideSoundsTab) return;

// 	StageMorph.prototype.hideSoundsTab = false;
// 	StageMorph.prototype.hideCostumesTab = false;

// 	this.createSpriteBar();
// 	this.fixLayout();
// };

// IDE_Morph.prototype.toggleTabs = function (forceValue = null) {
// 	if (forceValue) {
// 		StageMorph.prototype.hideSoundsTab = forceValue;
// 		StageMorph.prototype.hideCostumesTab = forceValue;
// 	} else {
// 		StageMorph.prototype.hideSoundsTab = !StageMorph.prototype.hideSoundsTab;
// 		StageMorph.prototype.hideCostumesTab = !StageMorph.prototype.hideCostumesTab;
// 	}

// 	this.createSpriteBar();
// 	this.fixLayout();
// };

// IDE_Morph.prototype.fetchBlockList = function () {
// 	return Object.keys(this.stage.children[0].blocks);
// };

// IDE_Morph.prototype.loadWorkbookFile = function (xml) {
// 	this.setBasicWorkbookLayout(true);
// 	this.initialScaleSize = 0.6;
// 	IDE_Morph.prototype.isSmallStage = true;
// 	// this.renderBlocks = false;
// 	ScriptsMorph.prototype.enableKeyboard = false;

// 	this.droppedText(xml);
// 	// this.toggleStageSize();
// 	// this.renderTutorialLayout();
// };

// IDE_Morph.prototype.loadCustomXML = function (xml) {
// 	// this.setBasicWorkbookLayout(true);
// 	this.initialScaleSize = 0.6;
// 	IDE_Morph.prototype.isSmallStage = true;
// 	// this.renderBlocks = false;
// 	// ScriptsMorph.prototype.enableKeyboard = false;

// 	this.droppedText(xml);
// 	// this.toggleStageSize();
// 	// this.renderTutorialLayout();
// };

// // TODO Newest version of snap hides blocks by a select menu, not a show/hide primitive toggle. So hide and show primitive functions are useless now..
// IDE_Morph.prototype.hideBlocks = function (tutBlocks) {
// 	let currentBlocks = this.palette.contents.children;

// 	let hiddenBlocks = currentBlocks.filter((block) => tutBlocks.includes(block.selector));
// 	hiddenBlocks.map((block) => block.hidePrimitive());
// 	setTimeout(function () {
// 		hiddenBlocks.map((block) => block.showPrimitive());
// 		console.log(StageMorph.prototype.hiddenPrimitives);
// 	}, 3000);
// };

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

// IDE_Morph.prototype.backup = function (callback) {
// 	// in case of unsaved changes let the user confirm whether to
// 	// abort the operation or go ahead with it.
// 	// Save the current project for the currently logged in user
// 	// to localstorage, then perform the given callback, e.g.
// 	// load a new project.
// 	if (this.hasUnsavedEdits() && this.disableBackup) {
// 		this.confirm("Replace the current project with a new one?", "Unsaved Changes!", () => this.backupAndDo(callback));
// 	} else {
// 		callback();
// 	}
// };

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

// Include Three.js and STLExporter
// <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/STLExporter.js"></script>

// function imageToSTL(imageFile, options = {}) {
//     const {
//         maxHeight = 10,        // Maximum extrusion height
//         width = 100,          // Width of the generated mesh
//         height = 100,         // Height of the generated mesh
//         filename = 'image.stl' // Output filename
//     } = options;

//     return new Promise((resolve, reject) => {
//         const img = new Image();
//         img.onload = function() {
//             try {
//                 // Create canvas to process image
//                 const canvas = document.createElement('canvas');
//                 const ctx = canvas.getContext('2d');
//                 canvas.width = width;
//                 canvas.height = height;

//                 // Draw and scale image to desired size
//                 ctx.drawImage(img, 0, 0, width, height);

//                 // Get image data
//                 const imageData = ctx.getImageData(0, 0, width, height);
//                 const pixels = imageData.data;

//                 // Create geometry with subdivisions
//                 const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);

//                 // Process each pixel to create height map
//                 for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
//                     // Convert to grayscale
//                     const r = pixels[i];
//                     const g = pixels[i + 1];
//                     const b = pixels[i + 2];
//                     const grayscale = (r + g + b) / 3;

//                     // Map grayscale to height (0-255 -> 0-maxHeight)
//                     const heightValue = (grayscale / 255) * maxHeight;

//                     // Set Z coordinate (height)
//                     geometry.vertices[j].z = heightValue;
//                 }

//                 // Update geometry
//                 geometry.verticesNeedUpdate = true;
//                 geometry.computeFaceNormals();

//                 // Export to STL
//                 const exporter = new THREE.STLExporter();
//                 const stlString = exporter.parse(geometry);

//                 // Create and download file
//                 const blob = new Blob([stlString], { type: 'text/plain' });
//                 const url = URL.createObjectURL(blob);
//                 const link = document.createElement('a');
//                 link.href = url;
//                 link.download = filename;
//                 link.click();
//                 URL.revokeObjectURL(url);

//                 resolve(stlString);
//             } catch (error) {
//                 reject(error);
//             }
//         };

//         img.onerror = () => reject(new Error('Failed to load image'));
//         img.src = URL.createObjectURL(imageFile);
//     });
// }

// // Usage example
// document.getElementById('fileInput').addEventListener('change', function(e) {
//     const file = e.target.files[0];
//     if (file) {
//         imageToSTL(file, {
//             maxHeight: 15,
//             width: 200,
//             height: 200,
//             filename: 'my_image.stl'
//         }).then(() => {
//             console.log('STL file generated successfully!');
//         }).catch(error => {
//             console.error('Error generating STL:', error);
//         });
//     }
// });

// IDE_Morph.prototype.exportAsSTL = function(imageFile, options = {}) {
//     const defaultOptions = {
//         maxHeight: 10,
//         width: 200,
//         height: 200,
//         filename: 'image_export.stl'
//     };

//     const finalOptions = Object.assign(defaultOptions, options);

//     return imageToSTL(imageFile, finalOptions);
// };

//////Verified //////

IDE_Morph.prototype.initTutorial = function () {
	this.hideSoundsTab = false;
	this.hideCostumesTab = false;
	this.hideCategories = false;

	StageMorph.prototype.tutorial = true;
};

IDE_Morph.prototype.enableSinglePalette = function () {
	this.hideCategories = true;
	this.categories.hide();
	this.setUnifiedPalette(true);
	this.recordUnsavedChanges();
	this.refreshPalette();
};

IDE_Morph.prototype.disableSinglePalette = function () {
	this.hideCategories = false;
	this.categories.show();
	this.setUnifiedPalette(false);
	this.recordUnsavedChanges();
	this.refreshPalette();
	this.fixLayout();
};

IDE_Morph.prototype.disableTutorialTabs = function () {
	this.hideSoundsTab = true;
	this.hideCostumesTab = true;

	this.createSpriteBar();
	this.fixLayout();
};

IDE_Morph.prototype.enableTutorialTabs = function () {
	this.hideSoundsTab = false;
	this.hideCostumesTab = false;

	this.createSpriteBar();
	this.fixLayout();
};

IDE_Morph.prototype.toggleControls = function (bool) {
	this.config.hideControls = bool;
	// this.createSpriteBar();
	this.applyPaneHidingConfigurations();
	this.fixLayout();
};

// Shows whitelisted blocks to the palette
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

IDE_Morph.prototype.loadTutorial = function (xml, changeBlocks, coreList, whitelist, callback = null) {
	let myself = this;

	this.initTutorial();

	this.disableBackup = changeBlocks;
	this.initialScaleSize = 0.7;
	this.openProjectString(xml, () => {
		myself.displayTutorialBlocks(coreList, whitelist);
		if (callback) callback();
	});
};

IDE_Morph.prototype.loadCustomXML = function (xml) {
	this.initialScaleSize = 0.6;
	this.isSmallStage = true;
	this.droppedText(xml);
};
