// Register all the NST extension primitives
SnapExtensions.primitives.set("nst_create_image(isAdvanced, isDownloadable)", function (isAdvanced, isDownloadable) {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	sprite.createImageUsingStyleTransfer(isAdvanced, isDownloadable);
});

SnapExtensions.primitives.set("nst_set_parameter(param, value)", function (param, value) {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	sprite.setStyleTransferParameter(param, value);
});

SnapExtensions.primitives.set("nst_get_parameter(param)", function (param) {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return 0;
	}
	return sprite.getStyleTransferParameter(param);
});

SnapExtensions.primitives.set("nst_use_costume(name, type)", function (name, type) {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	sprite.useCostumeForStyleTransferImage(name, type);
});

SnapExtensions.primitives.set("nst_use_stage(type)", function (type) {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	sprite.useStageForStyleTransferImage(type);
});

SnapExtensions.primitives.set("nst_check_image_generated(type)", function (type) {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return false;
	}
	return sprite.checkIfImageWasGenerated(type);
});

SnapExtensions.primitives.set("nst_switch_to_result()", function () {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	sprite.switchToASTCostume();
});

SnapExtensions.primitives.set("nst_save_as_costume()", function () {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	sprite.saveStyleTransferImageAsCostume();
});

SnapExtensions.primitives.set("nst_clear_image(type)", function (type) {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	sprite.clearStyleTransferImage(type);
});

SnapExtensions.primitives.set("nst_clear_converted_image()", function () {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	sprite.clearConvertedStyleTransferImage();
});

SnapExtensions.primitives.set("nst_set_mode(value)", function (value) {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	sprite.setStyleTransferMode(value);
});

SnapExtensions.primitives.set("nst_get_mode()", function () {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	return sprite.getStyleTransferMode();
});

SnapExtensions.primitives.set("nst_check_image_converted()", function () {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return false;
	}
	return sprite.checkIfImageWasConverted();
});

//

SnapExtensions.primitives.set("nst_turn_on_progress()", function (bool) {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	sprite.toggleASTProgress(true);
});

SnapExtensions.primitives.set("nst_turn_off_progress()", function (bool) {
	var sprite = this.parentThatIsA(SpriteMorph);
	if (!sprite) {
		return;
	}
	sprite.toggleASTProgress(false);
});
