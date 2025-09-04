//nst_basic.js

/**
 * This feature allows users to use TensorFlow to take one image (base) and apply
 * a transformation on it (using a style image) to make it look like the base was created
 * like the style.
 *
 * Author: Andrew Hunn (ahunn@umich.edu)
 *
 * Read up on Neural Style Transfers
 *
 * Relies on:
 * The lib folder created bt the aikr_image_stylization repository
 * A div in the snap.html file (#visualizer) for creating the images / canvas
 * Another div in the snap.html file (#vis-progress) that displays the custom progress bar
 * Styles.css file which literally is just the progress bar styles
 *
 * Repositories:
 * - aikr_image_stylization - https://github.com/CSDTs/aikr-image-stylization
 *
 * Note: Since CSnap handles renaming functions with migrations, and I'm lazy, Style Transfer and AST will
 * be mentioned a lot. It is the same as NST.
 */
import { checkForStyleTransferImage, getStyleTransferImage } from "./utils/checkDOM.js";
import { createCanvasForStyleTransfer, createStyleTransferImage } from "./utils/create.js";
import { handleGetParam, handleSetParam, isCanvasBlank } from "./utils/misc.js";

/**
 * Creates the NST image by calling the NST library
 *
 * @param {bool} isAdvanced Is the conversion prompting the user for additional modifications? Or just using default values?
 * @param {bool} isDownloadable Determines if the final product is downloaded to the user's device or not.
 */
function createImageUsingStyleTransfer(isAdvanced, isDownloadable) {
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
}

/**
 * Since by default, NST images aren't saved to the project (space reasons), this switches the current
 * costume to the created NST image if one exists.
 */
function switchToASTCostume() {
	if (isCanvasBlank(document.querySelector("#style-canvas"))) return;

	let image = document.querySelector("#style-canvas");
	let cos = new Costume(image, "processed");

	this.parentThatIsA(IDE_Morph).currentSprite.wearCostume(cos);
}

/**
 * Creates specific variables that allows the user to programmatically set various properties for NST
 *
 * @param {option} param Which parameter (base size, style size, style ratio) to set
 * @param {float} value The value to set
 */
function setStyleTransferParameter(param, value) {
	if (param == "" || value == "") return;
	handleSetParam(this, param, value);
}

/**
 * Like the setStyleTransferParameter function, sets mode specifically
 * @param {option} value Which mode to set the NST to (fast and meh quality, or high quality and slow)
 */
function setStyleTransferMode(value) {
	if (value == "") return;
	handleSetParam(this, "conversion mode", value);
}

/**
 * Get's the value of the style transfer mode variables
 *
 * @param {option} param Which value are you trying to get (base / style size, style ratio)
 * @returns Value of specified param
 */
function getStyleTransferParameter(param) {
	if (param == "") return;
	return handleGetParam(this, param);
}

/**
 * Get's the value of the style transfer mode
 *
 * @returns Value of the current mode
 */
function getStyleTransferMode() {
	return handleGetParam(this, "conversion mode");
}

/**
 * Uses an available costume on the project as part of the NST conversion
 *
 * @param {option} name Name of the costume, pulled from the list of costumes currently on project
 * @param {option} type Which image are you setting? Base or Style
 */
function useCostumeForStyleTransferImage(name, type) {
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
}

/**
 * Uses what is currently stamped on the stage as part of the NST conversion
 *
 * @param {option} type Which image are you setting? Base or Style
 */
function useStageForStyleTransferImage(type) {
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
}

/**
 * Clears an already set base or style image from the NST
 *
 * @param {option} type Which image (base or style) are you trying to clear?
 */
function clearStyleTransferImage(type) {
	let vis = document.querySelector("#visualizer");
	let target = document.querySelector(`#${type}-img`);

	if (target) vis.removeChild(target);
}

/**
 * Clears the generated NST image
 */
function clearConvertedStyleTransferImage() {
	let target = document.querySelector("#converted-image");

	if (target.src) target.removeAttribute("src");
}

