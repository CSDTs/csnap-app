/**
 * So pretty much, just got to copy process blocks from code.js in Tutorial CSnap_Module.
 * TODO Design functionality for how the glide should work
 * (seperate blocks, same blocks with toggles, similar to tutorial with layout toggles, etc.)
 *
 * TODO Determine to what extent should glide be enabled...
 */

// Process.prototype.gotoXY = function (x, y) {
// 	let sprite = this.blockReceiver();
// 	if (window.glide && !this.homeContext.receiver.isWarped) {
// 		if (sprite.yPosition() == y && sprite.xPosition() == x) {
// 			return null;
// 		}
// 		this.doGlide(0.5, x, y);
// 	} else {
// 		sprite.gotoXY(x, y);
// 	}
// };

//point in direction
// Process.prototype.setHeading = function (degrees) {
// 	let sprite = this.blockReceiver();
// 	if (window.glide && !this.homeContext.receiver.isWarped) {
// 		var milliSecs = 500;
// 		degrees = degrees % 360;
// 		if (!this.context.startTime) {
// 			this.context.startValue = sprite.heading % 360;
// 			if (Math.abs(degrees - sprite.heading) > Math.abs(degrees - (360 - sprite.heading))) {
// 				this.context.startValue = 360 - sprite.heading;
// 			}
// 			if (degrees == sprite.heading) {
// 				return null;
// 			}
// 			this.context.startTime = Date.now();
// 		}
// 		if (Date.now() - this.context.startTime >= milliSecs) {
// 			sprite.setHeading(degrees);
// 			return null;
// 		}
// 		if (degrees == sprite.heading) {
// 			return null;
// 		}
// 		let elapsed = Date.now() - this.context.startTime;
// 		let fraction = Math.max(Math.min(elapsed / milliSecs, 1), 0);
// 		sprite.setHeading(this.context.startValue + fraction * (degrees - this.context.startValue));

// 		this.pushContext("doYield");
// 		this.pushContext();
// 	} else {
// 		sprite.setHeading(degrees);
// 	}
// };
// Process.prototype.turn = function (degrees) {
// 	if (degrees == 0) {
// 		return null;
// 	}
// 	let sprite = this.blockReceiver();
// 	if (window.glide && !this.homeContext.receiver.isWarped) {
// 		var milliSecs = 500;
// 		if (!this.context.startTime) {
// 			this.context.startTime = Date.now();
// 			this.context.startValue = sprite.heading;
// 		}
// 		var endValue = this.context.startValue + (+degrees || 0);
// 		if (Date.now() - this.context.startTime >= milliSecs) {
// 			sprite.setHeading(endValue);
// 			return null;
// 		}
// 		if (endValue == sprite.heading) {
// 			return null;
// 		}
// 		let elapsed = Date.now() - this.context.startTime;
// 		let fraction = Math.max(Math.min(elapsed / milliSecs, 1), 0);
// 		sprite.setHeading(this.context.startValue + fraction * (endValue - this.context.startValue));

// 		this.pushContext("doYield");
// 		this.pushContext();
// 	} else {
// 		sprite.turn(degrees);
// 	}
// };

// Process.prototype.turnLeft = function (degrees) {
// 	if (degrees == 0) {
// 		return null;
// 	}
// 	let sprite = this.blockReceiver();
// 	if (window.glide && !this.homeContext.receiver.isWarped) {
// 		var milliSecs = 500;
// 		if (!this.context.startTime) {
// 			this.context.startTime = Date.now();
// 			this.context.startValue = sprite.heading;
// 		}
// 		var endValue = this.context.startValue - (+degrees || 0);
// 		if (Date.now() - this.context.startTime >= milliSecs) {
// 			sprite.setHeading(endValue);
// 			return null;
// 		}
// 		let elapsed = Date.now() - this.context.startTime;
// 		let fraction = Math.max(Math.min(elapsed / milliSecs, 1), 0);
// 		sprite.setHeading(this.context.startValue + fraction * (endValue - this.context.startValue));

