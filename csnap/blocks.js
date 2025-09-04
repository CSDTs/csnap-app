SyntaxElementMorph.prototype.labelParts = {
	...SyntaxElementMorph.prototype.labelParts,
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
