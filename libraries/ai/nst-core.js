function checkForStyleTransferImage(type) {
	let img = document.querySelector(`#${type}-img`);
	if (img) return true;
	return false;
}

function getStyleTransferImage(type) {
	let image = document.querySelector(`#${type}-img`);
	if (image) return image;
	throw new Error(`You have not set a ${type} image yet`);
}

function createStyleTransferImage(payload) {
	// console.log(payload);
	let visualizer = document.getElementById("visualizer");
	let image = document.createElement("IMG");

	image.id = `${payload.type}-img`;
	image.src = payload.data;

	image.width = payload.width;
	image.height = payload.height;

	image.dataset.costume = payload.costume;

	visualizer.appendChild(image);
}

function createCanvasForStyleTransfer(src) {
	let canvas = document.createElement("canvas");
	let ctx = canvas.getContext("2d");
	canvas.width = 200;
	canvas.height = 200;
	let img = new Image();
	img.src = src;

	// get the scale
	var scale = Math.min(canvas.width / img.width, canvas.height / img.height);
	// get the top left position of the image
	var x = canvas.width / 2 - (img.width / 2) * scale;
	var y = canvas.height / 2 - (img.height / 2) * scale;
	ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
	return canvas;
}

function createStyleTransferPromptLabels(a, b, isWide = false) {
	let row = new AlignmentMorph("row", 4);
	let left = new AlignmentMorph("column", 2);
	let right = new AlignmentMorph("column", 2);

	left.alignment = "left";
	left.setColor(this.color);
	left.setWidth(isWide ? 365 : 165);
	left.setHeight(25);

	right.alignment = "left";
	right.setColor(this.color);
	right.setWidth(10);
	right.setHeight(25);

	left.add(a);
	right.add(b);
	row.add(left);
	row.add(right);

	return [left, right, row];
}

function isCanvasBlank(canvas) {
	return !canvas
		.getContext("2d")
		.getImageData(0, 0, canvas.width, canvas.height)
		.data.some((channel) => channel !== 0);
}
function handleGetParam(myself, param) {
	let ide = myself.parentThatIsA(IDE_Morph);

	try {
		return ide.getVar(param);
	} catch (e) {
		//variable doesn't exist, so create it:
		let pair = [param, true];

		if (myself.isVariableNameInUse(pair[0])) {
			myself.inform("that name is already in use");
		} else {
			myself.addVariable(pair[0], pair[1]);
			myself.parentThatIsA(IDE_Morph).refreshPalette();
		}
		return ide.getVar(param);
	}
}

function handleSetParam(myself, param, value) {
	let ide = myself.parentThatIsA(IDE_Morph);
	try {
		ide.setVar(param, value);
	} catch (e) {
		//variable doesn't exist, so create it:
		let pair = [param, true];

		if (myself.isVariableNameInUse(pair[0])) {
			myself.inform("that name is already in use");
		} else {
			myself.addVariable(pair[0], pair[1]);
			myself.parentThatIsA(IDE_Morph).refreshPalette();
		}

		ide.setVar(param, value);
	}
}

/**
 * Creates the NST image by calling the NST library
 *
 * @param {bool} isAdvanced Is the conversion prompting the user for additional modifications? Or just using default values?
 * @param {bool} isDownloadable Determines if the final product is downloaded to the user's device or not.
 */

SpriteMorph.prototype.createImageUsingStyleTransfer = function (isAdvanced, isDownloadable) {
	let ide = this.parentThatIsA(IDE_Morph);
	let baseImage, styleImage;
	this.clearConvertedStyleTransferImage();

	if (checkForStyleTransferImage("base") && checkForStyleTransferImage("style")) {
		baseImage = getStyleTransferImage("base");
		styleImage = getStyleTransferImage("style");

		if (isAdvanced) {
			ide.callStyleTransferPrompt([baseImage.src, styleImage.src], isDownloadable);
			return;
		}

		let checkForParams = (param) => {
			let value = 1.0;
			try {
				value = parseFloat(ide.getVar(param)) / 100.0;
			} catch (e) {
				value = 1.0;
			}
			return value;
		};

		let checkMode = () => {
			let value = "fast";
			try {
				value = ide.getVar("conversion mode");
			} catch (e) {
				value = "fast";
			}
			return value;
		};

		let mode = checkMode();

		let payload = {
			contentImage: baseImage.src,
			sourceImage: styleImage.src,
			styleModel: mode === "fast" ? "mobilenet" : "inception",
			transformModel: mode === "fast" ? "separable" : "original",
			styleRatio: checkForParams("stylization ratio"),
			contentSize: checkForParams("base image size"),
			sourceSize: checkForParams("style image size"),
			download: isDownloadable || false,
		};

		window.application.generateStylizedImage(payload);
		return;
	}
	if (!checkForStyleTransferImage("base")) throw new Error("You need to set a base image before creating.");
	if (!checkForStyleTransferImage("style")) throw new Error("You need to set a style image before creating.");
};

/**
 * Since by default, NST images aren't saved to the project (space reasons), this switches the current
 * costume to the created NST image if one exists.
 */
SpriteMorph.prototype.switchToASTCostume = function () {
	if (isCanvasBlank(document.querySelector("#style-canvas"))) return;

	let image = document.querySelector("#style-canvas");
	let cos = new Costume(image, "processed");

	this.parentThatIsA(IDE_Morph).currentSprite.wearCostume(cos);
};

