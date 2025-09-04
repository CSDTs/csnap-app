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

export { createStyleTransferImage, createCanvasForStyleTransfer, createStyleTransferPromptLabels };
