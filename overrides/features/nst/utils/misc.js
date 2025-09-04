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
export { isCanvasBlank, handleGetParam, handleSetParam };
