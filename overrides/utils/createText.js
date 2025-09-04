function createText(string, size = 10) {
	return new TextMorph(
		localize(string),
		size,
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

const createLabelInput = (alignment, label, input, width = 200) => {
	input.setWidth(width);
	alignment.add(createText(label));
	alignment.add(input);
};

export { createText, createLabelInput };
