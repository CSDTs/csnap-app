/**
 * blocks.js
 *
 * Author: Andrew Hunn
 *
 * Collection of blocks that can fit a variety of projects. Specific functionality should be separated out into a separate file for readability.
 */

modules.csdtBlocks = "2022-February-28";

export let categories = [
	"motion",
	"looks",
	"sound",
	"pen",
	"control",
	"sensing",
	"operators",
	"variables",
	"lists",
	"other",
	"ai",
];

export let blockColor = {
	motion: new Color(74, 108, 212),
	looks: new Color(143, 86, 227),
	sound: new Color(207, 74, 217),
	pen: new Color(0, 161, 120),
	control: new Color(230, 168, 34),
	sensing: new Color(4, 148, 220),
	operators: new Color(98, 194, 19),
	variables: new Color(243, 118, 29),
	lists: new Color(217, 77, 17),
	other: new Color(150, 150, 150),
	ai: new Color(100, 100, 100),
};
////////////////////////////////////////////////////////////////
// Special Block Syntax (SyntaxElementMorph)
// If you need to create a dropdown with specific values
////////////////////////////////////////////////////////////////
export let csdtSyntax = {
	"%drc": {
		type: "input",
		tags: "read-only static",
		menu: {
			"§_drc": null,
			width: ["width"],
			height: ["height"],
		},
	},
	"%ast": {
		type: "input",
		tags: "read-only static",
		menu: {
			"§_ast": null,
			base: ["base"],
			style: ["style"],
		},
	},
	"%astp": {
		type: "input",
		tags: "read-only static",
		menu: {
			"§_astp": null,
			"base image size": ["base image size"],
			"style image size": ["style image size"],
			"stylization ratio": ["stylization ratio"],
		},
	},
	"%astm": {
		type: "input",
		tags: "read-only static",
		menu: {
			"§_astm": null,
			fast: ["fast"],
			"high quality": ["high quality"],
		},
	},
	"%scft": {
		type: "input",
		tags: "read-only static",
		menu: {
			"§_scft": null,
			x_and_y: ["x_and_y"],
			x: ["x"],
			y: ["y"],
		},
	},
	"%penBorder": {
		type: "input",
		tags: "read-only static",
		menu: {
			active: ["active"],
			size: ["size"],
			hue: ["hue"],
		},
	},
};

////////////////////////////////////////////////////////////////
/**
 * Block Migrations and Additions
 * Migrations are older additions that were changed or updated (different function attached to block)
 * Blocks are part of the SpriteMorph object and the original code can be found in objects.js
 */

////////////////////////////////////////////////////////////////
export let csdtMigrations = {
	translate_percent: {
		selector: "translatePercent",
		offset: 0,
	},
	changeCostumeColor: {
		selector: "legacySetCostumeColor",
		// inputs: [["color"]],
		offset: 0,
	},
	setCostumeShade: {
		selector: "setEffect",
		inputs: [["brightness"]],
		offset: 1,
	},
	changeCostumeShade: {
		selector: "changeEffect",
		inputs: [["brightness"]],
		offset: 1,
	},
	setCostumeColor: {
		selector: "setEffect",
		inputs: [["color"]],
		offset: 1,
	},
	setCostumeOpacity: {
		selector: "setEffect",
		inputs: [["brightness"]],
		offset: 1,
	},
	changeCostumeOpacity: {
		selector: "setEffect",
		inputs: [["brightness"]],
		offset: 1,
	},
	flipXAxis: {
		selector: "reflectXAxis",
		offset: 1,
	},
	flipYAxis: {
		selector: "reflectYAxis",
		offset: 1,
	},
	penSize: {
		selector: "getPenAttribute",
		inputs: [["size"]],
		offset: 1,
	},
};

export let csdtBlocks = {
	translatePercent: {
		only: SpriteMorph,
		type: "command",
		category: "motion",
		spec: "translate by %n of %drc",
		defaults: [100, ["width"]],
	},
	flipVertical: {
		only: SpriteMorph,
		type: "command",
		category: "looks",
		spec: "flip vertical",
	},
	flipHorizontal: {
		only: SpriteMorph,
		type: "command",
		category: "looks",
		spec: "flip horizontal",
	},
	reflectXAxis: {
		only: SpriteMorph,
		type: "command",
		category: "looks",
		spec: "reflect across x axis",
	},
	reflectYAxis: {
		only: SpriteMorph,
		type: "command",
		category: "looks",
		spec: "reflect across y axis",
	},
	newSizeOfCurrent: {
		only: SpriteMorph,
		type: "command",
		category: "looks",
		spec: "scale by factor %n percent",
		defaults: [100],
	},
	pointAtAngle: {
		only: SpriteMorph,
		type: "command",
		category: "motion",
		spec: "point at angle %n",
		defaults: [0],
	},
	rotateByDegrees: {
		only: SpriteMorph,
		type: "command",
		category: "motion",
		spec: "rotate by %n degrees",
		defaults: [0],
	},
	getAngle: {
		only: SpriteMorph,
		type: "reporter",
		category: "motion",
		spec: "angle",
	},
	smoothBorders: {
		type: "command",
		category: "pen",
		spec: "fix borders",
	},
	flatLineEnds: {
		type: "command",
		category: "pen",
		spec: "flat line end? %b",
	},
	doSetScaleFactor: {
		only: SpriteMorph,
		type: "command",
		category: "looks",
		spec: "scale %scft by factor %n percent",
		defaults: [null, 100],
	},
	degreesToRadians: {
		only: SpriteMorph,
		type: "reporter",
		category: "other",
		spec: "degrees to radians %n",
		defaults: [0],
	},
	getBorderState: {
		only: SpriteMorph,
		type: "reporter",
		category: "pen",
		spec: "pen border",
	},
	setBorder: {
		type: "command",
		category: "pen",
		spec: "set pen border: size %n color %n",
		defaults: [0, 0],
	},
	setBorderHue: {
		type: "command",
		category: "pen",
		spec: "set pen border color: %n",
		defaults: [0],
	},
	setBorderShade: {
		type: "command",
		category: "pen",
		spec: "set pen border shade: %n",
		defaults: [0],
	},
	setBorderSize: {
		type: "command",
		category: "pen",
		spec: "set pen border size: %n ",
		defaults: [0],
	},
	borderPathLengthHelp: {
		type: "command",
		category: "pen",
		spec: "path length rotate length %n flip %b",
		defaults: [0, false],
	},
	getPenBorderAttribute: {
		type: "reporter",
		category: "pen",
		spec: "pen border %penBorder",
		defaults: [["size"]],
	},
	setEffect: {
		type: "command",
		category: "looks",
		spec: "set %eff effect to %n",
		defaults: [["color"], 0],
	},
	exportAsCSV: {
		type: "command",
		category: "variables",
		spec: "display %l and %l as a CSV",
	},
	changeEffect: {
		type: "command",
		category: "looks",
		spec: "change %eff effect by %n",
		defaults: [["color"], 25],
	},
	getEffect: {
		type: "reporter",
		category: "looks",
		spec: "%eff effect",
		defaults: [["color"]],
	},

	legacySetCostumeColor: {
		type: "command",
		category: "looks",
		spec: "(legacy) set costume color to %n ",
	},

	////////////////////////////////////////////////////////////////
};

// export let blockMigrations = {
// 	...SpriteMorph.prototype.blockMigrations,
// 	...csdtMigrations,
// };

// export let blocks = {
// 	...SpriteMorph.prototype.blocks,
// 	...csdtBlocks,
// };

////////////////////////////////////////////////////////////////
// New Block Definitions
////////////////////////////////////////////////////////////////

// Translate sprite by its width or height
export function translatePercent(percent, direction) {
	var width = 0,
		height = 0,
		newX = 0,
		newY = 0,
		dist = 0,
		angle = 0,
		X = 0,
		Y = 0;

	if (this.costume != null) {
		width = this.costume.contents.width * this.scale;
		height = this.costume.contents.height * this.scale;
	} else {
		width = 32 * this.scale;
		height = 20 * this.scale;
	}

	if (direction[0] === "height") {
		newY = this.yPosition() + (height * percent) / 100;
		dist = Math.sqrt(Math.pow(this.yPosition() - newY, 2));
		angle = this.heading * (Math.PI / 180);
	} else {
		newX = this.xPosition() + (width * percent) / 100;
		dist = Math.sqrt(Math.pow(this.xPosition() - newX, 2));
		angle = this.heading * (Math.PI / 180) + Math.PI / 2;
	}
	if (dist != 0) {
		X = (-percent / Math.abs(percent)) * dist * Math.cos(angle) + this.xPosition();
		Y = (percent / Math.abs(percent)) * dist * Math.sin(angle) + this.yPosition();
		this.gotoXY(X, Y);
		this.positionTalkBubble();
	}
}

// Scales the sprite based on its current size
export function newSizeOfCurrent(percent) {
	let val = this.getScale() * (percent / 100);
	this.setScale(val);
}

//Reports the current angle of the sprite
export function getAngle() {
	return 90 - this.direction();
}