/**
 * Checks to see if a base or style image has been set
 *
 * @param {option} type Which image (base or style) to verify its existence
 * @returns boolean if the selected image is set or not
 */
function checkIfImageWasGenerated(type) {
	return document.querySelector(`#${type}-img`) != null;
}

/**
 * Checks if the NST image is finished and ready to be used
 * @returns boolean if NST image is ready
 */
function checkIfImageWasConverted() {
	return document.querySelector(`#converted-image`).src != "";
}

/**
 * Allows the user to save the NST image as a costume, rather than just wearing it.
 */
function saveStyleTransferImageAsCostume() {
	if (!document.querySelector("#style-canvas")) return;

	let image = document.querySelector("#style-canvas");

	let cos = new Costume(image, "ast_" + Date.now().toString());

	let ide = this.parentThatIsA(IDE_Morph);
	ide.currentSprite.addCostume(cos);
	ide.currentSprite.wearCostume(cos);
}

/**
 * Displays error if an image is too large. Pretty much just a user error message if something breaks.
 */
function sizeErrorHandlingAST() {
	new DialogBoxMorph().inform(
		"AI Image Sizing",
		"One of your images is too big. Max size is 1080p. Please try again with smaller images.",
		this.world()
	);
}

/**
 * Programmatically toggle the loading bar for NST software
 *
 * @param {boolean} bool Determines if the custom loading bar should be displayed
 */
function toggleASTProgress(bool) {
	let progress = document.querySelector("#vis-progress");
	if (bool) {
		progress.style.display = "inline-flex";
		progress.hidden = !bool;
	} else {
		progress.style.display = "none";
		progress.hidden = bool;
	}
}

////////////////////////////////////////////////////////////////////////
//IDE_Morph and DialogBoxMorph

function callStyleTransferPrompt(payload, isDownloadable) {
	let myself = this;

	payload.push(createCanvasForStyleTransfer(payload[0]));
	payload.push(createCanvasForStyleTransfer(payload[1]));

	new DialogBoxMorph(null, (data) => {
		console.log(data);
	}).promptInputForStyleTransfer(
		"Stylize an Image Using AI",
		"style-transfer",
		null,
		null,
		null,
		null,
		null,
		world,
		null,
		isDownloadable,
		payload
	);
}

