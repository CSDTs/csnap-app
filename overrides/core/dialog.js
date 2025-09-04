/**
 * dialog.js
 *
 * Author: Andrew Hunn
 *
 * Overrides for the ProjectDialogMorph
 * Consists of changes for classrooms, project saving and loading options
 */

export let classroomList = [];
export let classroomListField = null;

export function init(ide, task) {
	// additional properties:
	this.ide = ide;
	this.task = task || "open"; // String describing what do do (open, save)
	this.source = ide.source;
	this.projectList = []; // [{name: , thumb: , notes:}]

	this.handle = null;
	this.srcBar = null;
	this.nameField = null;
	this.filterField = null;
	this.magnifyingGlass = null;
	this.listField = null;
	this.preview = null;
	this.notesText = null;
	this.notesField = null;
	this.deleteButton = null;
	this.shareButton = null;
	this.unshareButton = null;
	this.publishButton = null;
	this.unpublishButton = null;
	this.recoverButton = null;

	////////////////////////////////
	//Classrooms
	this.classroomList = [];
	this.classroomListField = null;

	////////////////////////////////

	// initialize inherited properties:
	ProjectDialogMorph.uber.init.call(
		this,
		this, // target
		null, // function
		null // environment
	);

	// override inherited properites:
	switch (this.task) {
		case "save":
			this.labelString = "Save Project";
			break;
		case "add":
			this.labelString = "Add Scene";
			break;
		default:
			// 'open'
			this.task = "open";
			this.labelString = "Open Project";
	}

	this.createLabel();
	this.key = "project" + task;

	// build contents
	if ((task === "open" || task === "add") && this.source === "disk") {
		// give the user a chance to switch to another source
		this.source = null;
		this.buildContents();
		this.projectList = [];
		this.listField.hide();
		this.source = "disk";
	} else {
		this.buildContents();
		this.onNextStep = () =>
			// yield to show "updating" message
			this.setSource(this.source);
	}
}