// Reports the current border state
export function getBorderState() {
	return this.hasBorder;
}

// Sets the thickness and color of a pen border
export function setBorder(size, color) {
	if (size != 0) {
		this.hasBorder = true;
	} else {
		this.hasBorder = false;
	}
	this.borderSize = this.setBorderSize(size);
	this.borderColor = this.setBorderHue(color);
}

// Returns various attributes of a pen border
export function getPenBorderAttribute(attrib) {
	var name = attrib instanceof Array ? attrib[0] : attrib.toString(),
		options = ["active", "size", "hue"];
	if (name === "size") {
		return this.borderSize;
	} else if (name == "hue") {
		return this.borderColor;
	}
	return this.hasBorder;
}

// Hacky way to simulate border paths
export function borderPathLengthHelp(length, flip) {
	this.rotateByDegrees(flip ? 90 : -90);
	this.forward(length * (flip ? 0.5 : 1) + this.borderSize / (flip ? 2 : 1));
	this.rotateByDegrees(flip ? -90 : 90);
	this.down();
	this.forward(1);
	this.up();
	if (flip) {
		this.forward(-1);
	}
}
// Alternative to direction, rotates sprite to a specific angle
export function pointAtAngle(angle) {
	let val = 0 - angle + 90;
	this.setHeading(val);
}

// Rotates a sprite based on its current angle
export function rotateByDegrees(angle) {
	this.turnLeft(angle);
}

// Flips the sprite (lakota)
export function flip() {
	var cst;
	var xP = 100;
	var yP = -100;
	cst = this.costume;

	if (!isFinite(+xP * +yP) || isNaN(+xP * +yP)) {
		throw new Error("expecting a finite number\nbut getting Infinity or NaN");
	}

	// If the costume is a turtle, don't do this stretch...
	if (cst != null) {
		cst = cst.stretched(Math.round((cst.width() * +xP) / 100), Math.round((cst.height() * +yP) / 100));
	}

	this.doSwitchToCostume(cst);
}

// Reflect sprite across x axis
export function reflectXAxis() {
	this.flipVertical();
	this.gotoXY(this.xPosition(), this.yPosition() * -1);
}

// Reflect sprite across y axis
export function reflectYAxis() {
	this.flipHorizontal();
	this.gotoXY(this.xPosition() * -1, this.yPosition());
}

// Flips the sprite vertically (relative)
export function flipVertical() {
	// this.flip();
	// this.pointAtAngle((this.getAngle() * -1));
	var cst;
	var xP = 100;
	var yP = -100;
	cst = this.costume;

	if (!isFinite(+xP * +yP) || isNaN(+xP * +yP)) {
		throw new Error("expecting a finite number\nbut getting Infinity or NaN");
	}

	// If the costume is a turtle, don't do this stretch...
	if (cst != null) {
		cst = cst.stretched(Math.round((cst.width() * +xP) / 100), Math.round((cst.height() * +yP) / 100));
	}

	this.doSwitchToCostume(cst);
}

// Flips the sprite horizontally (relative)
export function flipHorizontal() {
	// this.flip();
	// this.pointAtAngle(180 - this.getAngle());
	var cst;
	var xP = -100;
	var yP = 100;
	cst = this.costume;

	if (!isFinite(+xP * +yP) || isNaN(+xP * +yP)) {
		throw new Error("expecting a finite number\nbut getting Infinity or NaN");
	}
	// If the costume is a turtle, don't do this stretch...
	if (cst != null) {
		cst = cst.stretched(Math.round((cst.width() * +xP) / 100), Math.round((cst.height() * +yP) / 100));
	}
	this.doSwitchToCostume(cst);
}

// Based on direction, scales the sprite (by its current size)
export function doSetScaleFactor(direction, percent) {
	var cst, xP, yP;
	cst = this.costume;

	if (direction[0] === "x") {
		xP = percent;
		yP = 100;
	} else if (direction[0] === "y") {
		xP = 100;
		yP = percent;
	} else if (direction[0] === "x_and_y") {
		xP = percent;
		yP = percent;
	} else {
		xP = percent;
		yP = percent;
	}

	if (!isFinite(+xP * +yP) || isNaN(+xP * +yP)) {
		throw new Error("expecting a finite number\nbut getting Infinity or NaN");
	}
	// If the costume is a turtle, don't do this stretch...
	if (cst != null) {
		cst = cst.stretched(Math.round((cst.width() * +xP) / 100), Math.round((cst.height() * +yP) / 100));
	}

	this.doSwitchToCostume(cst);
}

// Allows for flat ends
export function flatLineEnds(bool) {
	SpriteMorph.prototype.useFlatLineEnds = bool;
}

// Converts degrees to radians
export function degreesToRadians(degrees) {
	return (3.141592653589 * degrees) / 180;
}

////////////////////////////////////////////////////////////////
// Legacy Block Definitions
// TODO Need to add for backwards compatibility for older projects
// TODO Fractals, 3D stuff, bead loom (getCoordinateScale, setCoordinateScale), /
// TODO cont.  graffiti(getBorderShade, setBorderShade, changeBorderShade), Mixer, Quilting(exportAsCSV, printList), Rhythm Wheels, Sensing(parseString, getData), Skateboarding, Tutorial,
////////////////////////////////////////////////////////////////

export function legacySetCostumeColor(color) {
	let oldCostume, currentPix, newCostume;

	let currentIdx = this.getCostumeIdx();
	if (this.colorShiftCostume) currentIdx = this.colorShiftCostume;

	this.colorShiftCostume = currentIdx;

	if (this.costume?.csdtColorIdx) {
		this.doSwitchToCostume(this.costume.csdtColorIdx);
	}

	const convertColors = (pix, col) => {
		let costumeColor = new Color(255, 255, 255);
		let currentPixels = this.costume.contents
			.getContext("2d")
			.getImageData(0, 0, this.costume.contents.width, this.costume.contents.height);
		let originalPixels = this.costume.contents
			.getContext("2d")
			.getImageData(0, 0, this.costume.contents.width, this.costume.contents.height);

		let hsv = costumeColor.hsv();
		hsv[0] = Math.max(Math.min(+col || 0, 100), 0) / 100;
		hsv[1] = 1; // we gotta fix this at some time
		costumeColor.set_hsv.apply(costumeColor, hsv);

		for (var I = 0, L = originalPixels.data.length; I < L; I += 4) {
			if (currentPixels.data[I + 3] > 0) {
				// If it's not a transparent pixel
				currentPixels.data[I] = (originalPixels.data[I] / 255) * costumeColor.r;
				currentPixels.data[I + 1] = (originalPixels.data[I + 1] / 255) * costumeColor.g;
				currentPixels.data[I + 2] = (originalPixels.data[I + 2] / 255) * costumeColor.b;
			}
		}
		return currentPixels;
	};

	oldCostume = Process.prototype.reportNewCostume(
		this.costume.rasterized().pixels(),
		this.costume.width(),
		this.costume.height(),
		this.costume.name
	);

	currentPix = convertColors(oldCostume.rasterized().pixels(), color);

	newCostume = Process.prototype.reportNewCostume(
		oldCostume.rasterized().pixels(),
		this.costume.width(),
		this.costume.height(),
		this.costume.name
	);

	newCostume.contents.getContext("2d").putImageData(currentPix, 0, 0);

	this.clearEffects();

	this.doSwitchToCostume(newCostume);

	this.costume.csdtColorIdx = currentIdx;
}

export function smoothBorders(start, dest) {
	var tempSize = this.size,
		tempColor = this.color;

	for (let line = 0; line < this.lineList.length; line++) {
		this.size = this.lineList[line][2];
		this.color = this.lineList[line][3];
		this.drawLine(this.lineList[line][0], this.lineList[line][1], false);
	}

	this.size = tempSize;
	this.color = tempColor;
	this.lineList = [];
}

export function getBorderSize() {
	return this.borderSize;
}

export function changeHue(delta) {
	this.setHue(this.getHue() + (+delta || 0));
}

export function getBorderHue() {
	return this.borderColor;
}

export function setBorderHue(num) {
	var hsv = this.borderColor.hsv(),
		x = this.xPosition(),
		y = this.yPosition();

	hsv[0] = Math.max(Math.min(+num || 0, 100), 0) / 100;
	hsv[1] = 1; // we gotta fix this at some time
	this.borderColor.set_hsv.apply(this.borderColor, hsv);
	if (!this.costume) {
		this.drawNew();
		this.changed();
	}
	this.gotoXY(x, y);
}

export function getBorderShade() {
	return this.borderColor.hsv()[2] * 50 + (50 - this.borderColor.hsv()[1] * 50);
}

export function setBorderShade(num) {
	let myself = this;
	var hsv = this.borderColor.hsv(),
		x = this.xPosition(),
		y = this.yPosition();

	//Num goes in 0-100 range. 0 is black, 50 is the unchanged hue, 100 is white
	num = Math.max(Math.min(+num || 0, 100), 0) / 50;
	hsv[1] = 1;
	hsv[2] = 1;

	if (num > 1) {
		hsv[1] = 2 - num; //Make it more white
	} else {
		hsv[2] = num; //Make it more black
	}

	this.borderColor.set_hsv.apply(myself.borderColor, hsv);
	if (!this.costume) {
		this.drawNew();
		this.changed();
	}
	this.gotoXY(x, y);
}