function promptInputForStyleTransfer(
	title,
	purpose,
	tosURL,
	tosLabel,
	prvURL,
	prvLabel,
	checkBoxLabel,
	world,
	pic,
	isDownloadable,
	data
) {
	var baseSizeSlider = new SliderMorph(50, 200, 100, 6, "horizontal"),
		styleSizeSlider = new SliderMorph(50, 200, 100, 6, "horizontal"),
		ratioSlider = new SliderMorph(1, 100, 100, 6, "horizontal"),
		baseCentLeft = new AlignmentMorph("column", 2),
		baseCentRight = new AlignmentMorph("column", 2),
		basePercentage = new AlignmentMorph("row", 4),
		styleCentLeft = new AlignmentMorph("column", 2),
		styleCentRight = new AlignmentMorph("column", 2),
		stylePercentage = new AlignmentMorph("row", 4),
		ratioColLeft = new AlignmentMorph("column", 2),
		ratioColRight = new AlignmentMorph("column", 2),
		ratioLabelRow = new AlignmentMorph("row", 4),
		baseLabelRow = new AlignmentMorph("row", 4),
		styleLabelRow = new AlignmentMorph("row", 4),
		creationLabelRow = new AlignmentMorph("row", 4),
		ratioPercentage = new AlignmentMorph("row", 4),
		instructions = new TextMorph("Apply a 'style' to your selected\ncontent image.\n", 12),
		inp = new AlignmentMorph("column", 2),
		lnk = new AlignmentMorph("row", 4),
		bdy = new AlignmentMorph("column", this.padding),
		myself = this;

	var baseColumn = new AlignmentMorph("column", 2),
		styleColumn = new AlignmentMorph("column", 2),
		conversionType = new InputFieldMorph(
			"fast", // text
			false, // numeric?
			{
				Fast: ["fast"],
				"High Quality": ["high quality"],
			},
			true // read-only
		);

	function labelText(string) {
		return new TextMorph(
			localize(string),
			10,
			null, // style
			false, // bold
			null, // italic
			null, // alignment
			null, // width
			null, // font name
			MorphicPreferences.isFlat ? null : new Point(1, 1),
			WHITE // shadowColor
		);
	}

	function modalButton(label, action) {
		var btn = new PushButtonMorph(myself, action || "ok", "  " + localize(label || "OK") + "  ");
		btn.fontSize = 10;
		btn.corner = myself.buttonCorner;
		btn.edge = myself.buttonEdge;
		btn.outline = null;
		btn.outlineColor = null;
		btn.outlineGradient = null;
		btn.padding = 0;
		btn.contrast = null;
		btn.fixLayout();
		return btn;
	}

	function addPicture(aMorphOrCanvas) {
		let morph = new Morph();
		morph.isCachingImage = true;
		morph.cachedImage = aMorphOrCanvas;

		morph.bounds.setWidth(200);
		morph.bounds.setHeight(200);

		return morph;
	}

	function createColumn(col, width) {
		col.alignment = "left";
		col.setColor(new Color(55, 55, 55));
		col.setWidth(width);
		col.setHeight(25);
	}

	function createLabelRow(labelA, labelB, left, right, row, parent) {
		left.add(labelA);
		right.add(labelB);
		row.add(left);
		row.add(right);
		parent.add(row);
	}

	function createHintRow(a, b, row, parent) {
		row.add(a);
		row.add(modalButton("?", b));
		parent.add(row);
	}

	let setSlider = (obj, width) => {
		obj.setWidth(width);
		obj.setHeight(20);
	};

	let getPicture = (type) => {
		let sprites = world.children[0].sprites.asArray()[0].costumes;
		let image = detect(
			sprites.asArray(),
			(cost) => cost.name === document.querySelector(`#${type}-img`).dataset.costume || ""
		);
		let preview = addPicture(image.contents);

		return preview;
	};

	this.explainBase = function () {
		new DialogBoxMorph().inform(
			"Base image size",
			"Insert def here" +
				".\n\nA bigger base image\nresults in a more detailed\noutput, but increases the\nprocessing time\nsignificantly.",
			world,
			null
		);
	};
	this.explainStyle = function () {
		new DialogBoxMorph().inform(
			"Style image size",
			"Insert def here" +
				".\n\nChanging the size of a style\nimage usually affects the\ntexture 'seen' by the\nnetwork.",
			world,
			null
		);
	};
	this.explainRatio = function () {
		new DialogBoxMorph().inform(
			"Stylization ratio",
			"Insert def here" +
				".\n\nThis parameter affects the\nstylization strength.The\nfurther to the right, the\nstronger the stylization. This\nis done via interpolation\nbetween the style vectors of\nthe base and style\nimages.",
			world,
			null
		);
	};
	this.explainConversion = function () {
		new DialogBoxMorph().inform(
			"Creation type",
			"Insert def here" +
				".\n\nFast uses smaller training models\nto produce an image\nquickly, while high quality uses\na larger training model\nat the cost of it being\nmore time consuming.",
			world,
			null
		);
	};

	inp.alignment = "left";
	inp.setColor(new Color(155, 155, 155));
	bdy.setColor(new Color(85, 85, 85));

	createColumn(baseCentLeft, 165);
	createColumn(baseCentRight, 10);

	createColumn(styleCentLeft, 165);
	createColumn(styleCentRight, 10);

	createColumn(ratioColLeft, 365);
	createColumn(ratioColRight, 10);

	setSlider(baseSizeSlider, 200);
	setSlider(styleSizeSlider, 200);
	setSlider(ratioSlider, 400);

	conversionType.setWidth(400);
	baseColumn.setWidth(225);
	styleColumn.setWidth(225);

	let bl = labelText("Base image size:");
	bl.setWidth(165);

	let sl = labelText("Style image size:");
	sl.setWidth(165);

	let rl = labelText("Stylization strength:");
	rl.setWidth(365);

	let cl = labelText("Creation type:");
	cl.setWidth(365);

	if (purpose === "style-transfer") {
		createHintRow(bl, "explainBase", baseLabelRow, baseColumn);
		baseColumn.add(baseSizeSlider);
		createLabelRow(labelText("50%"), labelText("200%"), baseCentLeft, baseCentRight, basePercentage, baseColumn);
		if (document.querySelector("#base-img").dataset.costume) baseColumn.add(getPicture("base"));

		createHintRow(sl, "explainStyle", styleLabelRow, styleColumn);
		styleColumn.add(styleSizeSlider);
		createLabelRow(labelText("50%"), labelText("200%"), styleCentLeft, styleCentRight, stylePercentage, styleColumn);
		if (document.querySelector("#style-img").dataset.costume) styleColumn.add(getPicture("style"));

		createHintRow(rl, "explainRatio", ratioLabelRow, inp);
		inp.add(ratioSlider);
		createLabelRow(labelText("1%"), labelText("100%"), ratioColLeft, ratioColRight, ratioPercentage, inp);

		createHintRow(cl, "explainConversion", creationLabelRow, inp);
		inp.add(conversionType);
	}

	lnk.add(baseColumn);
	lnk.add(styleColumn);

	bdy.add(instructions);
	bdy.add(lnk);
	bdy.add(inp);

	basePercentage.fixLayout();
	baseCentLeft.fixLayout();
	baseCentRight.fixLayout();

	stylePercentage.fixLayout();
	styleCentLeft.fixLayout();
	styleCentLeft.fixLayout();

	ratioPercentage.fixLayout();
	ratioColLeft.fixLayout();
	ratioColLeft.fixLayout();

	baseLabelRow.fixLayout();
	styleLabelRow.fixLayout();
	ratioLabelRow.fixLayout();

	creationLabelRow.fixLayout();

	inp.fixLayout();
	baseColumn.fixLayout();
	styleColumn.fixLayout();
	lnk.fixLayout();

	bdy.fixLayout();

	this.labelString = title;
	this.createLabel();
	this.addBody(bdy);

	this.addButton("ok", "Create Image");
	this.addButton("cancel", "Cancel");
	this.fixLayout();

	this.accept = function () {
		DialogBoxMorph.prototype.accept.call(myself);
	};

	this.getInput = function () {
		let payload = {
			contentImage: `${data[0]}`,
			sourceImage: `${data[1]}`,
			styleModel: conversionType.getValue() === "fast" ? "mobilenet" : "inception",
			transformModel: conversionType.getValue() === "fast" ? "separable" : "original",
			styleRatio: ratioSlider.value / 100.0,
			contentSize: baseSizeSlider.value / 100.0,
			sourceSize: styleSizeSlider.value / 100.0,
			download: isDownloadable || false,
		};

		window.application.generateStylizedImage(payload);
		return payload;
	};

	this.popUp(world);
}