export function buildContents() {
	var thumbnail, notification;

	this.addBody(new Morph());
	this.body.color = this.color;

	this.srcBar = new AlignmentMorph("column", this.padding / 2);

	if (this.ide.cloudMsg) {
		notification = new TextMorph(
			this.ide.cloudMsg,
			10,
			null, // style
			false, // bold
			null, // italic
			null, // alignment
			null, // width
			null, // font name
			new Point(1, 1), // shadow offset
			WHITE // shadowColor
		);
		notification.refresh = nop;
		this.srcBar.add(notification);
	}

	// if (!this.ide.cloud.disabled) {
	this.addSourceButton("cloud", localize("Cloud"), "cloud");
	// }

	if (this.task === "open" || this.task === "add") {
		this.buildFilterField();
		this.addSourceButton("examples", localize("Tools"), "poster");
		if (this.ide.world().currentKey === 16) {
			// shift- clicked
			this.addSourceButton("local", localize("Browser"), "globe");
		}
	}
	this.addSourceButton("disk", localize("Computer"), "storage");

	this.srcBar.fixLayout();
	this.body.add(this.srcBar);

	if (this.task === "save") {
		this.nameField = new InputFieldMorph(this.ide.getProjectName());
		this.body.add(this.nameField);
	}

	this.listField = new ListMorph([]);
	this.fixListFieldItemColors();
	this.listField.fixLayout = nop;
	this.listField.edge = InputFieldMorph.prototype.edge;
	this.listField.fontSize = InputFieldMorph.prototype.fontSize;
	this.listField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
	this.listField.contrast = InputFieldMorph.prototype.contrast;
	this.listField.render = InputFieldMorph.prototype.render;
	this.listField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

	this.body.add(this.listField);

	this.preview = new Morph();
	this.preview.fixLayout = nop;
	this.preview.edge = InputFieldMorph.prototype.edge;
	this.preview.fontSize = InputFieldMorph.prototype.fontSize;
	this.preview.typeInPadding = InputFieldMorph.prototype.typeInPadding;
	this.preview.contrast = InputFieldMorph.prototype.contrast;
	this.preview.render = function (ctx) {
		InputFieldMorph.prototype.render.call(this, ctx);
		if (this.cachedTexture) {
			this.renderCachedTexture(ctx);
		} else if (this.texture) {
			this.renderTexture(this.texture, ctx);
		}
	};
	this.preview.renderCachedTexture = function (ctx) {
		ctx.drawImage(this.cachedTexture, this.edge, this.edge);
	};
	this.preview.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;
	this.preview.setExtent(this.ide.serializer.thumbnailSize.add(this.preview.edge * 2));

	this.body.add(this.preview);
	if (this.task === "save") {
		thumbnail = this.ide.scenes.at(1).stage.thumbnail(SnapSerializer.prototype.thumbnailSize);
		this.preview.texture = null;
		this.preview.cachedTexture = thumbnail;
		this.preview.rerender();
	}

	this.notesField = new ScrollFrameMorph();
	this.notesField.fixLayout = nop;

	this.notesField.edge = InputFieldMorph.prototype.edge;
	this.notesField.fontSize = InputFieldMorph.prototype.fontSize;
	this.notesField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
	this.notesField.contrast = InputFieldMorph.prototype.contrast;
	this.notesField.render = InputFieldMorph.prototype.render;
	this.notesField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

	this.notesField.acceptsDrops = false;
	this.notesField.contents.acceptsDrops = false;

	if (this.task === "open" || this.task === "add") {
		this.notesText = new TextMorph("");
	} else {
		// 'save'
		this.notesText = new TextMorph(this.ide.getProjectNotes());
		this.notesText.isEditable = true;
		this.notesText.enableSelecting();
	}

	this.notesField.isTextLineWrapping = true;
	this.notesField.padding = 3;
	this.notesField.setContents(this.notesText);
	this.notesField.setWidth(this.preview.width());

	this.body.add(this.notesField);
	if (this.task === "save") {
		this.classroomListField = new ListMorph([]);
		this.fixClassRoomItemColors();
		this.classroomListField.fixLayout = nop;
		this.classroomListField.edge = InputFieldMorph.prototype.edge;
		this.classroomListField.fontSize = InputFieldMorph.prototype.fontSize;
		this.classroomListField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
		this.classroomListField.contrast = InputFieldMorph.prototype.contrast;
		this.classroomListField.render = InputFieldMorph.prototype.render;
		this.classroomListField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;
		this.classroomListField.acceptsDrops = false;
		this.classroomListField.contents.acceptsDrops = false;
		this.classroomListField.isTextLineWrapping = true;
		this.classroomListField.padding = 3;
		this.classroomListField.setWidth(this.preview.width());
		// if (this.task ==='save'){
		this.body.add(this.classroomListField);
		// }
	}
	if (this.task === "open") {
		this.addButton("openProject", "Open");
		this.action = "openProject";
		this.recoverButton = this.addButton("recoveryDialog", "Recover", true);
		this.recoverButton.hide();
	} else if (this.task === "add") {
		this.addButton("addScene", "Add");
		this.action = "addScene";
		this.recoverButton = this.addButton("recoveryDialog", "Recover", true);
		this.recoverButton.hide();
	} else {
		// 'save'
		this.addButton("saveProject", "Save");
		this.action = "saveProject";
	}
	this.shareButton = this.addButton("shareProject", "Share", true);
	this.unshareButton = this.addButton("unshareProject", "Unshare", true);
	this.shareButton.hide();
	this.unshareButton.hide();
	this.publishButton = this.addButton("publishProject", "Publish", true);
	this.unpublishButton = this.addButton("unpublishProject", "Unpublish", true);
	this.publishButton.hide();
	this.unpublishButton.hide();
	this.deleteButton = this.addButton("deleteProject", "Delete");
	this.deleteButton.hide();
	this.addButton("cancel", "Cancel");

	if (notification) {
		this.setExtent(new Point(500, 360).add(notification.extent()));
	} else {
		this.setExtent(new Point(500, 360));
	}
	this.fixLayout();
}

