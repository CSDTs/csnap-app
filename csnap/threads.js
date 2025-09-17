Process.prototype.setScaleGlide = function (number) {
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
};