////////////////////////////////////////////////////////////////////////
export default function enableNSTFeature(blocks, updateBlocks) {
	//Add to SpriteMorph so it can actually use the functions
	SpriteMorph.prototype.switchToASTCostume = switchToASTCostume;
	SpriteMorph.prototype.setStyleTransferParameter = setStyleTransferParameter;
	SpriteMorph.prototype.setStyleTransferMode = setStyleTransferMode;
	SpriteMorph.prototype.getStyleTransferParameter = getStyleTransferParameter;
	SpriteMorph.prototype.getStyleTransferMode = getStyleTransferMode;
	SpriteMorph.prototype.useCostumeForStyleTransferImage = useCostumeForStyleTransferImage;
	SpriteMorph.prototype.useStageForStyleTransferImage = useStageForStyleTransferImage;
	SpriteMorph.prototype.createImageUsingStyleTransfer = createImageUsingStyleTransfer;
	SpriteMorph.prototype.clearStyleTransferImage = clearStyleTransferImage;
	SpriteMorph.prototype.clearConvertedStyleTransferImage = clearConvertedStyleTransferImage;
	SpriteMorph.prototype.checkIfImageWasGenerated = checkIfImageWasGenerated;
	SpriteMorph.prototype.checkIfImageWasConverted = checkIfImageWasConverted;
	SpriteMorph.prototype.saveStyleTransferImageAsCostume = saveStyleTransferImageAsCostume;
	SpriteMorph.prototype.sizeErrorHandlingAST = sizeErrorHandlingAST;
	SpriteMorph.prototype.toggleASTProgress = toggleASTProgress;

	IDE_Morph.prototype.callStyleTransferPrompt = callStyleTransferPrompt;
	DialogBoxMorph.prototype.promptInputForStyleTransfer = promptInputForStyleTransfer;

	//Add to override module to it can be added to the list of blocks
	SpriteMorph.prototype.csdtOverrides = {
		...(SpriteMorph.prototype.csdtOverrides ?? {}),

		ai: [
			...(SpriteMorph.prototype.csdtOverrides?.ai ?? []),
			"createImageUsingStyleTransfer",
			"useCostumeForStyleTransferImage",
			"useStageForStyleTransferImage",
			"saveStyleTransferImageAsCostume",
			"switchToASTCostume",
			"clearStyleTransferImage",
			"clearConvertedStyleTransferImage",
			"setStyleTransferParameter",
			"setStyleTransferMode",
			"getStyleTransferParameter",
			"getStyleTransferMode",
			"checkIfImageWasGenerated",
			"checkIfImageWasConverted",
		],
	};

	//Add the blocks so CSnap knows what type of block it is and what params should it accept
	blocks = {
		...blocks,
		switchToASTCostume: {
			type: "command",
			category: "ai",
			spec: "switch to NST image",
		},
		getStyleTransferParameter: {
			type: "reporter",
			category: "ai",
			spec: "get NST %astp",
		},
		setStyleTransferParameter: {
			type: "command",
			category: "ai",
			spec: "set NST %astp to %n %",
		},
		setStyleTransferMode: {
			type: "command",
			category: "ai",
			spec: "set NST mode to %astm",
		},
		getStyleTransferMode: {
			type: "reporter",
			category: "ai",
			spec: "get NST mode",
		},
		useCostumeForStyleTransferImage: {
			type: "command",
			category: "ai",
			spec: "use costume %cst for %ast image",
		},
		useStageForStyleTransferImage: {
			type: "command",
			category: "ai",
			spec: "use stage for %ast image",
		},
		createImageUsingStyleTransfer: {
			type: "command",
			category: "ai",
			spec: "create image using NST - advanced? %b download? %b",
			defaults: [false, false],
		},
		clearStyleTransferImage: {
			type: "command",
			category: "ai",
			spec: "clear %ast image",
		},
		clearConvertedStyleTransferImage: {
			type: "command",
			category: "ai",
			spec: "clear NST created image",
		},
		checkIfImageWasGenerated: {
			type: "reporter",
			category: "ai",
			spec: "was %ast image set",
		},
		checkIfImageWasConverted: {
			type: "reporter",
			category: "ai",
			spec: "was NST image created",
		},
		saveStyleTransferImageAsCostume: {
			type: "command",
			category: "ai",
			spec: "save and switch to NST image",
		},
		sizeErrorHandlingAST: {
			type: "command",
			category: "ai",
			spec: "image sizing error",
		},
		toggleASTProgress: {
			type: "command",
			category: "ai",
			spec: "show progress bar - AI %b",
		},
	};

	updateBlocks(blocks);
}