export function setSource(source) {
	var msg, setting, classmsg;

	this.source = source;
	this.srcBar.children.forEach((button) => button.refresh());

	switch (this.source) {
		case "cloud":
			msg = this.ide.showMessage("Updating\nproject list...");
			this.projectList = [];
			this.ide.cloud.getProjectList(
				(response) => {
					// Don't show cloud projects if user has since switched panes.
					if (this.source === "cloud") {
						this.installCloudProjectList(response);
					}
					msg.destroy();
				},
				(err, lbl) => {
					// msg.destroy();
					this.ide.cloudError().call(null, err, lbl);
					this.ide.initializeCloud();
					//CSDT allow users to login if trying to save without logging in
				}
			);

			this.classroomList = [];
			this.ide.cloud.getClassroomList(
				(response) => {
					// Don't show cloud projects if user has since switched panes.
					if (this.source === "cloud" && this.task == "save") {
						this.installCloudClassroomList(response);
					}
					// classmsg.destroy();
				},
				(err, lbl) => {
					// classmsg.destroy();
					this.ide.cloudError().call(null, err, lbl);
				}
			);
			return;
		case "examples":
			this.classroomList = [];
			this.projectList = this.getExamplesProjectList();
			break;
		case "local":
			// deprecated, only for reading
			this.classroomList = [];
			this.projectList = this.getLocalProjectList();
			break;
		case "disk":
			this.classroomList = [];
			if (this.task === "save") {
				this.projectList = [];
			} else {
				this.destroy();
				if (this.task === "add") {
					setting = this.ide.isAddingScenes;
					this.ide.isAddingScenes = true;
					this.ide.importLocalFile();
					this.ide.isAddingScenes = setting;
				} else {
					this.ide.importLocalFile();
				}
				return;
			}
			break;
	}

	this.listField.destroy();
	this.listField = new ListMorph(
		this.projectList,
		this.projectList.length > 0
			? (element) => {
					return element.name || element;
				}
			: null,
		null,
		() => this.ok()
	);
	if (this.source === "disk") {
		this.listField.hide();
	}
	if (this.classroomListField !== null) {
		this.classroomListField.destroy();
	}

	this.classroomListField = new ListMorph(
		this.classroomList,
		this.classroomList.length > 0
			? function (element) {
					return element.team_name;
				}
			: null,
		null,
		function () {
			myself.ok();
		}
	);

	if (this.source !== "save") {
		this.classroomListField.hide();
	}

	this.fixListFieldItemColors();
	this.listField.fixLayout = nop;
	this.listField.edge = InputFieldMorph.prototype.edge;
	this.listField.fontSize = InputFieldMorph.prototype.fontSize;
	this.listField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
	this.listField.contrast = InputFieldMorph.prototype.contrast;
	this.listField.render = InputFieldMorph.prototype.render;
	this.listField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

	this.fixListFieldItemColors();
	this.classroomListField.fixLayout = nop;
	this.classroomListField.edge = InputFieldMorph.prototype.edge;
	this.classroomListField.fontSize = InputFieldMorph.prototype.fontSize;
	this.classroomListField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
	this.classroomListField.contrast = InputFieldMorph.prototype.contrast;
	this.classroomListField.render = InputFieldMorph.prototype.render;
	this.classroomListField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

	if (this.source === "local") {
		this.listField.action = (item) => {
			var src, xml;
			if (item === undefined) {
				return;
			}
			if (this.nameField) {
				this.nameField.setContents(item.name || "");
			}
			if (this.task === "open") {
				src = localStorage["-snap-project-" + item.name];
				if (src) {
					xml = this.ide.serializer.parse(src);
					this.notesText.text = xml.childNamed("notes").contents || "";
					this.notesText.rerender();
					this.notesField.contents.adjustBounds();
					this.preview.texture = xml.childNamed("thumbnail").contents || null;
					this.preview.cachedTexture = null;
					this.preview.rerender();
				}
			}
			this.edit();
			this.classroomListField.hide();
		};
	} else {
		// 'examples'; 'cloud' is initialized elsewhere
		this.listField.action = (item) => {
			var src, xml;
			if (item === undefined) {
				return;
			}
			if (this.nameField) {
				this.nameField.setContents(item.name || "");
			}
			src = this.ide.getURL(this.ide.resourceURL("Examples", item.fileName));
			xml = this.ide.serializer.parse(src);
			this.notesText.text = xml.childNamed("notes").contents || "";
			this.notesText.rerender();
			this.notesField.contents.adjustBounds();
			this.preview.texture = xml.childNamed("thumbnail").contents || null;
			this.preview.cachedTexture = null;
			this.preview.rerender();
			this.edit();
		};
	}
	this.body.add(this.listField);
	this.body.add(this.classroomListField);
	this.shareButton.hide();
	this.unshareButton.hide();

	if (this.task === "open" || this.task === "add") {
		this.recoverButton.hide();
	}

	this.publishButton.hide();
	this.unpublishButton.hide();
	if (this.source === "local") {
		// this.deleteButton.show();
	} else {
		// examples
		this.deleteButton.hide();
	}
	this.buttons.fixLayout();
	this.fixLayout();
	if (this.task === "open" || this.task === "add") {
		this.clearDetails();
	}
}

