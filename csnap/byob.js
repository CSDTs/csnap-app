BlockDialogMorph.prototype.fixCategoriesLayout = function () {
	var buttonWidth = this.categories.children[0].width(), // all the same
		buttonHeight = this.categories.children[0].height(), // all the same
		more = SpriteMorph.prototype.customCategories.size,
		xPadding = 15,
		yPadding = 2,
		border = 10, // this.categories.border,
		l = this.categories.left(),
		t = this.categories.top(),
		scroller,
		row,
		col,
		i;

	this.categories.setWidth(3 * xPadding + 2 * buttonWidth);

	this.categories.children.forEach((button, i) => {
		if (i < 8) {
			row = i % 4;
			col = Math.ceil((i + 1) / 4);
		} else if (i < 10) {
			row = 4;
			col = 3 - (10 - i);
		} else {
			row = i - 5;
			col = 1;
		}
		button.setPosition(
			new Point(
				l + (col * xPadding + (col - 1) * buttonWidth),
				t + ((row + 1) * yPadding + row * buttonHeight + border) + (i > 9 ? border / 2 : 0)
			)
		);
	});

	if (MorphicPreferences.isFlat) {
		this.categories.corner = 0;
		this.categories.border = 0;
		this.categories.edge = 0;
	}

	if (more > 6) {
		scroller = new ScrollFrameMorph(null, null, SpriteMorph.prototype.sliderColor.lighter());
		scroller.setColor(this.categories.color);
		scroller.acceptsDrops = false;
		scroller.contents.acceptsDrops = false;
		scroller.setPosition(
			new Point(this.categories.left() + this.categories.border, this.categories.children[10].top())
		);
		scroller.setWidth(this.categories.width() - this.categories.border * 2);
		scroller.setHeight(buttonHeight * 6 + yPadding * 5);

		for (i = 0; i < more; i += 1) {
			scroller.addContents(this.categories.children[10]);
		}
		this.categories.add(scroller);
		this.categories.setHeight(
			(6 + 1) * yPadding + 6 * buttonHeight + 6 * (yPadding + buttonHeight) + border + 2 + 2 * border
		);
	} else {
		this.categories.setHeight(
			(6 + 1) * yPadding + 6 * buttonHeight + (more ? more * (yPadding + buttonHeight) + border / 2 : 0) + 2 * border
		);
	}
};