// 		this.pushContext("doYield");
// 		this.pushContext();
// 	} else {
// 		sprite.turnLeft(degrees);
// 	}
// };

// Process.prototype.translate_percent = function (percent, direction) {
// 	let sprite = this.blockReceiver();
// 	if (percent == 0) {
// 		return null;
// 	}
// 	if (!window.hide3DBlocks) {
// 		var vector;

// 		// set the initial direction
// 		if (direction[0] === "height") {
// 			vector = new THREE.Vector3(0, 0, 1);
// 		} else if (direction[0] === "width") {
// 			vector = new THREE.Vector3(0, 1, 0);
// 		} else {
// 			vector = new THREE.Vector3(1, 0, 0);
// 		}

// 		vector.applyQuaternion(sprite.object.quaternion);
// 		vector.multiplyScalar(percent);

// 		sprite.gotoXYZ(
// 			vector.x + sprite.object.position.x,
// 			vector.y + sprite.object.position.y,
// 			vector.z + sprite.object.position.z
// 		);
// 		sprite.positionTalkBubble();
// 		return null;
// 	}
// 	if (window.glide && !this.homeContext.receiver.isWarped) {
// 		var secs = 0.5;
// 		if (!this.context.startTime) {
// 			this.context.startTime = Date.now();
// 			this.context.startValue = new Point(sprite.xPosition(), sprite.yPosition());
// 			var dest,
// 				delta = radians(sprite.heading),
// 				width = 0,
// 				height = 0;
// 			var newX = 0,
// 				newY = 0,
// 				dist = 0,
// 				angle = 0,
// 				X = 0,
// 				Y = 0;

// 			if (sprite.costume != null) {
// 				width = sprite.costume.contents.width * sprite.scale;
// 				height = sprite.costume.contents.height * sprite.scale;
// 			} else {
// 				width = 32 * sprite.scale;
// 				height = 20 * sprite.scale;
// 			}
// 			if (direction[0] === "height") {
// 				newY = sprite.yPosition() + (height * percent) / 100;
// 				dist = Math.sqrt(Math.pow(sprite.yPosition() - newY, 2));
// 				angle = sprite.heading * (Math.PI / 180);
// 			} else {
// 				newX = sprite.xPosition() + (width * percent) / 100;
// 				dist = Math.sqrt(Math.pow(sprite.xPosition() - newX, 2));
// 				angle = sprite.heading * (Math.PI / 180) + Math.PI / 2;
// 			}
// 			if (dist != 0) {
// 				X = (-percent / Math.abs(percent)) * dist * Math.cos(angle) + sprite.xPosition();
// 				Y = (percent / Math.abs(percent)) * dist * Math.sin(angle) + sprite.yPosition();
// 				this.context.endValue = new Point(X, Y);
// 			} else {
// 				this.context.endValue = this.context.startValue;
// 			}
// 		}
// 		if (Date.now() - this.context.startTime >= secs * 1000) {
// 			sprite.gotoXY(this.context.endValue.x, this.context.endValue.y);
// 			return null;
// 		}
// 		sprite.glide(
// 			secs * 1000,
// 			this.context.endValue.x,
// 			this.context.endValue.y,
// 			Date.now() - this.context.startTime,
// 			this.context.startValue
// 		);

// 		this.pushContext("doYield");
// 		this.pushContext();
// 	} else {
// 		sprite.translate_percent(percent, direction);
// 	}
// };

