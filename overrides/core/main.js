// import { Features_STL_DialogBoxMorph, Features_STL_IDE_Morph } from "../features/stls.js";
import mergeChanges from "../features/stls.js";
import * as BlockOverrides from "./blocks.js";
import * as CloudOverrides from "./cloud.js";
import * as ProjectDialogOverrides from "./dialog.js";
import * as LayoutOverrides from "./layout.js";
import * as Serializer from "./serializer.js";
import * as SpriteOverrides from "./sprites.js";
import * as StageOverrides from "./stage.js";

import enableGlideFeature from "../features/glide.js";
import enableNSTFeature from "../features/nst/nst_basic.js";

let { csdtSyntax, ...blockOverrides } = BlockOverrides;
let { shrinkToFit, getNoFit, noFit, ...spriteOverrides } = SpriteOverrides;

let jensBlocks = SpriteMorph.prototype.blocks;
let jensMigrations = SpriteMorph.prototype.blockMigrations;

let allNewBlocks = blockOverrides.csdtBlocks;
enableNSTFeature(allNewBlocks, (data) => (allNewBlocks = data));
enableGlideFeature(allNewBlocks, (data) => (allNewBlocks = data));

// Object.assign(DialogBoxMorph.prototype, Features_STL_DialogBoxMorph);
// Object.assign(IDE_Morph.prototype, Features_STL_IDE_Morph);

//Generic IDE_Morph overrides (layout, GUI, adding additional options to menus)
Object.assign(IDE_Morph.prototype, LayoutOverrides);

//Adds ability to convert stage to an STL for 3D printing
// Object.assign(IDE_Morph.prototype, STLConverter);

//Classrooms, Project Save and Load Prompts
ProjectRecoveryDialogMorph.prototype.classroomListField = null;
Object.assign(ProjectDialogMorph.prototype, ProjectDialogOverrides);

//SpriteMorph Overrides
Object.assign(SpriteMorph.prototype, spriteOverrides);
Object.assign(Costume.prototype, { shrinkToFit, getNoFit, noFit });

//StageMorph Overrides
Object.assign(StageMorph.prototype, StageOverrides);

//Project serializer and cloud functionality
Object.assign(SnapSerializer.prototype, Serializer);
Object.assign(Cloud.prototype, CloudOverrides);

//Blocks
Object.assign(SyntaxElementMorph.prototype.labelParts, {
	...SyntaxElementMorph.prototype.labelParts,
	...csdtSyntax,
});
// Object.assign(SpriteMorph.prototype, DefOverrides);

SpriteMorph.prototype.blockMigrations = {
	...SpriteMorph.prototype.blockMigrations,
	...blockOverrides.csdtMigrations,
};

SpriteMorph.prototype.initBlockMigrations = function () {
	SpriteMorph.prototype.blockMigrations = {
		...jensMigrations,
		...blockOverrides.csdtMigrations,
	};
};

SpriteMorph.prototype.initBlocks = function () {
	SpriteMorph.prototype.blocks = {
		...jensBlocks,
		...allNewBlocks,
	};
};

Object.assign(SpriteMorph.prototype, blockOverrides);

SpriteMorph.prototype.initBlockMigrations();
SpriteMorph.prototype.initBlocks();

ListMorph.prototype.deactivateIndex = function (idx) {
	var item = this.listContents.children[idx];
	if (!item) {
		return;
	}
	item.userState = "normal";
	item.rerender();
};

document.querySelector("#vis-progress button").addEventListener("click", () => {
	world.children[0].stop();
});

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
				t + ((row + 1) * yPadding + row * buttonHeight + border) + (i > 10 ? border / 2 : 0)
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
			new Point(this.categories.left() + this.categories.border, this.categories.children[11].top())
		);
		scroller.setWidth(this.categories.width() - this.categories.border * 2);
		scroller.setHeight(buttonHeight * 6 + yPadding * 5);

		for (i = 0; i < more; i += 1) {
			scroller.addContents(this.categories.children[11]);
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
mergeChanges();