export function installCloudClassroomList(cl) {
	var myself = this;
	this.classroomList = cl || [];
	this.classroomList.sort(function (x, y) {
		return x.name < y.name ? -1 : 1;
	});

	this.classroomListField.destroy();
	this.classroomListField = new ListMorph(
		this.classroomList,
		this.classroomList.length > 0
			? function (element) {
					return element.team_name;
				}
			: null,
		[
			// format: display shared project names bold
			[
				"bold",
				function (proj) {
					return proj.approved === true;
				},
			],
		],
		function () {
			myself.ok();
		}
	);
	this.fixClassRoomItemColors();
	this.classroomListField.fixLayout = nop;
	this.classroomListField.edge = InputFieldMorph.prototype.edge;
	this.classroomListField.fontSize = InputFieldMorph.prototype.fontSize;
	this.classroomListField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
	this.classroomListField.contrast = InputFieldMorph.prototype.contrast;
	this.classroomListField.render = InputFieldMorph.prototype.render;
	this.classroomListField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;
	this.classroomListField.action = function (item) {
		if (item === undefined) {
			return;
		}

		if (item.team) {
			if (myself.ide.cloud.classroom_id === item.team) {
				console.log("classroom deselected");
				myself.classroomListField.deactivateIndex(myself.classroomListField.activeIndex());
				myself.ide.cloud.classroom_id = "";
			} else {
				console.log("classroom selected");
				myself.ide.cloud.classroom_id = item.team;
			}
			console.log(myself.ide.cloud.classroom_id || "No classroom id selected");
		}

		myself.edit();
	};

	if (this.classroomList.length > 0) {
		this.classroomListField.activateIndex(this.classroomListField.listContents.items.length - 1);
	}

	// this.classroomListField.select(this.classroomListField.elements[0], true);
	this.body.add(this.classroomListField);
	this.fixLayout();
}

export function fixClassRoomItemColors() {
	// remember to always fixLayout() afterwards for the changes
	// to take effect
	var myself = this;
	this.classroomListField.contents.children[0].alpha = 0;
	this.classroomListField.contents.children[0].children.forEach(function (item) {
		item.pressColor = myself.titleBarColor.darker(20);
		item.color = new Color(0, 0, 0, 0);
		item.noticesTransparentClick = true;
	});
}

export function openProject() {
	var proj = this.listField.selected,
		src;
	if (!proj) {
		return;
	}
	this.ide.source = this.source;
	if (this.source === "cloud") {
		this.openCloudProject(proj);
	} else if (this.source === "examples") {
		// Note "file" is a property of the parseResourceFile function.
		this.ide.source = "cloud";
		this.ide.cloud.project_id = null;
		this.ide.cloud.project_approved = false;
		this.ide.cloud.classroom_id = "";
		src = this.ide.getURL(this.ide.resourceURL("Examples", proj.fileName));
		this.ide.backup(() => this.ide.openProjectString(src));
		this.destroy();
	} else {
		// 'local'
		this.ide.source = null;
		this.ide.backup(() => this.ide.openProjectName(proj.name));
		this.destroy();
	}
}

