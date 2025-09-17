IDE_Morph.prototype.callStyleTransferPrompt = function (payload, isDownloadable) {
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
};

DialogBoxMorph.prototype.promptInputForStyleTransfer = function (
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
};