/**
 * Creates specific variables that allows the user to programmatically set various properties for NST
 *
 * @param {option} param Which parameter (base size, style size, style ratio) to set
 * @param {float} value The value to set
 */
SpriteMorph.prototype.setStyleTransferParameter = function (param, value) {
	if (param == "" || value == "") return;
	handleSetParam(this, param, value);
};

/**
 * Like the setStyleTransferParameter function, sets mode specifically
 * @param {option} value Which mode to set the NST to (fast and meh quality, or high quality and slow)
 */
SpriteMorph.prototype.setStyleTransferMode = function (value) {
	if (value == "") return;
	handleSetParam(this, "conversion mode", value);
};

/**
 * Get's the value of the style transfer mode variables
 *
 * @param {option} param Which value are you trying to get (base / style size, style ratio)
 * @returns Value of specified param
 */
SpriteMorph.prototype.getStyleTransferParameter = function (param) {
	if (param == "") return;
	return handleGetParam(this, param);
};

/**
 * Get's the value of the style transfer mode
 *
 * @returns Value of the current mode
 */
SpriteMorph.prototype.getStyleTransferMode = function () {
	return handleGetParam(this, "conversion mode");
};

/**
 * Uses an available costume on the project as part of the NST conversion
 *
 * @param {option} name Name of the costume, pulled from the list of costumes currently on project
 * @param {option} type Which image are you setting? Base or Style
 */
SpriteMorph.prototype.useCostumeForStyleTransferImage = function (name, type) {
	if (type == "") return;
	this.clearStyleTransferImage(type);

	let cst;
	let isCostumeNumber = Process.prototype.reportIsA(name, "number");

	if (isCostumeNumber) cst = this.costumes.asArray()[name - 1];
	else cst = detect(this.costumes.asArray(), (cost) => cost.name === name);

	if (cst == undefined) throw new Error("Costume does not exist");
	let payload = {
		data: cst.contents.toDataURL(),
		type: type,
		width: cst.contents.width,
		height: cst.contents.height,
		costume: name,
	};

	createStyleTransferImage(payload);
};

/**
 * Uses what is currently stamped on the stage as part of the NST conversion
 *
 * @param {option} type Which image are you setting? Base or Style
 */
SpriteMorph.prototype.useStageForStyleTransferImage = function (type) {
	if (type == "") return;
	this.clearStyleTransferImage(type);

	let ide = this.parentThatIsA(IDE_Morph);

	// let finalImg = document.createElement("IMG");
	// let visualizer = document.getElementById("visualizer");
	// let stage = ide.stage.fullImage().toDataURL();

	// finalImg.id = `${type}-img`;
	// finalImg.src = data;

	// finalImg.style.width = "auto";
	// finalImg.style.height = "auto";
	// visualizer.appendChild(finalImg);

	let payload = {
		data: ide.stage.fullImage().toDataURL(),
		type: type,
		width: ide.stage.dimensions.x,
		height: ide.stage.dimensions.y,
		costume: "",
	};

	createStyleTransferImage(payload);
};

/**
 * Clears an already set base or style image from the NST
 *
 * @param {option} type Which image (base or style) are you trying to clear?
 */
SpriteMorph.prototype.clearStyleTransferImage = function (type) {
	let vis = document.querySelector("#visualizer");
	let target = document.querySelector(`#${type}-img`);

	if (target) vis.removeChild(target);
};

/**
 * Clears the generated NST image
 */
SpriteMorph.prototype.clearConvertedStyleTransferImage = function () {
	let target = document.querySelector("#converted-image");

	if (target.src) target.removeAttribute("src");
};

/**
 * Checks to see if a base or style image has been set
 *
 * @param {option} type Which image (base or style) to verify its existence
 * @returns boolean if the selected image is set or not
 */
SpriteMorph.prototype.checkIfImageWasGenerated = function (type) {
	return document.querySelector(`#${type}-img`) != null;
};

/**
 * Checks if the NST image is finished and ready to be used
 * @returns boolean if NST image is ready
 */
SpriteMorph.prototype.checkIfImageWasConverted = function () {
	return document.querySelector(`#converted-image`).src != "";
};

/**
 * Allows the user to save the NST image as a costume, rather than just wearing it.
 */
SpriteMorph.prototype.saveStyleTransferImageAsCostume = function () {
	if (!document.querySelector("#style-canvas")) return;

	let image = document.querySelector("#style-canvas");

	let cos = new Costume(image, "ast_" + Date.now().toString());

	let ide = this.parentThatIsA(IDE_Morph);
	ide.currentSprite.addCostume(cos);
	ide.currentSprite.wearCostume(cos);
};

/**
 * Displays error if an image is too large. Pretty much just a user error message if something breaks.
 */
SpriteMorph.prototype.sizeErrorHandlingAST = function () {
	new DialogBoxMorph().inform(
		"AI Image Sizing",
		"One of your images is too big. Max size is 1080p. Please try again with smaller images.",
		this.world()
	);
};

/**
 * Programmatically toggle the loading bar for NST software
 *
 * @param {boolean} bool Determines if the custom loading bar should be displayed
 */
SpriteMorph.prototype.toggleASTProgress = function (bool) {
	let progress = document.querySelector("#vis-progress");
	if (bool) {
		progress.style.display = "inline-flex";
		progress.hidden = !bool;
	} else {
		progress.style.display = "none";
		progress.hidden = bool;
	}
};