// Process.prototype.flipYAxis = function () {
// 	let sprite = this.blockReceiver();
// 	if (window.glide && !this.homeContext.receiver.isWarped) {
// 		var milliSecs = 500;
// 		var end = false;
// 		if (!this.context.startTime) {
// 			this.context.startTime = Date.now();
// 			this.context.initialValue = jQuery.extend(true, {}, sprite.costumes.contents[sprite.getCostumeIdx() - 1]);
// 			this.context.initialX = sprite.xPosition();
// 			this.context.initialY = sprite.yPosition();
// 			this.context.initAngle = sprite.heading;
// 			if (Math.cos(90 - this.context.initAngle) > 0) {
// 				this.context.endAngle = 180 - this.context.initAngle;
// 			} else {
// 				this.context.endAngle = 90 - (this.context.initAngle - 90);
// 			}
// 		}
// 		var endX = -this.context.initialX;
// 		var costume = sprite.costumes.contents[sprite.getCostumeIdx() - 1],
// 			canvas = newCanvas(this.context.initialValue.extent()),
// 			ctx = canvas.getContext("2d");
// 		let elapsed = Date.now() - this.context.startTime;
// 		let fraction = Math.max(Math.min(elapsed / milliSecs, 1), 0);
// 		if (Date.now() - this.context.startTime >= milliSecs) {
// 			ctx.translate(this.context.initialValue.width(), 0);
// 			ctx.scale(-1, 1);
// 			sprite.gotoXY(endX, sprite.yPosition);
// 			sprite.setHeading(this.context.endAngle);
// 			end = true;
// 		} else {
// 			ctx.translate(this.context.initialValue.width() * 1 * fraction, 0);
// 			ctx.scale(1 - 2 * fraction, 1);
// 			sprite.gotoXY(this.context.initialX + (end - this.context.initialX) * 2 * fraction, this.context.initialY);
// 			sprite.setHeading((this.context.endAngle - this.context.initAngle) * fraction + this.context.initAngle);
// 		}
// 		ctx.drawImage(this.context.initialValue.contents, 0, 0);
// 		costume.contents = canvas;
// 		costume.rotationCenter = new Point(
// 			this.context.initialValue.width() - this.context.initialValue.rotationCenter.x,
// 			this.context.initialValue.rotationCenter.y
// 		);

// 		if (end) {
// 			(canvas = newCanvas(costume.extent())), (ctx = canvas.getContext("2d"));
// 			ctx.putImageData(costume.originalPixels, 0, 0);
// 			ctx.translate(costume.originalPixels.width, 0);
// 			ctx.translate(costume.width(), 0);
// 			ctx.scale(-1, 1);
// 			costume.originalPixels = ctx.getImageData(0, 0, costume.originalPixels.width, costume.originalPixels.height);
// 		}
// 		sprite.costumes.contents[sprite.getCostumeIdx() - 1] = costume;
// 		sprite.costume = costume;
// 		sprite.positionTalkBubble();
// 		sprite.drawNew();
// 		sprite.changed();
// 		if (end) {
// 			sprite.flippedY = !sprite.flippedY;
// 			sprite.isNotFlipBack = !sprite.isNotFlipBack;
// 			sprite.drawNew();
// 			sprite.changed();
// 			return null;
// 		}
// 		this.pushContext("doYield");
// 		this.pushContext();
// 	} else {
// 		sprite.flipYAxis();
// 	}
// };
function setScaleGlide(number) {
	let sprite = this.blockReceiver();

	var milliSecs = 500;
	if (!this.context.startTime) {
		this.context.startTime = Date.now();
		this.context.startValue = sprite.scale * 100;
	}
	if (Date.now() - this.context.startTime >= milliSecs) {
		sprite.setScale(number);
		return null;
	}
	if (number == sprite.scale * 100) {
		return null;
	}
	let elapsed = Date.now() - this.context.startTime;
	let fraction = Math.max(Math.min(elapsed / milliSecs, 1), 0);
	sprite.setScale(this.context.startValue + fraction * (number - this.context.startValue));
	this.pushContext("doYield");
	this.pushContext();
}

export default function enableGlideFeature(migrations, setMigration) {
	Process.prototype.setScaleGlide = setScaleGlide;

	migrations = {
		...migrations,
		setScaleGlide: {
			only: SpriteMorph,
			type: "command",
			category: "looks",
			spec: "glide set scale to %n %",
			defaults: [50],
		},
	};
	setMigration(migrations);
}