export function rawOpenCloudProject(proj, delta) {
	this.ide.cloud.getProject(
		proj,
		delta,
		(clouddata) => {
			this.ide.source = "cloud";

			// this.ide.nextSteps([() => this.ide.openCloudDataString(clouddata)]);
			this.ide.nextSteps([
				() => this.ide.cloud.updateURL(proj.id),
				() => (this.ide.cloud.project_id = proj.id),
				() => (this.ide.cloud.application_id = proj.application),
				() => (this.ide.cloud.project_approved = proj.approved),
				() => (this.ide.cloud.classroom_id = proj.classroom),
				() => this.ide.droppedText(clouddata),
			]);
			location.hash = "";
			if (proj.ispublic) {
				location.hash =
					"#present:Username=" +
					encodeURIComponent(this.ide.cloud.username) +
					"&ProjectName=" +
					encodeURIComponent(proj.projectname);
			}
		},
		this.ide.cloudError()
	);
	this.destroy();
}

export function fixLayout() {
	var th = fontHeight(this.titleFontSize) + this.titlePadding * 2,
		thin = this.padding / 2,
		inputField = this.nameField || this.filterField;

	if (this.buttons && this.buttons.children.length > 0) {
		this.buttons.fixLayout();
	}

	if (this.body) {
		this.body.setPosition(this.position().add(new Point(this.padding, th + this.padding)));
		this.body.setExtent(
			new Point(this.width() - this.padding * 2, this.height() - this.padding * 3 - th - this.buttons.height())
		);
		this.srcBar.setPosition(this.body.position());

		inputField.setWidth(this.body.width() - this.srcBar.width() - this.padding * 6);
		inputField.setLeft(this.srcBar.right() + this.padding * 3);
		inputField.setTop(this.srcBar.top());

		this.listField.setLeft(this.srcBar.right() + this.padding);
		this.listField.setWidth(this.body.width() - this.srcBar.width() - this.preview.width() - this.padding - thin);
		this.listField.contents.children[0].adjustWidths();

		this.listField.setTop(inputField.bottom() + this.padding);
		this.listField.setHeight(this.body.height() - inputField.height() - this.padding);

		if (this.magnifyingGlass) {
			this.magnifyingGlass.setTop(inputField.top());
			this.magnifyingGlass.setLeft(this.listField.left());
		}

		this.preview.setRight(this.body.right());
		this.preview.setTop(inputField.bottom() + this.padding);

		this.notesField.setTop(this.preview.bottom() + thin);
		this.notesField.setLeft(this.preview.left());
		this.notesField.setHeight(this.body.bottom() - this.preview.bottom() - thin);
		if (this.classroomListField) {
			this.classroomListField.setTop(this.srcBar.bottom() + thin);
			this.classroomListField.setLeft(this.srcBar.left());
			this.classroomListField.setHeight(this.body.bottom() - this.srcBar.bottom() - thin);
			this.classroomListField.setWidth(this.srcBar.width());
			this.classroomListField.contents.children[0].adjustWidths();
		}
	}

	if (this.label) {
		this.label.setCenter(this.center());
		this.label.setTop(this.top() + (th - this.label.height()) / 2);
	}

	if (this.buttons && this.buttons.children.length > 0) {
		this.buttons.setCenter(this.center());
		this.buttons.setBottom(this.bottom() - this.padding);
	}

	// refresh shadow
	this.removeShadow();
	this.addShadow();
}

export function getExamplesProjectList() {
	return this.ide.getMediaList("Examples");
}

