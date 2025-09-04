//stl.js

/**
 * This feature allows users to take whatever they have on the stage at the time
 * and create a STL file for 3D printing.
 *
 * Relies on:
 * The API view (StlUploadView) in /rpi_csdt_community/viewsets.py
 * Both options are added to userMenu() in ../core/stage.js
 * The python packages csdt_stl_tools and csdt_stl_converter
 * Both previously mentioned packages are maintained by Andrew Hunn (ahunn@umich.edu)
 *
 * Repositories:
 * - csdt_stl_tools - https://github.com/CSDTs/csdt_stl_tools
 * - csdt_stl_converter - https://github.com/CSDTs/Adinkra_extrusion_converter
 *
 * Additional Documentation: https://docs.google.com/document/d/1dkEE18c57dyifXEf-jxpAI8IP1ybXcsHqCkcuO1AexM/edit
 */

import { dataURItoBlob } from "../utils/createBlobFromURI.js";
import { createLabelInput, createText } from "../utils/createText.js";

/**
 * Creates the actual prompt for additional user customizations
 *
 * Part of DialogBoxMorph.prototype
 *
 * @param {string} title Title appearing at top of dialog box
 * @param {IDE_Morph} world IDE reference
 */
function promptForSTLParameters(title, world) {
	var inp = new AlignmentMorph("column", 2),
		bdy = new AlignmentMorph("column", this.padding),
		myself = this;

	/**
	 * InputFieldMorph: text, numeric, choices, isReadOnly
	 *
	 * Quick reference to values from python module for STL.
	 * baseParam: (default is False) specifies that a base is added; False would indicate not adding a base (this is the default option).
	 * smoothParam: {default is True} specifies that the image is smoothed before converting to STL; False would disable this feature (default option).
	 * negativeParam (default is False) specifies that the image is used to generate a square with the image object as a (default option is False).
	 * sizeParam: (default is [480, 360]) specifies that the image be resized to (256x256) (default option).
	 * scaleParam: (default is 0.1) scales the resulting STL mesh height to 1/10 (default option).
	 */

	let baseParam = new InputFieldMorph("False", false, { True: ["True"], False: ["False"] }, true);

	let smoothParam = new InputFieldMorph("True", false, { True: ["True"], False: ["False"] }, true);

	let negativeParam = new InputFieldMorph("False", false, { True: ["True"], False: ["False"] }, true);

	let xParam = new InputFieldMorph(`${world.children[0].stage.dimensions.x}`, true, null, false);
	let yParam = new InputFieldMorph(`${world.children[0].stage.dimensions.y}`, true, null, false);

	let scaleParam = new InputFieldMorph("0.1", true, null, false);

	inp.alignment = "left";
	inp.setColor(this.color);
	bdy.setColor(this.color);

	createLabelInput(inp, "Base: ", baseParam);
	inp.add(createText("A platform behind your design", 9));
	inp.add(createText(" ", 5));
	createLabelInput(inp, "Smooth:", smoothParam);
	inp.add(createText("Set False for more jagged edges", 9));
	inp.add(createText(" ", 5));
	createLabelInput(inp, "Negative: ", negativeParam);
	inp.add(createText("Inverse your design", 9));
	inp.add(createText(" ", 5));
	createLabelInput(inp, "X: ", xParam);
	inp.add(createText("Length of STL in pixels", 9));
	inp.add(createText(" ", 5));
	createLabelInput(inp, "Y: ", yParam);
	inp.add(createText("Width of STL in pixels", 9));
	inp.add(createText(" ", 5));
	createLabelInput(inp, "Z: ", scaleParam);
	inp.add(createText("STL mesh height", 9));
	inp.add(createText(" ", 5));

	baseParam.value = "False";

	bdy.add(inp);
	inp.fixLayout();
	bdy.fixLayout();

	this.labelString = title;
	this.createLabel();

	this.addBody(bdy);

	this.addButton("ok", "Download");
	this.addButton("cancel", "Cancel");
	this.fixLayout();

	this.accept = function () {
		DialogBoxMorph.prototype.accept.call(myself);
	};

	this.getInput = function () {
		let payload = {
			base: baseParam.getValue(),
			smooth: smoothParam.getValue(),
			negative: negativeParam.getValue(),
			size: [xParam.getValue() || 480, yParam.getValue() || 360],
			scale: scaleParam.getValue() || 0.1,
		};

		return payload;
	};
	this.popUp(world);
}

/**
 * Launches the prompt for STL conversions with more customizations users can choose from
 *
 * Part of IDE_Morph.prototype
 *
 */
function launchSTLParamsPrompt() {
	new DialogBoxMorph(null, (data) => {
		this.exportAsSTL(data);
	}).promptForSTLParameters("Advanced STL Download", world);
}

/**
 * Connects to the django app allowing stage 3d conversions
 *
 * Part of IDE_Morph.prototype
 *
 * @param {string} name
 * @param {} payload
 */
function exportAsSTL(payload = {}) {
	const myself = this;

	//Creates file from current stage
	let file = createFileFromStage(myself, payload);

	//Sends file to django api (/api/stl), creates, and returns stl
	requestSTLConversion(file, myself);
}

/**
 * Creates FormData to send to Django API
 *
 * @param {IDE_Morph} ide Instance of the ide
 * @param {Object} payload Parameters that can be set via advanced stl option
 * @returns FormData to be sent to django api
 */
const createFileFromStage = (ide, payload) => {
	if (!ide) return;
	let img_string = ide.stage.fullImage().toDataURL();
	let img = new FormData();
	img.append("file", dataURItoBlob(img_string), `${ide.getProjectName()}.png`);
	img.append("params", JSON.stringify(payload));

	return img;
};

/**
 * Sends the data to the api for conversion
 * @param {FormData} file The formData posted to the API
 * @param {IDE_Morph} ide The current instance of the IDE
 */
const requestSTLConversion = (file, ide) => {
	ide.cloud.getCSRFToken();
	const success = function (data) {
		if (data.stl) {
			downloadSTL(data.stl, ide.getProjectName());
			ide.showMessage("STL Downloaded! Check your download folder", 5);
		} else {
			err("STL missing from response");
		}
	};

	const err = function (err) {
		console.error(err);
		ide.showMessage("Something went wrong with the download. Try again later...", 5);
	};

	ide.showMessage("Creating STL, please wait...");
	$.ajax({
		type: "PUT",
		url: `/api/stl/`,
		data: file,
		processData: false,
		contentType: false,
		success: success,
	}).fail(err);
};

/**
 * Once STL is returned, this downloads it client side.
 *
 * @param {object} stl the returned stl from response
 * @param {*} name name of the stl (comes from ide project name)
 */
const downloadSTL = (stl, name) => {
	let blob = new Blob([stl]);
	let link = document.createElement("a");
	link.href = window.URL.createObjectURL(blob);
	link.download = `${name}.stl`;
	link.click();
};

export default function mergeChanges() {
	IDE_Morph.prototype.launchSTLParamsPrompt = launchSTLParamsPrompt;
	IDE_Morph.prototype.exportAsSTL = exportAsSTL;
	DialogBoxMorph.prototype.promptForSTLParameters = promptForSTLParameters;
}