export function changeBorderShade(delta) {
	return this.setBorderShade(this.getBorderShade() + (+delta || 0));
}

export function drawBorderedLine(start, dest) {
	//drawLine wrapper to draw line and border in one go
	this.drawLine(start, dest, true);
	this.drawLine(start, dest, false);

	if (this.isDown) {
		this.lineList[this.lineList.length] = [start, dest, this.size, this.color];
	}
}

export function exportAsCSV(radius_data, angle_data) {
	function roundFloat(val) {
		var rounded_val = Math.round(val * 10) / 10;
		return rounded_val;
	}

	function roundPoints() {
		for (var i = 0; i < radii.length; i++) {
			radii[i] = roundFloat(radii[i]);
			angles[i] = roundFloat(angles[i]) % 360;
		}
	}

	//opens a new window and writes data in CSV format.
	function writeToWindow(points) {
		var str = "";
		var ide = this.world.children[0];
		var radii = [];
		var angles = [];

		var keys = [];

		for (var key of points.keys()) {
			keys.push(key);
		}

		keys.sort(function (a, b) {
			return a - b;
		});

		for (var j = 0; j < keys.length; j++) {
			var values = points.get(keys[j]);
			for (var k = 0; k < values.length; k++) {
				radii.push(keys[j]);
				angles.push(values[k]);
			}
		}

		for (var i = 0; i < radii.length; i++) {
			str += radii[i] + "," + angles[i];
			if (i !== radii.length - 1) {
				str += "\n";
			}
		}
		ide.saveFileAs(str, "data:text/csv", ide.projectName + " csvData");
	}

	function orderRadially(radii, angles) {
		var ordered_points = new Map();
		var ordered_radii = [];
		var ordered_angles = [];
		//iterate through radii, populate map
		//sort map values (arrays of angles)
		//iterate through map in order (small to large radii) and output back to two arrays
		for (var i = 0; i < radii.length; i++) {
			var unordered_angles = [];
			if (ordered_points.has(radii[i])) {
				unordered_angles = ordered_points.get(radii[i]);
				unordered_angles.push(angles[i]);
			} else {
				ordered_points.set(radii[i], unordered_angles);
			}
		}

		return ordered_points;
	}

	//function create an array from a CSnap list object
	function makeArray(input_data) {
		var data_array = [];
		var data_string = input_data.asText(); //converts CSnap list object to a text string
		for (var i = 0; i < data_string.length; i++) {
			var val = "";
			while (data_string[i] !== "," && i < data_string.length) {
				//read through variable-length values until I hit a comma
				val += data_string[i];
				i++;
			}

			if (val !== "") {
				data_array.push(val);
			}
		}
		return data_array;
	}

	var radii = makeArray(radius_data);
	var angles = makeArray(angle_data);
	roundPoints();
	var points = orderRadially(radii, angles);
	writeToWindow(points);
}

//# sourceURL=exportAsCSV.js

