SnapExtensions.primitives.set("bb_anansetest(x,y,z)", function (x, y, z) {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}

	return console.log("anansebot", x, y, z);
	// return stage.beetleController.beetle.getRotation();
});

SnapExtensions.primitives.set("ananse_hide()", function () {
	var stage = this.parentThatIsA(StageMorph);
	if (!stage.beetleController) {
		return;
	}
	return stage.beetleController.beetle.hide();
});
