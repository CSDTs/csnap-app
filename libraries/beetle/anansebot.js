// Anansebot Extension
// This file demonstrates how to extend the beetle library with custom functionality
// for the anansebot character

// Example: Switch to anansebot model
SnapExtensions.primitives.set("bb_use_anansebot()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	// Switch to anansebot model
	// Note: You need to have anansebot-gray.obj, anansebot-color.obj, and anansebot-black.obj
	// in the meshes/ directory for this to work
	stage.beetleController.beetle.switchModel("anansebot");
});

// Example: Switch back to beetle model
SnapExtensions.primitives.set("bb_use_beetle()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	stage.beetleController.beetle.switchModel("beetle");
});

// Hide the beetle/anansebot
SnapExtensions.primitives.set("ananse_hide()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	return stage.beetleController.beetle.hide();
});