////////////////////////////////////////////////////////////////
// Situational Block Definitions
// * Not really intended to be added to the list
////////////////////////////////////////////////////////////////
export function drawLogSpiral(c, endangle, getSize, penGrowth, isClockwise) {
	var xOrigin,
		yOrigin,
		startingDirection,
		beta,
		t,
		tinc,
		roffset,
		r,
		h,
		start,
		end,
		segments,
		startAngle,
		clockwise,
		size;
	this.down();
	segments = 5;

	if (isClockwise === null || typeof isClockwise === undefined) {
		clockwise = false;
	} else {
		clockwise = isClockwise;
	}

	if (clockwise) {
		if (endangle < 0) {
			startingDirection = 90 - this.direction() - endangle + degrees(Math.atan(1 / c)) - 180;
		} else {
			startingDirection = 90 - this.direction() + degrees(Math.atan(1 / c));
		}
	} else {
		if (endangle < 0) {
			startingDirection = 90 - this.direction() + endangle + (180 - degrees(Math.atan(1 / c)));
		} else {
			startingDirection = 90 - this.direction() - degrees(Math.atan(1 / c));
		}
	}

	size = 2 * (getSize / Math.exp(c * this.degreesToRadians(Math.abs(endangle))));
	roffset = size * Math.exp(c * this.degreesToRadians(0));

	if (endangle < 0) {
		start = Math.abs(endangle);
		end = 0;
		r = size * Math.exp(c * this.degreesToRadians(Math.abs(endangle)));
		if (clockwise) {
			xOrigin =
				this.xPosition() -
				(r * Math.cos(radians(startingDirection - start)) - roffset * Math.cos(radians(startingDirection)));
			yOrigin =
				this.yPosition() -
				(r * Math.sin(radians(startingDirection - start)) - roffset * Math.sin(radians(startingDirection)));
		} else {
			xOrigin =
				this.xPosition() -
				(r * Math.cos(radians(start + startingDirection)) - roffset * Math.cos(radians(startingDirection)));
			yOrigin =
				this.yPosition() -
				(r * Math.sin(radians(start + startingDirection)) - roffset * Math.sin(radians(startingDirection)));
		}
	} else {
		start = 0;
		end = endangle;
		xOrigin = this.xPosition();
		yOrigin = this.yPosition();
	}

	t = start;
	if (end > start) {
		tinc = 1;
	} else {
		tinc = -1;
	}

	let repeatCounter = Math.abs((end - start) / tinc) / segments;

	for (let i = 0; i < repeatCounter; i++) {
		//  Find way to do warp
		for (let j = 0; j < segments; j++) {
			r = size * Math.exp(c * this.degreesToRadians(t));
			if (!clockwise) {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			} else {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t * -1 + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			}
			t = t + tinc;
			this.changeSize(penGrowth);
			if (clockwise) {
				this.turn(tinc);
			} else {
				this.turnLeft(tinc);
			}
		}
	}

	let modCounter = Math.abs((end - start) / tinc) % segments;

	for (let k = 0; k < modCounter; k++) {
		r = size * Math.exp(c * this.degreesToRadians(t));
		if (!clockwise) {
			this.gotoXY(
				xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
				yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
			);
		} else {
			this.gotoXY(
				xOrigin + r * Math.cos(radians(t * -1 + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
				yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
			);
		}
		t = t + tinc;
		this.changeSize(penGrowth);
		if (clockwise) {
			this.turn(tinc);
		} else {
			this.turnLeft(tinc);
		}
	}

	this.up();
}

export function drawCircle(diameter, sweep) {
	var anglecount, stepinc, numbsides, cdirection;
	this.down();

	cdirection = 1;
	if (sweep < 0) {
		cdirection = -1;
	}

	sweep = Math.abs(sweep);
	anglecount = 0;
	stepinc = 1;
	numbsides = 3.141592653589 / Math.asin(stepinc / diameter);

	var i;

	while (360 / numbsides + anglecount <= sweep) {
		if (anglecount + 6 > sweep) {
			while (360 / numbsides + anglecount <= sweep) {
				this.turnLeft((360.0 * cdirection) / numbsides);
				this.forward(stepinc);
				anglecount = anglecount + 360 / numbsides;
			}
		} else {
			for (i = 0; i < 6; i++) {
				this.turnLeft((360 * cdirection) / numbsides);
				this.forward(stepinc);
				anglecount += 360 / numbsides;
			}
		}
	}

	if ((cdirection = 1)) {
		this.turnLeft(sweep - anglecount);
	} else {
		this.turn(sweep - anglecount);
	}
	this.up();
}

//Just try to have only two branches, hence "Limited Tanu"
export function drawLimitedTanu(c, endangle, getSize, penGrowth, isClockwise) {
	var xOrigin,
		yOrigin,
		startingDirection,
		t,
		tinc,
		roffset,
		r,
		start,
		end,
		segments,
		clockwise,
		size,
		tempx,
		tempy,
		temppensize,
		tempclockwize;
	this.down();
	segments = 5;

	if (isClockwise === null || typeof isClockwise === undefined) {
		clockwise = false;
	} else {
		clockwise = isClockwise;
	}

	if (clockwise) {
		if (endangle < 0) {
			startingDirection = 90 - this.direction() - endangle + degrees(Math.atan(1 / c)) - 180;
		} else {
			startingDirection = 90 - this.direction() + degrees(Math.atan(1 / c));
		}
	} else {
		if (endangle < 0) {
			startingDirection = 90 - this.direction() + endangle + (180 - degrees(Math.atan(1 / c)));
		} else {
			startingDirection = 90 - this.direction() - degrees(Math.atan(1 / c));
		}
	}

	size = 2 * (getSize / Math.exp(c * this.degreesToRadians(Math.abs(endangle))));
	roffset = size * Math.exp(c * this.degreesToRadians(0));

	if (endangle < 0) {
		start = Math.abs(endangle);
		end = 0;
		r = size * Math.exp(c * this.degreesToRadians(Math.abs(endangle)));
		if (clockwise) {
			xOrigin =
				this.xPosition() -
				(r * Math.cos(radians(startingDirection - start)) - roffset * Math.cos(radians(startingDirection)));
			yOrigin =
				this.yPosition() -
				(r * Math.sin(radians(startingDirection - start)) - roffset * Math.sin(radians(startingDirection)));
		} else {
			xOrigin =
				this.xPosition() -
				(r * Math.cos(radians(start + startingDirection)) - roffset * Math.cos(radians(startingDirection)));
			yOrigin =
				this.yPosition() -
				(r * Math.sin(radians(start + startingDirection)) - roffset * Math.sin(radians(startingDirection)));
		}
	} else {
		start = 0;
		end = endangle;
		xOrigin = this.xPosition();
		yOrigin = this.yPosition();
	}

	t = start;
	if (end > start) {
		tinc = 1;
	} else {
		tinc = -1;
	}

	let repeatCounter = Math.abs((end - start) / tinc) / segments;
	let stoppingpoint = 0;
	//distinguish two different mother spiral drawing patterns
	if (endangle < 0) {
		stoppingpoint = (repeatCounter * segments * 0.3).toFixed(0);
	} else {
		stoppingpoint = (repeatCounter * segments * 0.7).toFixed(0);
	}

	for (let i = 0; i < repeatCounter; i++) {
		//  Find way to do warp
		for (let j = 0; j < segments; j++) {
			r = size * Math.exp(c * this.degreesToRadians(t));
			if (!clockwise) {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			} else {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t * -1 + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			}
			t = t + tinc;
			this.changeSize(penGrowth);
			if (clockwise) {
				this.turn(tinc);
			} else {
				this.turnLeft(tinc);
			}

			if (i * 5 + j == stoppingpoint) {
				tempx = this.xPosition();
				tempy = this.yPosition();
				temppensize = this.size; //this is the pensize, not the size of the spiral
				//tempdirection = 135 - this.getAngle();

				if (endangle > 0) {
					tempdirection = 180 + this.getAngle();
				} else {
					tempdirection = this.getAngle();
				}

				//tempdirection = this.direction();
				//This is the direction variable, not where the pen is pointing at this point
			}
		}
	}
	let modCounter = Math.abs((end - start) / tinc) % segments;

	for (let k = 0; k < modCounter; k++) {
		r = size * Math.exp(c * this.degreesToRadians(t));
		if (!clockwise) {
			this.gotoXY(
				xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
				yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
			);
		} else {
			this.gotoXY(
				xOrigin + r * Math.cos(radians(t * -1 + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
				yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
			);
		}
		t = t + tinc;
		this.changeSize(penGrowth);
		if (clockwise) {
			this.turn(tinc);
		} else {
			this.turnLeft(tinc);
		}
	}
	this.up();

	this.gotoXY(tempx, tempy);
	this.setSize(temppensize); //temppensize
	var newspiralsize = getSize * 0.375;
	var newclockwize = !isClockwise; //reverse the clockwise
	var temppengrowth = Math.abs(penGrowth) * -1; //pengrawth will always be negative - drawing outside to inside
	this.pointAtAngle(tempdirection);

	var newsweep = Math.abs(endangle) * -0.618;
	this.drawLogSpiral(c, newsweep, newspiralsize, temppengrowth, newclockwize);
}

//Below is the tanu prototype
export function drawTanu(c, endangle, getSize, penGrowth, isClockwise, depth, percentage) {
	var xOrigin,
		yOrigin,
		startingDirection,
		t,
		tinc,
		roffset,
		r,
		start,
		end,
		segments,
		clockwise,
		size,
		tempx,
		tempy,
		temppensize,
		tempclockwize;

	if (depth >= 1) {
		//implement the below function if the depth value is one (one spiral) or more. end if not
		this.down();
		segments = 5;

		if (isClockwise === null || typeof isClockwise === undefined) {
			clockwise = false;
		} else {
			clockwise = isClockwise;
		}

		if (clockwise) {
			if (endangle < 0) {
				startingDirection = 90 - this.direction() - endangle + degrees(Math.atan(1 / c)) - 180;
			} else {
				startingDirection = 90 - this.direction() + degrees(Math.atan(1 / c));
			}
		} else {
			if (endangle < 0) {
				startingDirection = 90 - this.direction() + endangle + (180 - degrees(Math.atan(1 / c)));
			} else {
				startingDirection = 90 - this.direction() - degrees(Math.atan(1 / c));
			}
		}

		size = 2 * (getSize / Math.exp(c * this.degreesToRadians(Math.abs(endangle))));
		roffset = size * Math.exp(c * this.degreesToRadians(0));

		if (endangle < 0) {
			start = Math.abs(endangle);
			end = 0;
			r = size * Math.exp(c * this.degreesToRadians(Math.abs(endangle)));
			if (clockwise) {
				xOrigin =
					this.xPosition() -
					(r * Math.cos(radians(startingDirection - start)) - roffset * Math.cos(radians(startingDirection)));
				yOrigin =
					this.yPosition() -
					(r * Math.sin(radians(startingDirection - start)) - roffset * Math.sin(radians(startingDirection)));
			} else {
				xOrigin =
					this.xPosition() -
					(r * Math.cos(radians(start + startingDirection)) - roffset * Math.cos(radians(startingDirection)));
				yOrigin =
					this.yPosition() -
					(r * Math.sin(radians(start + startingDirection)) - roffset * Math.sin(radians(startingDirection)));
			}
		} else {
			start = 0;
			end = endangle;
			xOrigin = this.xPosition();
			yOrigin = this.yPosition();
		}

		t = start;
		if (end > start) {
			tinc = 1;
		} else {
			tinc = -1;
		}

		let repeatCounter = Math.abs((end - start) / tinc) / segments;
		let stoppingpoint = 0;
		//distinguish two different mother spiral drawing patterns
		if (endangle < 0) {
			stoppingpoint = (repeatCounter * segments * 0.3).toFixed(0);
		} else {
			stoppingpoint = (repeatCounter * segments * 0.7).toFixed(0);
		}

		for (let i = 0; i < repeatCounter; i++) {
			//  Find way to do warp
			for (let j = 0; j < segments; j++) {
				r = size * Math.exp(c * this.degreesToRadians(t));
				if (!clockwise) {
					this.gotoXY(
						xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
						yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
					);
				} else {
					this.gotoXY(
						xOrigin +
							r * Math.cos(radians(t * -1 + startingDirection)) -
							roffset * Math.cos(radians(startingDirection)),
						yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
					);
				}
				t = t + tinc;
				this.changeSize(penGrowth);
				if (clockwise) {
					this.turn(tinc);
				} else {
					this.turnLeft(tinc);
				}

				if (i * 5 + j == stoppingpoint) {
					tempx = this.xPosition();
					tempy = this.yPosition();
					temppensize = this.size; //this is the pensize, not the size of the spiral
					//tempdirection = 135 - this.getAngle();

					if (endangle > 0) {
						tempdirection = 180 + this.getAngle();
					} else {
						tempdirection = this.getAngle();
					}

					//tempdirection = this.direction();
					//This is the direction variable, not where the pen is pointing at this point
				}
			}
		}
		let modCounter = Math.abs((end - start) / tinc) % segments;

		for (let k = 0; k < modCounter; k++) {
			r = size * Math.exp(c * this.degreesToRadians(t));
			if (!clockwise) {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			} else {
				this.gotoXY(
					xOrigin + r * Math.cos(radians(t * -1 + startingDirection)) - roffset * Math.cos(radians(startingDirection)),
					yOrigin + r * Math.sin(radians(t * -1 + startingDirection)) - roffset * Math.sin(radians(startingDirection))
				);
			}
			t = t + tinc;
			this.changeSize(penGrowth);
			if (clockwise) {
				this.turn(tinc);
			} else {
				this.turnLeft(tinc);
			}
		}
		this.up();

		if (depth > 1) {
			//this means it has to go to the branching point
			this.gotoXY(tempx, tempy);
			this.setSize(temppensize); //temppensize
			var newspiralsize = getSize * percentage;
			var newclockwize = !isClockwise; //reverse the clockwise
			var temppengrowth = Math.abs(penGrowth) * -1; //pengrawth will always be negative - drawing outside to inside
			this.pointAtAngle(tempdirection);
			var newdepth = depth - 1;

			var newsweep = Math.abs(endangle) * -0.618;
			this.drawTanu(c, newsweep, newspiralsize, temppengrowth, newclockwize, newdepth, percentage);
		}
	}
	this.up();
}

////////////////////////////////////////////////////////////////
//Core block overrides
////////////////////////////////////////////////////////////////
export function setEffect(effect, value) {
	var eff = effect instanceof Array ? effect[0] : effect.toString();
	if (
		!contains(
			[
				"color",
				"saturation",
				"brightness",
				"ghost",
				"fisheye",
				"whirl",
				"pixelate",
				"mosaic",
				"negative",
				// depracated, but still supported in legacy projects:
				"duplicate",
				"comic",
				"confetti",
			],
			eff
		)
	) {
		throw new Error(localize("unsupported graphic effect") + ': "' + eff + '"');
	}
	if (eff === "ghost") {
		this.alpha = 1 - Math.min(Math.max(+value || 0, 0), 100) / 100;
	} else {
		// Ad Hoc way of fixing color and saturation with the images
		if (eff === "color") {
			this.graphicsValues["saturation"] = this.hasSaturation ? this.graphicsValues["saturation"] : 100;
			this.graphicsValues["brightness"] = this.hasBrightness ? this.graphicsValues["brightness"] : 68;
		} else if (eff === "saturation") {
			this.hasSaturation = true;
		} else if (eff === "brightness") {
			this.hasBrightness = true;
		}
		this.graphicsValues[eff] = +value;
	}
	this.rerender();
}

export function applyGraphicsEffects(canvas) {
	// For every effect: apply transform of that effect(canvas, stored value)
	// Graphic effects from Scratch are heavily based on ScratchPlugin.c

	var ctx, imagedata, w, h;

	function transform_fisheye(imagedata, value) {
		var pixels, newImageData, newPixels, centerX, centerY, w, h, x, y, dx, dy, r, angle, srcX, srcY, i, srcI;

		w = imagedata.width;
		h = imagedata.height;
		pixels = imagedata.data;
		newImageData = ctx.createImageData(w, h);
		newPixels = newImageData.data;

		centerX = w / 2;
		centerY = h / 2;
		value = Math.max(0, (value + 100) / 100);
		for (y = 0; y < h; y++) {
			for (x = 0; x < w; x++) {
				dx = (x - centerX) / centerX;
				dy = (y - centerY) / centerY;
				r = Math.pow(Math.sqrt(dx * dx + dy * dy), value);
				if (r <= 1) {
					angle = Math.atan2(dy, dx);
					srcX = Math.floor(centerX + r * Math.cos(angle) * centerX);
					srcY = Math.floor(centerY + r * Math.sin(angle) * centerY);
				} else {
					srcX = x;
					srcY = y;
				}
				i = (y * w + x) * 4;
				srcI = (srcY * w + srcX) * 4;
				newPixels[i] = pixels[srcI];
				newPixels[i + 1] = pixels[srcI + 1];
				newPixels[i + 2] = pixels[srcI + 2];
				newPixels[i + 3] = pixels[srcI + 3];
			}
		}
		return newImageData;
	}

	function transform_whirl(imagedata, value) {
		var pixels,
			newImageData,
			newPixels,
			w,
			h,
			centerX,
			centerY,
			x,
			y,
			radius,
			scaleX,
			scaleY,
			whirlRadians,
			radiusSquared,
			dx,
			dy,
			d,
			factor,
			angle,
			srcX,
			srcY,
			i,
			srcI,
			sina,
			cosa;

		w = imagedata.width;
		h = imagedata.height;
		pixels = imagedata.data;
		newImageData = ctx.createImageData(w, h);
		newPixels = newImageData.data;

		centerX = w / 2;
		centerY = h / 2;
		radius = Math.min(centerX, centerY);
		if (w < h) {
			scaleX = h / w;
			scaleY = 1;
		} else {
			scaleX = 1;
			scaleY = w / h;
		}
		whirlRadians = -radians(value);
		radiusSquared = radius * radius;
		for (y = 0; y < h; y++) {
			for (x = 0; x < w; x++) {
				dx = scaleX * (x - centerX);
				dy = scaleY * (y - centerY);
				d = dx * dx + dy * dy;
				if (d < radiusSquared) {
					factor = 1 - Math.sqrt(d) / radius;
					angle = whirlRadians * (factor * factor);
					sina = Math.sin(angle);
					cosa = Math.cos(angle);
					srcX = Math.floor((cosa * dx - sina * dy) / scaleX + centerX);
					srcY = Math.floor((sina * dx + cosa * dy) / scaleY + centerY);
				} else {
					srcX = x;
					srcY = y;
				}
				i = (y * w + x) * 4;
				srcI = (srcY * w + srcX) * 4;
				newPixels[i] = pixels[srcI];
				newPixels[i + 1] = pixels[srcI + 1];
				newPixels[i + 2] = pixels[srcI + 2];
				newPixels[i + 3] = pixels[srcI + 3];
			}
		}
		return newImageData;
	}

	function transform_pixelate(imagedata, value) {
		var pixels, newImageData, newPixels, w, h, x, y, srcX, srcY, i, srcI;

		w = imagedata.width;
		h = imagedata.height;
		pixels = imagedata.data;
		newImageData = ctx.createImageData(w, h);
		newPixels = newImageData.data;

		value = Math.floor(Math.abs(value / 10) + 1);
		for (y = 0; y < h; y++) {
			for (x = 0; x < w; x++) {
				srcX = Math.floor(x / value) * value;
				srcY = Math.floor(y / value) * value;
				i = (y * w + x) * 4;
				srcI = (srcY * w + srcX) * 4;
				newPixels[i] = pixels[srcI];
				newPixels[i + 1] = pixels[srcI + 1];
				newPixels[i + 2] = pixels[srcI + 2];
				newPixels[i + 3] = pixels[srcI + 3];
			}
		}
		return newImageData;
	}

	function transform_mosaic(imagedata, value) {
		var pixels, i, l, newImageData, newPixels, srcI;
		pixels = imagedata.data;
		newImageData = ctx.createImageData(imagedata.width, imagedata.height);
		newPixels = newImageData.data;

		value = Math.round((Math.abs(value) + 10) / 10);
		value = Math.max(0, Math.min(value, Math.min(imagedata.width, imagedata.height)));
		for (i = 0, l = pixels.length; i < l; i += 4) {
			srcI = (i * value) % l;
			newPixels[i] = pixels[srcI];
			newPixels[i + 1] = pixels[srcI + 1];
			newPixels[i + 2] = pixels[srcI + 2];
			newPixels[i + 3] = pixels[srcI + 3];
		}
		return newImageData;
	}

	function transform_duplicate(imagedata, value) {
		var pixels, i;
		pixels = imagedata.data;
		for (i = 0; i < pixels.length; i += 4) {
			pixels[i] = pixels[i * value];
			pixels[i + 1] = pixels[i * value + 1];
			pixels[i + 2] = pixels[i * value + 2];
			pixels[i + 3] = pixels[i * value + 3];
		}
		return imagedata;
	}

	function transform_colorDimensions(imagedata, hueShift, saturationShift, brightnessShift) {
		var pixels = imagedata.data,
			l = pixels.length,
			clr = new Color(),
			index,
			dim;

		// Allows for saturation and brightness to be natural 50 normal
		let sat = -100 + saturationShift * 2;
		let bri = -100 + brightnessShift * 2;

		for (index = 0; index < l; index += 4) {
			clr.r = pixels[index];
			clr.g = pixels[index + 1];
			clr.b = pixels[index + 2];

			dim = clr[SpriteMorph.prototype.penColorModel]();
			dim[0] = dim[0] * 100 + hueShift;
			if (dim[0] < 0 || dim[0] > 100) {
				// wrap the hue
				dim[0] = (dim[0] < 0 ? 100 : 0) + (dim[0] % 100);
			}
			// dim[0] = dim[0] / 100;
			// dim[1] = dim[1] + saturationShift / 100;
			// dim[2] = dim[2] + brightnessShift / 100;

			dim[0] = dim[0] / 100;
			dim[1] = dim[1] + sat / 100;
			dim[2] = dim[2] + bri / 100;

			clr["set_" + SpriteMorph.prototype.penColorModel].apply(clr, dim);
			pixels[index] = clr.r;
			pixels[index + 1] = clr.g;
			pixels[index + 2] = clr.b;
		}
		return imagedata;
	}

	function transform_negative(imagedata, value) {
		var pixels, i, l, rcom, gcom, bcom;
		pixels = imagedata.data;
		for (i = 0, l = pixels.length; i < l; i += 4) {
			rcom = 255 - pixels[i];
			gcom = 255 - pixels[i + 1];
			bcom = 255 - pixels[i + 2];

			if (pixels[i] < rcom) {
				//compare to the complement
				pixels[i] += value;
			} else if (pixels[i] > rcom) {
				pixels[i] -= value;
			}
			if (pixels[i + 1] < gcom) {
				pixels[i + 1] += value;
			} else if (pixels[i + 1] > gcom) {
				pixels[i + 1] -= value;
			}
			if (pixels[i + 2] < bcom) {
				pixels[i + 2] += value;
			} else if (pixels[i + 2] > bcom) {
				pixels[i + 2] -= value;
			}
		}
		return imagedata;
	}

	function transform_comic(imagedata, value) {
		var pixels, i, l;
		pixels = imagedata.data;
		for (i = 0, l = pixels.length; i < l; i += 4) {
			pixels[i] += Math.sin(i * value) * 127 + 128;
			pixels[i + 1] += Math.sin(i * value) * 127 + 128;
			pixels[i + 2] += Math.sin(i * value) * 127 + 128;
		}
		return imagedata;
	}

	function transform_confetti(imagedata, value) {
		var pixels, i, l;
		pixels = imagedata.data;
		for (i = 0, l = pixels.length; i < l; i += 1) {
			pixels[i] = Math.sin(value * pixels[i]) * 127 + pixels[i];
		}
		return imagedata;
	}

	if (this.graphicsChanged()) {
		w = Math.ceil(this.width());
		h = Math.ceil(this.height());
		if (!canvas.width || !canvas.height || !w || !h) {
			// too small to get image data, abort
			return canvas;
		}
		ctx = canvas.getContext("2d");
		imagedata = ctx.getImageData(0, 0, w, h);

		if (this.graphicsValues.fisheye) {
			imagedata = transform_fisheye(imagedata, this.graphicsValues.fisheye);
		}
		if (this.graphicsValues.whirl) {
			imagedata = transform_whirl(imagedata, this.graphicsValues.whirl);
		}
		if (this.graphicsValues.pixelate) {
			imagedata = transform_pixelate(imagedata, this.graphicsValues.pixelate);
		}
		if (this.graphicsValues.mosaic) {
			imagedata = transform_mosaic(imagedata, this.graphicsValues.mosaic);
		}
		if (this.graphicsValues.duplicate) {
			imagedata = transform_duplicate(imagedata, this.graphicsValues.duplicate);
		}
		if (this.graphicsValues.color || this.graphicsValues.saturation || this.graphicsValues.brightness) {
			imagedata = transform_colorDimensions(
				imagedata,
				this.graphicsValues.color,
				this.graphicsValues.saturation,
				this.graphicsValues.brightness
			);
		}
		if (this.graphicsValues.negative) {
			imagedata = transform_negative(imagedata, this.graphicsValues.negative);
		}
		if (this.graphicsValues.comic) {
			imagedata = transform_comic(imagedata, this.graphicsValues.comic);
		}
		if (this.graphicsValues.confetti) {
			imagedata = transform_confetti(imagedata, this.graphicsValues.confetti);
		}

		ctx.putImageData(imagedata, 0, 0);
	}

	return canvas;
}

export function clear() {
	this.parent.clearPenTrails();

	// CSDT Clear border list
	this.lineList = [];
	this.clearEffects();
	this.setVisibility(true);
	this.hasBorder = false;
	this.borderColor = new Color(255, 0, 0);
	this.borderSize = 0;

	if (this.isVariableNameInUse("base image size")) this.deleteVariable("base image size");
	if (this.isVariableNameInUse("style image size")) this.deleteVariable("style image size");
	if (this.isVariableNameInUse("stylization ratio")) this.deleteVariable("stylization ratio");
	if (this.isVariableNameInUse("conversion mode")) this.deleteVariable("conversion mode");
}

export function doSwitchToCostume(id, noShadow) {
	var w = 0,
		h = 0,
		stage;
	if (id instanceof List) {
		// try to turn a list of pixels into a costume
		if (this.costume) {
			// recycle dimensions of current costume
			w = this.costume.width();
			h = this.costume.height();
		}
		if (w * h !== id.length()) {
			// assume stage's dimensions
			stage = this.parentThatIsA(StageMorph);
			w = stage.dimensions.x;
			h = stage.dimensions.y;
		}
		id = Process.prototype.reportNewCostume(id, w, h, this.newCostumeName(localize("snap")));
	}
	if (id instanceof Costume) {
		// allow first-class costumes
		this.wearCostume(id, noShadow);
		return;
	}
	if (id instanceof Array && id[0] === "current") {
		return;
	}

	var num,
		arr = this.costumes.asArray(),
		costume;
	if (contains([localize("Turtle"), localize("Empty")], id instanceof Array ? id[0] : null)) {
		costume = null;
	} else {
		if (id === -1) {
			this.doWearPreviousCostume();
			return;
		}
		costume = detect(arr, (cst) => cst.name === id);
		if (costume === null) {
			num = parseFloat(id);
			if (num === 0) {
				costume = null;
			} else {
				costume = arr[num - 1] || null;
			}
		}
	}
	this.wearCostume(costume, noShadow);
	this.clearEffects();
}

export function clearEffects() {
	var effect;
	for (effect in this.graphicsValues) {
		if (this.graphicsValues.hasOwnProperty(effect)) {
			this.setEffect([effect], 0);
		}
	}
	this.setEffect(["ghost"], 0);

	//Defaults for random color issue
	this.setEffect(["ghost"], 0);
	this.setVisibility(true);
	this.hasBrightness = false;
	this.hasSaturation = false;
	this.graphicsValues["saturation"] = 50;
	this.graphicsValues["brightness"] = 50;
}

export function doWearNextCostume() {
	if (this.colorShiftCostume) this.colorShiftCostume = null;
	var arr = this.costumes.asArray(),
		idx;

	if (arr.length > 1) {
		idx = arr.indexOf(this.costume);
		if (this.costume?.csdtColorIdx && this.costume?.csdtColorIdx >= 1) idx = this.costume.csdtColorIdx - 1;
		if (idx > -1) {
			idx += 1;
			if (idx > arr.length - 1) {
				idx = 0;
			}
			this.wearCostume(arr[idx]);
		}
	}
}

////////////////////////////////////////////////////////////////
//Blocks that you want to add to the list can be pushed to whatever category you want to add them to
////////////////////////////////////////////////////////////////

export function blockTemplates(
	category = "motion",
	all = false // include hidden blocks,
) {
	var blocks = [],
		myself = this,
		varNames,
		inheritedVars = this.inheritedVariableNames(),
		wrld = this.world(),
		devMode = wrld && wrld.isDevMode;

	function block(selector, isGhosted) {
		if (StageMorph.prototype.hiddenPrimitives[selector] && !all) {
			return null;
		}
		var newBlock = SpriteMorph.prototype.blockForSelector(selector, true);
		newBlock.isTemplate = true;
		if (isGhosted) {
			newBlock.ghost();
		}
		return newBlock;
	}

	function variableBlock(varName, isLocal) {
		var newBlock = SpriteMorph.prototype.variableBlock(varName, isLocal);
		newBlock.isDraggable = false;
		newBlock.isTemplate = true;
		if (contains(inheritedVars, varName)) {
			newBlock.ghost();
		}
		return newBlock;
	}

	function watcherToggle(selector) {
		if (StageMorph.prototype.hiddenPrimitives[selector]) {
			return null;
		}
		var info = SpriteMorph.prototype.blocks[selector];
		return new ToggleMorph(
			"checkbox",
			this,
			function () {
				myself.toggleWatcher(selector, localize(info.spec), myself.blockColor[info.category]);
			},
			null,
			function () {
				return myself.showingWatcher(selector);
			},
			null
		);
	}

	function variableWatcherToggle(varName) {
		return new ToggleMorph(
			"checkbox",
			this,
			function () {
				myself.toggleVariableWatcher(varName);
			},
			null,
			function () {
				return myself.showingVariableWatcher(varName);
			},
			null
		);
	}

	function addCSDTMotionBlocks(blocks) {
		blocks.push(watcherToggle("getAngle"));
		blocks.push(block("getAngle"));
		blocks.push(block("translatePercent"));
		blocks.push(block("pointAtAngle"));
		blocks.push(block("rotateByDegrees"));
	}

	if (StageMorph.prototype.decategorize) {
		if (myself.parentThatIsA(IDE_Morph).renderBlocks) {
			blocks.push(block("receiveGo"));
			blocks.push(block("doRepeat"));
			blocks.push(block("receiveMessage"));
			blocks.push(block("doBroadcast"));
			blocks.push("-");
			blocks.push(block("gotoXY"));
			blocks.push(block("pointAtAngle"));
			blocks.push(block("rotateByDegrees"));
			blocks.push(block("translatePercent"));
			blocks.push(block("changeXPosition"));
			blocks.push(block("turnLeft"));
			blocks.push(block("forward"));

			blocks.push(block("doSwitchToCostume"));
			blocks.push(block("setEffect"));
			blocks.push(block("reflectYAxis"));
			blocks.push(block("setScale"));
			blocks.push(block("newSizeOfCurrent"));

			blocks.push(block("clear"));
			blocks.push(block("doStamp"));
			blocks.push(block("setSize"));

			blocks.push("-");

			varNames = this.reachableGlobalVariableNames(true);
			if (varNames.length > 0) {
				varNames.forEach((name) => {
					blocks.push(variableWatcherToggle(name));
					blocks.push(variableBlock(name));
				});
				blocks.push("-");
			}

			varNames = this.allLocalVariableNames(true);
			if (varNames.length > 0) {
				varNames.forEach((name) => {
					blocks.push(variableWatcherToggle(name));
					blocks.push(variableBlock(name, true));
				});
				blocks.push("-");
			}

			blocks.push(block("doSetVar"));
			blocks.push(block("doChangeVar"));

			blocks.push(block("reportQuotient"));
			blocks.push(block("reportProduct"));
			blocks.push(block("reportBoolean"));
			blocks.push(block("reportRandom"));
			return blocks;
		}
	}

	if (category === "motion") {
		blocks.push(block("forward"));
		blocks.push(block("turn"));
		blocks.push(block("turnLeft"));
		blocks.push("-");
		blocks.push(block("setHeading"));
		blocks.push(block("doFaceTowards"));
		blocks.push("-");
		blocks.push(block("gotoXY"));
		blocks.push(block("doGotoObject"));
		blocks.push(block("doGlide"));
		blocks.push("-");
		blocks.push(block("changeXPosition"));
		blocks.push(block("setXPosition"));
		blocks.push(block("changeYPosition"));
		blocks.push(block("setYPosition"));
		blocks.push("-");
		blocks.push(block("bounceOffEdge"));
		blocks.push("-");
		blocks.push(watcherToggle("xPosition"));
		blocks.push(block("xPosition", this.inheritsAttribute("x position")));
		blocks.push(watcherToggle("yPosition"));
		blocks.push(block("yPosition", this.inheritsAttribute("y position")));
		blocks.push(watcherToggle("direction"));
		blocks.push(block("direction", this.inheritsAttribute("direction")));

		blocks.push("=");

		addCSDTMotionBlocks(blocks);
	} else if (category === "looks") {
		blocks.push(block("doSwitchToCostume"));
		blocks.push(block("doWearNextCostume"));
		blocks.push(watcherToggle("getCostumeIdx"));
		blocks.push(block("getCostumeIdx", this.inheritsAttribute("costume #")));
		blocks.push("-");
		blocks.push(block("doSayFor"));
		blocks.push(block("bubble"));
		blocks.push(block("doThinkFor"));
		blocks.push(block("doThink"));
		blocks.push("-");
		blocks.push(block("reportGetImageAttribute"));
		blocks.push(block("reportNewCostumeStretched"));
		blocks.push(block("reportNewCostume"));
		blocks.push("-");
		blocks.push(block("changeEffect"));
		blocks.push(block("setEffect"));
		blocks.push(block("clearEffects"));
		blocks.push(block("getEffect"));
		blocks.push("-");
		blocks.push(block("changeScale"));
		blocks.push(block("setScale"));
		blocks.push(watcherToggle("getScale"));
		blocks.push(block("getScale", this.inheritsAttribute("size")));
		blocks.push("-");
		blocks.push(block("show"));
		blocks.push(block("hide"));
		blocks.push(watcherToggle("reportShown"));
		blocks.push(block("reportShown", this.inheritsAttribute("shown?")));
		blocks.push("-");
		blocks.push(block("goToLayer"));
		blocks.push(block("goBack"));

		blocks.push("=");
		blocks.push(block("flipVertical"));
		blocks.push(block("flipHorizontal"));
		blocks.push(block("reflectXAxis"));
		blocks.push(block("reflectYAxis"));
		blocks.push(block("newSizeOfCurrent"));
		blocks.push(block("doSetScaleFactor"));

		// for debugging: ///////////////
		if (devMode) {
			blocks.push("-");
			blocks.push(this.devModeText());
			blocks.push("-");
			blocks.push(block("log"));
			blocks.push(block("alert"));
			blocks.push("-");
			blocks.push(block("doScreenshot"));
		}
	} else if (category === "sound") {
		blocks.push(block("playSound"));
		blocks.push(block("doPlaySoundUntilDone"));
		blocks.push(block("doStopAllSounds"));
		blocks.push("-");
		blocks.push(block("doPlaySoundAtRate"));
		blocks.push(block("reportGetSoundAttribute"));
		blocks.push(block("reportNewSoundFromSamples"));
		blocks.push("-");
		blocks.push(block("doRest"));
		blocks.push(block("doPlayNote"));
		blocks.push(block("doSetInstrument"));
		blocks.push("-");
		blocks.push(block("doChangeTempo"));
		blocks.push(block("doSetTempo"));
		blocks.push(watcherToggle("getTempo"));
		blocks.push(block("getTempo"));
		blocks.push("-");
		blocks.push(block("changeVolume"));
		blocks.push(block("setVolume"));
		blocks.push(watcherToggle("getVolume"));
		blocks.push(block("getVolume", this.inheritsAttribute("volume")));
		blocks.push("-");
		blocks.push(block("changePan"));
		blocks.push(block("setPan"));
		blocks.push(watcherToggle("getPan"));
		blocks.push(block("getPan", this.inheritsAttribute("balance")));
		blocks.push("-");
		blocks.push(block("playFreq"));
		blocks.push(block("stopFreq"));

		// for debugging: ///////////////
		if (devMode) {
			blocks.push("-");
			blocks.push(this.devModeText());
			blocks.push("-");
			blocks.push(block("doPlayFrequency"));
		}
	} else if (category === "pen") {
		blocks.push(block("clear"));
		blocks.push("-");
		blocks.push(block("down"));
		blocks.push(block("up"));
		blocks.push(watcherToggle("getPenDown"));
		blocks.push(block("getPenDown", this.inheritsAttribute("pen down?")));
		blocks.push("-");
		blocks.push(block("setColor"));
		blocks.push(block("changePenColorDimension"));
		blocks.push(block("setPenColorDimension"));
		blocks.push(block("getPenAttribute"));
		blocks.push("-");
		blocks.push(block("changeSize"));
		blocks.push(block("setSize"));
		blocks.push("-");
		blocks.push(block("doStamp"));
		blocks.push(block("floodFill"));
		blocks.push(block("write"));
		blocks.push("-");
		blocks.push(block("reportPenTrailsAsCostume"));
		blocks.push("-");
		blocks.push(block("doPasteOn"));
		blocks.push(block("doCutFrom"));

		blocks.push("=");
		blocks.push(block("flatLineEnds"));
		blocks.push(block("setBorderSize"));
		blocks.push(block("setBorderHue"));
		blocks.push(block("setBorderShade"));
		blocks.push(block("smoothBorders"));
		blocks.push(block("getPenBorderAttribute"));
	} else if (category === "control") {
		blocks.push(block("receiveGo"));
		blocks.push(block("receiveKey"));
		blocks.push(block("receiveInteraction"));
		blocks.push(block("receiveCondition"));
		blocks.push("-");
		blocks.push(block("receiveMessage"));
		blocks.push(block("doBroadcast"));
		blocks.push(block("doBroadcastAndWait"));
		blocks.push("-");
		blocks.push(block("doWarp"));
		blocks.push("-");
		blocks.push(block("doWait"));
		blocks.push(block("doWaitUntil"));
		blocks.push("-");
		blocks.push(block("doForever"));
		blocks.push(block("doRepeat"));
		blocks.push(block("doUntil"));
		blocks.push(block("doFor"));
		blocks.push("-");
		blocks.push(block("doIf"));
		blocks.push(block("doIfElse"));
		blocks.push(block("reportIfElse"));
		blocks.push("-");
		blocks.push(block("doReport"));
		blocks.push(block("doStopThis"));
		blocks.push("-");
		blocks.push(block("doRun"));
		blocks.push(block("fork"));
		blocks.push(block("evaluate"));
		blocks.push("-");
		blocks.push(block("doTellTo"));
		blocks.push(block("reportAskFor"));
		blocks.push("-");
		blocks.push(block("doCallCC"));
		blocks.push(block("reportCallCC"));
		blocks.push("-");
		blocks.push(block("receiveOnClone"));
		blocks.push(block("createClone"));
		blocks.push(block("newClone"));
		blocks.push(block("removeClone"));
		blocks.push("-");
		blocks.push(block("doPauseAll"));
		blocks.push(block("doSwitchToScene"));

		// for debugging: ///////////////
		if (devMode) {
			blocks.push("-");
			blocks.push(this.devModeText());
			blocks.push("-");
			blocks.push(watcherToggle("getLastMessage"));
			blocks.push(block("getLastMessage"));
		}
	} else if (category === "sensing") {
		blocks.push(block("reportTouchingObject"));
		blocks.push(block("reportTouchingColor"));
		blocks.push(block("reportColorIsTouchingColor"));
		blocks.push("-");
		blocks.push(block("doAsk"));
		blocks.push(watcherToggle("getLastAnswer"));
		blocks.push(block("getLastAnswer"));
		blocks.push("-");
		blocks.push(watcherToggle("reportMouseX"));
		blocks.push(block("reportMouseX"));
		blocks.push(watcherToggle("reportMouseY"));
		blocks.push(block("reportMouseY"));
		blocks.push(block("reportMouseDown"));
		blocks.push("-");
		blocks.push(block("reportKeyPressed"));
		blocks.push("-");
		blocks.push(block("reportRelationTo"));
		blocks.push(block("reportAspect"));
		blocks.push("-");
		blocks.push(block("doResetTimer"));
		blocks.push(watcherToggle("getTimer"));
		blocks.push(block("getTimer"));
		blocks.push("-");
		blocks.push(block("reportAttributeOf"));

		if (SpriteMorph.prototype.enableFirstClass) {
			blocks.push(block("reportGet"));
		}

		blocks.push(block("reportObject"));
		blocks.push("-");
		blocks.push(block("reportURL"));
		blocks.push(block("reportAudio"));
		blocks.push(block("reportVideo"));
		blocks.push(block("doSetVideoTransparency"));
		blocks.push("-");
		blocks.push(block("reportGlobalFlag"));
		blocks.push(block("doSetGlobalFlag"));
		blocks.push("-");
		blocks.push(block("reportDate"));
		blocks.push(block("reportBlockAttribute"));

		// for debugging: ///////////////
		if (devMode) {
			blocks.push("-");
			blocks.push(this.devModeText());
			blocks.push("-");
			blocks.push(watcherToggle("reportThreadCount"));
			blocks.push(block("reportThreadCount"));
			blocks.push(block("reportStackSize"));
			blocks.push(block("reportFrameCount"));
			blocks.push(block("reportYieldCount"));
		}
	} else if (category === "operators") {
		blocks.push(block("reifyScript"));
		blocks.push(block("reifyReporter"));
		blocks.push(block("reifyPredicate"));
		blocks.push("#");
		blocks.push("-");
		blocks.push(block("reportSum"));
		blocks.push(block("reportDifference"));
		blocks.push(block("reportProduct"));
		blocks.push(block("reportQuotient"));
		blocks.push(block("reportPower"));
		blocks.push("-");
		blocks.push(block("reportModulus"));
		blocks.push(block("reportRound"));
		blocks.push(block("reportMonadic"));
		blocks.push(block("reportRandom"));
		blocks.push("-");
		blocks.push(block("reportLessThan"));
		blocks.push(block("reportEquals"));
		blocks.push(block("reportGreaterThan"));
		blocks.push("-");
		blocks.push(block("reportAnd"));
		blocks.push(block("reportOr"));
		blocks.push(block("reportNot"));
		blocks.push(block("reportBoolean"));
		blocks.push("-");
		blocks.push(block("reportJoinWords"));
		blocks.push(block("reportTextSplit"));
		blocks.push(block("reportLetter"));
		blocks.push(block("reportStringSize"));
		blocks.push("-");
		blocks.push(block("reportUnicode"));
		blocks.push(block("reportUnicodeAsLetter"));
		blocks.push("-");
		blocks.push(block("reportIsA"));
		blocks.push(block("reportIsIdentical"));

		if (Process.prototype.enableJS) {
			blocks.push("-");
			blocks.push(block("reportJSFunction"));
			if (Process.prototype.enableCompiling) {
				blocks.push(block("reportCompiled"));
			}
		}
		// for debugging: ///////////////
		if (devMode) {
			blocks.push("-");
			blocks.push(this.devModeText());
			blocks.push("-");
			blocks.push(block("reportTypeOf"));
			blocks.push(block("reportTextFunction"));
		}
	} else if (category === "variables") {
		blocks.push(this.makeVariableButton());
		if (this.deletableVariableNames().length > 0) {
			blocks.push(this.deleteVariableButton());
		}
		blocks.push("-");

		varNames = this.reachableGlobalVariableNames(true, all);
		if (varNames.length > 0) {
			varNames.forEach((name) => {
				blocks.push(variableWatcherToggle(name));
				blocks.push(variableBlock(name));
			});
			blocks.push("-");
		}

		varNames = this.allLocalVariableNames(true, all);
		if (varNames.length > 0) {
			varNames.forEach((name) => {
				blocks.push(variableWatcherToggle(name));
				blocks.push(variableBlock(name, true));
			});
			blocks.push("-");
		}

		blocks.push(block("doSetVar"));
		blocks.push(block("doChangeVar"));
		blocks.push(block("doShowVar"));
		blocks.push(block("doHideVar"));
		blocks.push(block("doDeclareVariables"));

		// inheritance:

		if (StageMorph.prototype.enableInheritance) {
			blocks.push("-");
			blocks.push(block("doDeleteAttr"));
		}

		blocks.push("=");
		blocks.push(block("reportNewList"));
		blocks.push(block("reportNumbers"));
		blocks.push("-");
		blocks.push(block("reportCONS"));
		blocks.push(block("reportListItem"));
		blocks.push(block("reportCDR"));
		blocks.push("-");
		blocks.push(block("reportListAttribute"));
		blocks.push(block("reportListIndex"));
		blocks.push(block("reportListContainsItem"));
		blocks.push(block("reportListIsEmpty"));
		blocks.push("-");
		blocks.push(block("reportMap"));
		blocks.push(block("reportKeep"));
		blocks.push(block("reportFindFirst"));
		blocks.push(block("reportCombine"));
		blocks.push("-");
		blocks.push(block("doForEach"));
		blocks.push("-");
		blocks.push(block("reportConcatenatedLists"));
		blocks.push(block("reportReshape"));
		blocks.push("-");
		blocks.push(block("doAddToList"));
		blocks.push(block("doDeleteFromList"));
		blocks.push(block("doInsertInList"));
		blocks.push(block("doReplaceInList"));
		blocks.push("=");

		// blocks.push(block("toggleASTProgress"));

		// blocks.push(block("createImageUsingAI"));

		if (SpriteMorph.prototype.showingExtensions) {
			blocks.push("=");
			blocks.push(block("doApplyExtension"));
			blocks.push(block("reportApplyExtension"));
		}

		if (StageMorph.prototype.enableCodeMapping) {
			blocks.push("=");
			blocks.push(block("doMapCodeOrHeader"));
			blocks.push(block("doMapValueCode"));
			blocks.push(block("doMapListCode"));
			blocks.push("-");
			blocks.push(block("reportMappedCode"));
		}

		// for debugging: ///////////////
		if (this.world().isDevMode) {
			blocks.push("-");
			blocks.push(this.devModeText());
			blocks.push("-");
			blocks.push(block("doShowTable"));
		}
	} else if (category === "ai") {
		if (SpriteMorph.prototype.csdtOverrides["ai"]) {
			for (let customBlock of SpriteMorph.prototype.csdtOverrides["ai"]) {
				blocks.push(block(customBlock));
			}
		}
	}

	return blocks;
}

export function drawLine(start, dest, isBorder = false) {
	var stagePos = this.parent.bounds.origin,
		stageScale = this.parent.scale,
		context = this.parent.penTrails().getContext("2d"),
		from = start.subtract(stagePos).divideBy(stageScale),
		to = dest.subtract(stagePos).divideBy(stageScale),
		damagedFrom = from.multiplyBy(stageScale).add(stagePos),
		damagedTo = to.multiplyBy(stageScale).add(stagePos),
		damaged = damagedFrom
			.rectangle(damagedTo)
			.expandBy(Math.max((this.size * stageScale) / 2, 1))
			.intersect(this.parent.visibleBounds())
			.spread();

	if (this.isDown) {
		// record for later svg conversion
		if (StageMorph.prototype.enablePenLogging) {
			this.parent.trailsLog.push([
				this.snapPoint(start),
				this.snapPoint(dest),
				this.color.copy(),
				this.size,
				this.useFlatLineEnds ? "butt" : "round",
			]);
		}

		// draw on the pen-trails layer
		if (isBorder && this.borderSize > 0) {
			console.log("enters border drawing");
			context.lineWidth = this.size + this.borderSize;
			context.strokeStyle = this.borderColor.toString();
		} else {
			context.lineWidth = this.size;
			context.strokeStyle = this.color.toString();
		}
		if (this.useFlatLineEnds) {
			context.lineCap = "butt";
			context.lineJoin = "miter";
		} else {
			context.lineCap = "round";
			context.lineJoin = "round";
		}
		context.beginPath();
		context.moveTo(from.x, from.y);
		context.lineTo(to.x, to.y);
		context.stroke();
		if (this.isWarped === false) {
			this.world().broken.push(damaged);
		}
		this.parent.cachedPenTrailsMorph = null;
	}
}
export function moveBy(delta, justMe) {
	// override the inherited default to make sure my parts follow
	// unless it's justMe (a correction)
	var start = this.isDown && !justMe && this.parent ? this.rotationCenter() : null;
	SpriteMorph.uber.moveBy.call(this, delta);
	if (start) {
		console.log(this.hasBorder);
		if (this.hasBorder) this.drawBorderedLine(start, this.rotationCenter());
		else this.drawLine(start, this.rotationCenter());
	}
	if (!justMe) {
		this.parts.forEach((part) => part.moveBy(delta));
		this.instances.forEach((instance) => {
			if (instance.cachedPropagation) {
				var inheritsX = instance.inheritsAttribute("x position"),
					inheritsY = instance.inheritsAttribute("y position");
				if (inheritsX && inheritsY) {
					instance.moveBy(delta);
				} else if (inheritsX) {
					instance.moveBy(new Point(delta.x, 0));
				} else if (inheritsY) {
					instance.moveBy(new Point(0, delta.y));
				}
			}
		});
	}
}
export function setBorderSize(size) {
	// pen size
	if (!isNaN(size)) {
		this.borderSize = Math.min(Math.max(+size, 0.0001), 1000);
		this.hasBorder = true;
	}
}
