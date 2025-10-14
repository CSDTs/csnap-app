var moduleUrl = world.children[0].getVar("__module__beetle__"),
	baseUrl = moduleUrl.substring(0, moduleUrl.lastIndexOf("/") + 1);

function loadSrc(url) {
	var url = baseUrl + url;
	return new Promise((resolve, reject) => {
		if (contains(SnapExtensions.scripts, url)) {
			reject();
		}
		scriptElement = document.createElement("script");
		scriptElement.onload = () => {
			SnapExtensions.scripts.push(url);
			resolve();
		};
		document.head.appendChild(scriptElement);
		scriptElement.src = url;
	});
}

loadSrc("babylon.js")
	.then(() => loadSrc("babylonjs.loaders.min.js"))
	.then(() => loadSrc("babylon.gridMaterial.min.js"))
	.then(() => loadSrc("babylonjs.serializers.min.js"))
	.then(() => loadSrc("earcut.min.js"))
	.then(() => loadSrc("beetle.js"))
	.then(() => {
		// After beetle.js is fully loaded, trigger the stage replacement
		// This ensures all blocks are properly registered before replacement
		setTimeout(function () {
			var ide = world.children[0];
			if (ide && ide.stage && !(ide.stage instanceof BeetleStageMorph)) {
				// Step 1: Switch to 3D Beetle category to load the blocks
				ide.currentCategory = "3D Beetle";
				ide.refreshPalette(true);

				// Refresh category buttons to update their visual state
				if (ide.categories && ide.categories.buttons) {
					ide.categories.buttons.forEach(function (button) {
						button.refresh();
					});
				}

				// Step 2: Wait a moment for the blocks to be loaded, then replace the stage
				setTimeout(function () {
					// Replace the current stage with BeetleStageMorph
					var oldStage = ide.stage;
					var newStage = new BeetleStageMorph(oldStage.variables.globals);

					// Copy important properties from old stage
					newStage.name = oldStage.name;
					newStage.dimensions = oldStage.dimensions;
					newStage.color = oldStage.color;
					newStage.volume = oldStage.volume;
					newStage.pan = oldStage.pan;
					newStage.tempo = oldStage.tempo;
					newStage.isThreadSafe = oldStage.isThreadSafe;
					newStage.enablePenLogging = oldStage.enablePenLogging;
					newStage.enableCodeMapping = oldStage.enableCodeMapping;
					newStage.enableInheritance = oldStage.enableInheritance;
					newStage.enableSublistIDs = oldStage.enableSublistIDs;

					// Copy the global variables to maintain the variable frame hierarchy
					if (oldStage.variables && oldStage.variables.globals) {
						newStage.variables.globals = oldStage.variables.globals;
					}

					// Copy palette cache to preserve blocks that were already loaded
					if (oldStage.primitivesCache) {
						newStage.primitivesCache = oldStage.primitivesCache;
					}
					if (oldStage.paletteCache) {
						newStage.paletteCache = oldStage.paletteCache;
					}
					if (oldStage.categoriesCache) {
						newStage.categoriesCache = oldStage.categoriesCache;
					}

					// Copy sprites and their cache
					oldStage.children.forEach(function (sprite) {
						if (sprite instanceof SpriteMorph) {
							// Copy sprite cache before moving
							if (sprite.primitivesCache) {
								sprite.primitivesCache = sprite.primitivesCache;
							}
							if (sprite.paletteCache) {
								sprite.paletteCache = sprite.paletteCache;
							}
							if (sprite.categoriesCache) {
								sprite.categoriesCache = sprite.categoriesCache;
							}

							// Ensure sprite's variable frame points to the new stage's globals
							if (sprite.variables && newStage.variables && newStage.variables.globals) {
								sprite.variables.globals = newStage.variables.globals;
							}

							oldStage.removeChild(sprite);
							newStage.addChild(sprite);
						}
					});

					// Replace the stage in the IDE
					ide.stage = newStage;
					ide.removeChild(oldStage);
					ide.add(newStage);

					// Update corral
					if (ide.corral && ide.corral.stageIcon) {
						ide.corral.stageIcon.target = newStage;
					}

					// Update stage handle to follow the new stage
					if (ide.stageHandle) {
						ide.stageHandle.target = newStage;
					}

					// Refresh layout
					ide.fixLayout();

					// Start rendering
					newStage.beetleController.changed();
				}, 200); // Wait for blocks to be loaded
			}
		}, 100); // Small delay to ensure everything is ready
	});

// .then(() => loadSrc("anansebot.js"));