export function installCloudProjectList(pl) {
	this.projectList = pl[0] ? pl : [];

	// Filter projects based on CSnap Pro apps (might need to find a better way of doing this, or just make sure that they all can work)
	// let filteredProjectList = this.projectList.filter(function (p) {
	// 	if (p.application === 97 || p.application >= 103) return true;
	// 	else return false;
	// });
	// this.projectList = filteredProjectList;

	this.projectList.sort((x, y) =>
		// x.projectname.toLowerCase() < y.projectname.toLowerCase() ? -1 : 1
		x.name.toLowerCase() < y.name.toLowerCase() ? -1 : 1
	);

	this.listField.destroy();
	this.listField = new ListMorph(
		this.projectList,
		this.projectList.length > 0
			? (element) => {
					return element.name || element;
				}
			: null,
		[
			// format: display shared project names bold
			["bold", (proj) => proj.approved],
			["italic", (proj) => proj.ispublished],
		],
		() => this.ok()
	);
	this.fixListFieldItemColors();
	this.listField.fixLayout = nop;
	this.listField.edge = InputFieldMorph.prototype.edge;
	this.listField.fontSize = InputFieldMorph.prototype.fontSize;
	this.listField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
	this.listField.contrast = InputFieldMorph.prototype.contrast;
	this.listField.render = InputFieldMorph.prototype.render;
	this.listField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

	this.listField.action = (item) => {
		if (item === undefined) {
			return;
		}
		if (this.nameField) {
			this.nameField.setContents(item.name || "");
		}
		if (this.task === "open" || this.task === "add") {
			this.notesText.text = item.notes || "";
			this.notesText.rerender();
			this.notesField.contents.adjustBounds();
			this.preview.texture = "";
			this.preview.rerender();
			// we ask for the thumbnail when selecting a project
			this.ide.cloud.getThumbnail(
				item.screenshot_url,
				(thumbnail) => {
					this.preview.texture = thumbnail;
					this.preview.cachedTexture = null;
					this.preview.rerender();
				},
				(error) => {
					console.error(error);
				}
			);

			new SpeechBubbleMorph(
				new TextMorph(localize("last changed") + "\n" + item.when_modified, null, null, null, null, "center")
			).popUp(this.world(), this.preview.rightCenter().add(new Point(2, 0)));
		}
		if (item.approved) {
			this.shareButton.hide();
			this.unshareButton.show();
			if (item.ispublished) {
				this.publishButton.hide();
				this.unpublishButton.show();
			} else {
				this.publishButton.show();
				this.unpublishButton.hide();
			}
		} else {
			this.unshareButton.hide();
			// this.shareButton.show();
			this.publishButton.hide();
			this.unpublishButton.hide();
		}
		this.buttons.fixLayout();
		this.fixLayout();
		this.edit();
	};
	this.body.add(this.listField);
	if (this.task === "open" || this.task === "add") {
		// this.recoverButton.show();
	}
	// this.shareButton.show();
	this.unshareButton.hide();
	// this.deleteButton.show();
	this.buttons.fixLayout();
	this.fixLayout();
	if (this.task === "open" || this.task === "add") {
		this.clearDetails();
	}
}

export function saveCloudProject() {
	this.ide.source = "cloud";
	// this.ide.saveAsProjectToCloud();
	this.ide.saveProjectToCloud();
	this.destroy();
}

export function saveAsCloudProject() {
	this.ide.source = "cloud";
	this.ide.saveAsProjectToCloud();
	this.destroy();
}

export function saveProject() {
	var name = this.nameField.contents().text.text,
		notes = this.notesText.text;

	if (this.ide.getProjectNotes() !== notes) {
		this.ide.setProjectNotes(notes);
	}

	if (this.ide.cloud.classroom_id) {
		console.log(this.ide.cloud.classroom_id);
	}
	if (name) {
		if (this.source === "cloud") {
			// if (typeof this.ide.cloud.project_id !== "undefined" || Number.isFinite(this.ide.cloud.project_id)) {
			// 	this.ide.confirm(localize("Are you sure you want to replace") + '\n"' + name + '"?', "Replace Project", () => {
			// this.ide.setProjectName(name);
			// this.saveCloudProject();
			// 	// });
			// } else {
			this.ide.setProjectName(name);
			this.saveAsCloudProject();
			// }
		} else if (this.source === "disk") {
			this.ide.exportProject(name);
			this.ide.source = "disk";
			this.destroy();
		}
	}
}
