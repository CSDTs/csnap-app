export let classroomList = [];
export let classroomListField = null;

ProjectDialogMorph.prototype.originalInit = ProjectDialogMorph.prototype.init;

ProjectDialogMorph.prototype.init = function (ide, task) {
	this.originalInit(ide, task);

	//Classrooms
	this.classroomList = [];
	this.classroomListField = null;
};

ProjectDialogMorph.prototype.buildContents = function () {
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

	if (!this.ide.cloud.disabled) {
		this.addSourceButton("cloud", localize("Cloud"), "cloud");
	}

	if (this.task === "open" || this.task === "add") {
		this.buildFilterField();
		this.addSourceButton("examples", localize("Examples"), "poster");
		if (this.hasLocalProjects() || this.ide.world().currentKey === 16) {
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

	// For the classroom list field addition
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

		this.body.add(this.classroomListField);
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
	this.addButton("cancel", "Cancel");

	if (notification) {
		this.setExtent(new Point(500, 360).add(notification.extent()));
	} else {
		this.setExtent(new Point(500, 360));
	}
	this.fixLayout();
};

ProjectDialogMorph.prototype.setSource = function (source) {
	var msg, setting;

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
						this.installCloudProjectList(response.projects);
					}
					msg.destroy();
				},
				(err, lbl) => {
					// msg.destroy();
					this.ide.cloudError().call(null, err, lbl);
					//CSDT allow users to login if trying to save without logging in
					this.ide.initializeCloud();
				}
			);

			this.classroomList = [];
			this.ide.cloud.getClassroomList(
				(response) => {
					// Don't show cloud projects if user has since switched panes.
					if (this.source === "cloud" && this.task == "save") {
						this.installCloudClassroomList(response);
					}
				},
				(err, lbl) => {
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

	//Classroom list field start
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
	//Classroom list field end

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
	this.deleteButton.hide();
	// if (this.source === "local") {
	// 	this.deleteButton.show();
	// } else {
	// 	// examples
	// 	this.deleteButton.hide();
	// }
	this.buttons.fixLayout();
	this.fixLayout();
	if (this.task === "open" || this.task === "add") {
		this.clearDetails();
	}
};

ProjectDialogMorph.prototype.installCloudClassroomList = function (cl) {
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
};

ProjectDialogMorph.prototype.fixClassRoomItemColors = function () {
	// remember to always fixLayout() afterwards for the changes
	// to take effect
	var myself = this;
	this.classroomListField.contents.children[0].alpha = 0;
	this.classroomListField.contents.children[0].children.forEach(function (item) {
		item.pressColor = myself.titleBarColor.darker(20);
		item.color = new Color(0, 0, 0, 0);
		item.noticesTransparentClick = true;
	});
};

ProjectDialogMorph.prototype.openProject = function () {
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

		// Not sure why I am setting it back to cloud...
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
};

ProjectDialogMorph.prototype.rawOpenCloudProject = function (proj, delta) {
	this.ide.cloud.getProject(
		proj,
		delta,
		(clouddata) => {
			this.ide.source = "cloud";
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
};

ProjectDialogMorph.prototype.fixLayout = function () {
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
};

ProjectDialogMorph.prototype.installCloudProjectList = function (pl) {
	this.projectList = pl[0] ? pl : [];
	this.projectList.sort((x, y) => (x.name.toLowerCase() < y.name.toLowerCase() ? -1 : 1));

	this.listField.destroy();
	this.listField = new ListMorph(
		this.projectList,
		this.projectList.length > 0
			? (element) => {
					return element.projectname || element;
				}
			: null,
		[
			// format: display shared project names bold
			["bold", (proj) => proj.ispublic],
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
			this.nameField.setContents(item.projectname || "");
		}
		if (this.task === "open" || this.task === "add") {
			this.notesText.text = item.notes || "";
			this.notesText.rerender();
			this.notesField.contents.adjustBounds();
			this.preview.texture = "";
			this.preview.rerender();
			// we ask for the thumbnail when selecting a project
			this.ide.cloud.getThumbnail(item.screenshot_url, (thumbnail) => {
				this.preview.texture = thumbnail;
				this.preview.cachedTexture = null;
				this.preview.rerender();
			});
			new SpeechBubbleMorph(
				new TextMorph(localize("last changed") + "\n" + item.lastupdated, null, null, null, null, "center")
			).popUp(this.world(), this.preview.rightCenter().add(new Point(2, 0)));
		}
		if (item.ispublic) {
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
		this.recoverButton.show();
	}
	// this.shareButton.show();
	this.unshareButton.hide();
	// this.deleteButton.show();
	this.buttons.fixLayout();
	this.fixLayout();
	if (this.task === "open" || this.task === "add") {
		this.clearDetails();
	}
};

ProjectDialogMorph.prototype.saveAsCloudProject = function () {
	this.ide.source = "cloud";
	this.ide.saveAsProjectToCloud();
	this.destroy();
};

ProjectDialogMorph.prototype.saveProject = function () {
	var name = this.nameField.contents().text.text,
		notes = this.notesText.text;

	if (this.ide.getProjectNotes() !== notes) {
		this.ide.setProjectNotes(notes);
	}
	if (name) {
		if (this.source === "cloud") {
			// if (detect(this.projectList, (item) => item.projectname === name)) {
			// 	this.ide.confirm(localize("Are you sure you want to replace") + '\n"' + name + '"?', "Replace Project", () => {
			// 		this.ide.setProjectName(name);
			// 		this.saveCloudProject();
			// 	});
			// } else {
			// 	this.ide.setProjectName(name);
			// 	this.saveCloudProject();
			// }
			this.ide.setProjectName(name);
			this.saveAsCloudProject();
		} else if (this.source === "disk") {
			this.ide.exportProject(name);
			this.ide.source = "disk";
			this.destroy();
		}
	}
};

IDE_Morph.prototype.originalInit = IDE_Morph.prototype.init;

IDE_Morph.prototype.init = function (config) {
	////////////////////////////////
	// CSDT additional properties

	this.initialScaleSize = 1; // Set Stage Scale (for tutorials and such)

	// Alter Components for Tutorials and Workbooks
	this.hideCorralBar = false;
	this.hideCloudBtn = false;
	this.hideFileBtn = false;
	this.hideControlBtns = false;
	this.hideSpriteBar = false;
	this.hideCamera = true;
	this.renderBlocks = true;
	this.renderKeyboardButton = true;
	this.tutorialMode = false;

	// Applying correct asset path for projects
	this.asset_path = "/csnap_pro/csdt/";
	////////////////////////////////

	this.originalInit(config);
};

IDE_Morph.prototype.resourceURL = function () {
	var args = Array.prototype.slice.call(arguments, 0);
	return this.asset_path + args.join("/");
};

IDE_Morph.prototype.createCorral = function (keepSceneAlbum) {
	// assumes the corral bar has already been created
	var frame,
		padding = 5,
		myself = this,
		album = this.corral ? this.corral.album : null;

	this.createStageHandle();
	this.createPaletteHandle();

	if (this.corral) {
		this.corral.destroy();
	}

	this.corral = new Morph();
	this.corral.color = this.groupColor;
	this.corral.getRenderColor = ScriptsMorph.prototype.getRenderColor;

	// TODO Hide stage icon for tutorials IDE_Morph.prototype.hideCorralBar
	this.add(this.corral);

	this.corral.stageIcon = new SpriteIconMorph(this.stage);
	this.corral.stageIcon.isDraggable = false;
	this.corral.add(this.corral.stageIcon);

	frame = new ScrollFrameMorph(null, null, this.sliderColor);
	frame.acceptsDrops = false;
	frame.contents.acceptsDrops = false;

	frame.contents.wantsDropOf = (morph) => morph instanceof SpriteIconMorph;

	frame.contents.reactToDropOf = (spriteIcon) => this.corral.reactToDropOf(spriteIcon);

	frame.alpha = 0;

	this.sprites.asArray().forEach((morph) => {
		if (!morph.isTemporary) {
			frame.contents.add(new SpriteIconMorph(morph));
		}
	});

	this.corral.frame = frame;

	// TODO Hide frame icon for tutorials IDE_Morph.prototype.hideCorralBar
	this.corral.add(frame);

	// scenes corral
	this.corral.album = keepSceneAlbum ? album : new SceneAlbumMorph(this, this.sliderColor);
	this.corral.album.color = this.frameColor;
	this.corral.add(this.corral.album);

	this.corral.fixLayout = function () {
		this.stageIcon.setCenter(this.center());
		this.stageIcon.setLeft(this.left() + padding);

		// scenes
		if (myself.scenes.length() < 2) {
			this.album.hide();
		} else {
			this.stageIcon.setTop(this.top());
			this.album.show();
			this.album.setLeft(this.left());
			this.album.setTop(this.stageIcon.bottom() + padding);
			this.album.setWidth(this.stageIcon.width() + padding * 2);
			this.album.setHeight(this.height() - this.stageIcon.height() - padding);
		}

		this.frame.setLeft(this.stageIcon.right() + padding);
		this.frame.setExtent(new Point(this.right() - this.frame.left(), this.height()));
		this.arrangeIcons();
		this.refresh();
	};

	this.corral.arrangeIcons = function () {
		var x = this.frame.left(),
			y = this.frame.top(),
			max = this.frame.right(),
			start = this.frame.left();

		this.frame.contents.children.forEach((icon) => {
			var w = icon.width();

			if (x + w > max) {
				x = start;
				y += icon.height(); // they're all the same
			}
			icon.setPosition(new Point(x, y));
			x += w;
		});
		this.frame.contents.adjustBounds();
	};

	this.corral.addSprite = function (sprite) {
		this.frame.contents.add(new SpriteIconMorph(sprite));
		this.fixLayout();
		sprite.recordUserEdit("corral", "add", sprite.name);
	};

	this.corral.refresh = function () {
		this.stageIcon.refresh();
		this.frame.contents.children.forEach((icon) => icon.refresh());
	};

	this.corral.wantsDropOf = (morph) => morph instanceof SpriteIconMorph;

	this.corral.reactToDropOf = function (spriteIcon) {
		var idx = 1,
			pos = spriteIcon.position();
		spriteIcon.destroy();
		this.frame.contents.children.forEach((icon) => {
			if (pos.gt(icon.position()) || pos.y > icon.bottom()) {
				idx += 1;
			}
		});
		myself.sprites.add(spriteIcon.object, idx);
		myself.createCorral(true); // keep scenes
		myself.fixLayout();
	};
};

IDE_Morph.prototype.createCorralBar = function () {
	// assumes the stage has already been created
	var padding = 5,
		newbutton,
		paintbutton,
		cambutton,
		trashbutton,
		flag = true,
		myself = this,
		colors = IDE_Morph.prototype.isBright
			? this.tabColors
			: [this.groupColor, this.frameColor.darker(50), this.frameColor.darker(50)];

	if (this.corralBar) {
		flag = this.corralBar.isVisible;
		this.corralBar.destroy();
	}

	this.corralBar = new Morph();
	this.corralBar.color = this.frameColor;
	this.corralBar.isVisible = flag;
	this.corralBar.setHeight(this.logo.height()); // height is fixed
	this.corralBar.setWidth(this.stage.width());
	this.add(this.corralBar);

	// new sprite button
	newbutton = new PushButtonMorph(this, "addNewSprite", new SymbolMorph("turtle", 14));
	newbutton.corner = 12;
	newbutton.color = colors[0];
	newbutton.highlightColor = colors[1];
	newbutton.pressColor = colors[2];
	newbutton.labelMinExtent = new Point(36, 18);
	newbutton.padding = 0;
	newbutton.labelShadowOffset = new Point(-1, -1);
	newbutton.labelShadowColor = colors[1];
	newbutton.labelColor = this.buttonLabelColor;
	newbutton.contrast = this.buttonContrast;
	newbutton.hint = "add a new Turtle sprite";
	newbutton.fixLayout();
	newbutton.setCenter(this.corralBar.center());
	newbutton.setLeft(this.corralBar.left() + padding);
	// TODO Hide the turtle in the corral bar for tutorials IDE_Morph.prototype.hideCorralBar
	this.corralBar.add(newbutton);

	paintbutton = new PushButtonMorph(this, "paintNewSprite", new SymbolMorph("brush", 15));
	paintbutton.corner = 12;
	paintbutton.color = colors[0];
	paintbutton.highlightColor = colors[1];
	paintbutton.pressColor = colors[2];
	paintbutton.labelMinExtent = new Point(36, 18);
	paintbutton.padding = 0;
	paintbutton.labelShadowOffset = new Point(-1, -1);
	paintbutton.labelShadowColor = colors[1];
	paintbutton.labelColor = this.buttonLabelColor;
	paintbutton.contrast = this.buttonContrast;
	paintbutton.hint = "paint a new sprite";
	paintbutton.fixLayout();
	paintbutton.setCenter(this.corralBar.center());
	paintbutton.setLeft(this.corralBar.left() + padding + newbutton.width() + padding);
	// TODO Hide the brush in the corral bar for tutorials IDE_Morph.prototype.hideCorralBar
	this.corralBar.add(paintbutton);

	if (CamSnapshotDialogMorph.prototype.enableCamera) {
		cambutton = new PushButtonMorph(this, "newCamSprite", new SymbolMorph("camera", 15));
		cambutton.corner = 12;
		cambutton.color = colors[0];
		cambutton.highlightColor = colors[1];
		cambutton.pressColor = colors[2];
		cambutton.labelMinExtent = new Point(36, 18);
		cambutton.padding = 0;
		cambutton.labelShadowOffset = new Point(-1, -1);
		cambutton.labelShadowColor = colors[1];
		cambutton.labelColor = this.buttonLabelColor;
		cambutton.contrast = this.buttonContrast;
		cambutton.hint = "take a camera snapshot and\n" + "import it as a new sprite";
		cambutton.fixLayout();
		cambutton.setCenter(this.corralBar.center());
		cambutton.setLeft(this.corralBar.left() + padding + newbutton.width() + padding + paintbutton.width() + padding);
		this.corralBar.add(cambutton);
		document.addEventListener("cameraDisabled", (event) => {
			cambutton.disable();
			cambutton.hint = CamSnapshotDialogMorph.prototype.notSupportedMessage;
		});
	}

	// trash button
	trashbutton = new PushButtonMorph(this, "undeleteSprites", new SymbolMorph("trash", 18));
	trashbutton.corner = 12;
	trashbutton.color = colors[0];
	trashbutton.highlightColor = colors[1];
	trashbutton.pressColor = colors[2];
	trashbutton.labelMinExtent = new Point(36, 18);
	trashbutton.padding = 0;
	trashbutton.labelShadowOffset = new Point(-1, -1);
	trashbutton.labelShadowColor = colors[1];
	trashbutton.labelColor = this.buttonLabelColor;
	trashbutton.contrast = this.buttonContrast;
	// trashbutton.hint = "bring back deleted sprites";
	trashbutton.fixLayout();
	trashbutton.setCenter(this.corralBar.center());
	trashbutton.setRight(this.corralBar.right() - padding);
	// TODO Hide the trash in the corral bar for tutorials IDE_Morph.prototype.hideCorralBar
	this.corralBar.add(trashbutton);

	trashbutton.wantsDropOf = (morph) => morph instanceof SpriteMorph || morph instanceof SpriteIconMorph;

	trashbutton.reactToDropOf = (droppedMorph) => {
		if (droppedMorph instanceof SpriteMorph) {
			this.removeSprite(droppedMorph);
		} else if (droppedMorph instanceof SpriteIconMorph) {
			droppedMorph.destroy();
			this.removeSprite(droppedMorph.object);
		}
	};

	// Add the coordinates to the stage
	xlabel = new StringMorph(
		"X:        0",
		18,
		"sans-serif",
		true,
		false,
		false,
		MorphicPreferences.isFlat ? null : new Point(2, 1),
		this.frameColor.darker(this.buttonContrast)
	);
	ylabel = new StringMorph(
		"Y:        0",
		18,
		"sans-serif",
		true,
		false,
		false,
		MorphicPreferences.isFlat ? null : new Point(2, 1),
		this.frameColor.darker(this.buttonContrast)
	);

	// Coordinates Start
	xlabel.color = this.buttonLabelColor;
	ylabel.color = this.buttonLabelColor;

	xlabel.fixLayout();

	if (!IDE_Morph.prototype.hideCorralBar) {
		xlabel.setLeft(this.corralBar.left() + padding + (newbutton.width() + padding) * 2);
	} else {
		xlabel.setLeft(this.corralBar.left() + padding);
	}
	xlabel.rerender();
	this.corralBar.add(xlabel);

	ylabel.fixLayout();

	if (!IDE_Morph.prototype.hideCorralBar) {
		ylabel.setLeft(this.corralBar.left() + padding + (newbutton.width() + padding) * 2 + 100);
	} else {
		ylabel.setLeft(this.corralBar.left() + padding + 100);
	}

	ylabel.rerender();
	this.corralBar.add(ylabel);
	// Coordinates End

	this.corralBar.fixLayout = function () {
		function updateDisplayOf(button) {
			if (button && button.right() > trashbutton.left() - padding) {
				button.hide();
			} else {
				button.show();
			}
		}
		this.setWidth(myself.stage.width());
		trashbutton.setRight(this.right() - padding);
		updateDisplayOf(cambutton);
		updateDisplayOf(paintbutton);

		//TODO Hide the trash, camera, and brush in the corral bar for tutorials
		// if (!IDE_Morph.prototype.hideCorralBar) trashbutton.setRight(this.right() - padding);
		// if (!myself.hideCamera) updateDisplayOf(cambutton);
		// if (!IDE_Morph.prototype.hideCorralBar) updateDisplayOf(paintbutton);
	};

	//Update the XY Coordinates when user hovers over the stage
	this.corralBar.step = function () {
		this.parent.updateCorralCoordinates(xlabel, ylabel);
	};
};

IDE_Morph.prototype.createControlBar = function () {
	// assumes the logo has already been created
	var padding = 5,
		button,
		slider,
		stopButton,
		pauseButton,
		startButton,
		projectButton,
		settingsButton,
		stageSizeButton,
		appModeButton,
		steppingButton,
		cloudButton,
		x,
		colors = this.isBright ? this.tabColors : [this.groupColor, this.frameColor.darker(50), this.frameColor.darker(50)],
		activeColor = new Color(153, 255, 213),
		activeColors = [activeColor, activeColor.lighter(40), activeColor.lighter(40)],
		myself = this;

	if (this.controlBar) {
		this.controlBar.destroy();
	}

	this.controlBar = new Morph();
	this.controlBar.color = this.frameColor;
	this.controlBar.setHeight(this.logo.height()); // height is fixed

	// let users manually enforce re-layout when changing orientation
	// on mobile devices
	// Leaving it out, because it's most probably unneeded
	/*
    this.controlBar.mouseClickLeft = function () {
        this.world().fillPage();
    };
    */

	this.add(this.controlBar);

	//smallStageButton
	button = new ToggleButtonMorph(
		null, //colors,
		this, // the IDE is the target
		"toggleStageSize",
		[new SymbolMorph("smallStage", 14), new SymbolMorph("normalStage", 14)],
		() => this.isSmallStage // query
	);

	button.hasNeutralBackground = true;
	button.corner = 12;
	button.color = colors[0];
	button.highlightColor = colors[1];
	button.pressColor = colors[0];
	button.labelMinExtent = new Point(36, 18);
	button.padding = 0;
	button.labelShadowOffset = new Point(-1, -1);
	button.labelShadowColor = colors[1];
	button.labelColor = this.isBright ? WHITE : this.buttonLabelColor;
	button.contrast = this.buttonContrast;
	// button.hint = 'stage size\nsmall & normal';
	button.fixLayout();
	button.refresh();
	stageSizeButton = button;
	// TODO Hide the stage size button for tutorials IDE_Morph.prototype.hideControlBtns
	this.controlBar.add(stageSizeButton);

	this.controlBar.stageSizeButton = button; // for refreshing

	//appModeButton
	button = new ToggleButtonMorph(
		null, //colors,
		this, // the IDE is the target
		"toggleAppMode",
		[new SymbolMorph("fullScreen", 14), new SymbolMorph("normalScreen", 14)],
		() => this.isAppMode // query
	);

	button.hasNeutralBackground = true;
	button.corner = 12;
	button.color = colors[0];
	button.highlightColor = colors[1];
	button.pressColor = colors[0];
	button.labelMinExtent = new Point(36, 18);
	button.padding = 0;
	button.labelShadowOffset = new Point(-1, -1);
	button.labelShadowColor = colors[1];
	button.labelColor = this.buttonLabelColor;
	button.contrast = this.buttonContrast;
	// button.hint = 'app & edit\nmodes';
	button.fixLayout();
	button.refresh();
	appModeButton = button;
	// TODO Hide the app mode button for tutorials IDE_Morph.prototype.hideControlBtns
	this.controlBar.add(appModeButton);

	this.controlBar.appModeButton = appModeButton; // for refreshing

	//steppingButton
	button = new ToggleButtonMorph(
		null, //colors,
		this, // the IDE is the target
		"toggleSingleStepping",
		[new SymbolMorph("footprints", 16), new SymbolMorph("footprints", 16)],
		() => Process.prototype.enableSingleStepping // query
	);

	button.corner = 12;
	button.color = colors[0];
	button.highlightColor = colors[1];
	button.pressColor = activeColor;
	button.labelMinExtent = new Point(36, 18);
	button.padding = 0;
	button.labelShadowOffset = new Point(-1, -1);
	button.labelShadowColor = colors[1];
	button.labelColor = this.buttonLabelColor;
	button.contrast = this.buttonContrast;
	button.hint = "Visible stepping";
	button.fixLayout();
	button.refresh();
	steppingButton = button;

	// TODO Hide the stepping button for tutorials IDE_Morph.prototype.hideControlBtns
	this.controlBar.add(steppingButton);

	this.controlBar.steppingButton = steppingButton; // for refreshing

	if (this.performerMode) {
		appModeButton.hide();
		stageSizeButton.hide();
	}

	// stopButton
	button = new ToggleButtonMorph(
		null, // colors
		this, // the IDE is the target
		"stopAllScripts",
		[new SymbolMorph("octagon", 14), new SymbolMorph("square", 14)],
		() =>
			this.stage // query
				? myself.stage.enableCustomHatBlocks && myself.stage.threads.pauseCustomHatBlocks
				: true
	);

	button.corner = 12;
	button.color = colors[0];
	button.highlightColor = colors[1];
	button.pressColor = colors[2];
	button.labelMinExtent = new Point(36, 18);
	button.padding = 0;
	button.labelShadowOffset = new Point(-1, -1);
	button.labelShadowColor = colors[1];
	button.labelColor = new Color(this.isBright ? 128 : 200, 0, 0);
	button.contrast = this.buttonContrast;
	// button.hint = 'stop\nevery-\nthing';
	button.fixLayout();
	button.refresh();
	stopButton = button;
	this.controlBar.add(stopButton);
	this.controlBar.stopButton = stopButton; // for refreshing

	//pauseButton
	button = new ToggleButtonMorph(
		null, //colors,
		this, // the IDE is the target
		"togglePauseResume",
		[new SymbolMorph("pause", 12), new SymbolMorph("pointRight", 14)],
		() => this.isPaused() // query
	);

	button.hasNeutralBackground = true;
	button.corner = 12;
	button.color = colors[0];
	button.highlightColor = colors[1];
	button.pressColor = colors[0];
	button.labelMinExtent = new Point(36, 18);
	button.padding = 0;
	button.labelShadowOffset = new Point(-1, -1);
	button.labelShadowColor = colors[1];
	button.labelColor = this.isBright ? new Color(220, 185, 0) : new Color(255, 220, 0);
	button.contrast = this.buttonContrast;
	// button.hint = 'pause/resume\nall scripts';
	button.fixLayout();
	button.refresh();
	pauseButton = button;
	this.controlBar.add(pauseButton);
	this.controlBar.pauseButton = pauseButton; // for refreshing

	// startButton
	button = new PushButtonMorph(this, "pressStart", new SymbolMorph("flag", 14));
	button.corner = 12;
	button.color = colors[0];
	button.highlightColor = colors[1];
	button.pressColor = colors[2];
	button.labelMinExtent = new Point(36, 18);
	button.padding = 0;
	button.labelShadowOffset = new Point(-1, -1);
	button.labelShadowColor = colors[1];
	button.fps = 4;
	button.isActive = false;

	button.step = function () {
		var isRunning;
		if (!myself.stage) {
			return;
		}
		isRunning = !!myself.stage.threads.processes.length;
		if (isRunning === this.isActive) {
			return;
		}
		this.isActive = isRunning;
		if (isRunning) {
			this.color = activeColors[0];
			this.highlightColor = activeColors[1];
			this.pressColor = activeColors[2];
		} else {
			this.color = colors[0];
			this.highlightColor = colors[1];
			this.pressColor = colors[2];
		}
		this.rerender();
	};

	button.labelColor = new Color(0, this.isBright ? 100 : 200, 0);
	button.contrast = this.buttonContrast;
	// button.hint = 'start green\nflag scripts';
	button.fixLayout();
	startButton = button;
	this.controlBar.add(startButton);
	this.controlBar.startButton = startButton;

	// steppingSlider
	slider = new SliderMorph(61, 1, Process.prototype.flashTime * 100 + 1, 6, "horizontal");
	slider.action = (num) => {
		Process.prototype.flashTime = (num - 1) / 100;
		this.controlBar.refreshResumeSymbol();
	};
	// slider.alpha = MorphicPreferences.isFlat ? 0.1 : 0.3;
	slider.color = activeColor;
	slider.alpha = 0.3;
	slider.setExtent(new Point(50, 14));
	this.controlBar.add(slider);
	this.controlBar.steppingSlider = slider;

	// projectButton
	button = new PushButtonMorph(
		this,
		"projectMenu",
		new SymbolMorph("file", 14)
		//'\u270E'
	);
	button.corner = 12;
	button.color = colors[0];
	button.highlightColor = colors[1];
	button.pressColor = colors[2];
	button.labelMinExtent = new Point(36, 18);
	button.padding = 0;
	button.labelShadowOffset = new Point(-1, -1);
	button.labelShadowColor = colors[1];
	button.labelColor = this.buttonLabelColor;
	button.contrast = this.buttonContrast;
	// button.hint = 'open, save, & annotate project';
	button.fixLayout();
	projectButton = button;

	// TODO Hide the project button for tutorials IDE_Morph.prototype.hideFileBtn
	this.controlBar.add(projectButton);

	this.controlBar.projectButton = projectButton; // for menu positioning

	// settingsButton
	button = new PushButtonMorph(
		this,
		"settingsMenu",
		new SymbolMorph("gears", 14)
		//'\u2699'
	);
	button.corner = 12;
	button.color = colors[0];
	button.highlightColor = colors[1];
	button.pressColor = colors[2];
	button.labelMinExtent = new Point(36, 18);
	button.padding = 0;
	button.labelShadowOffset = new Point(-1, -1);
	button.labelShadowColor = colors[1];
	button.labelColor = this.buttonLabelColor;
	button.contrast = this.buttonContrast;
	// button.hint = 'edit settings';
	button.fixLayout();
	settingsButton = button;

	// TODO Hide the settings button for tutorials IDE_Morph.prototype.hideControlBtns
	this.controlBar.add(settingsButton);

	this.controlBar.settingsButton = settingsButton; // for menu positioning

	// cloudButton
	button = new ToggleButtonMorph(
		null, //colors,
		this, // the IDE is the target
		"cloudMenu",
		[new SymbolMorph("cloudOutline", 11), new SymbolMorph("cloud", 11)],
		() => !isNil(this.cloud.username) // query
	);

	button.hasNeutralBackground = true;
	button.corner = 12;
	button.color = colors[0];
	button.highlightColor = colors[1];
	button.pressColor = colors[0];
	button.labelMinExtent = new Point(36, 18);
	button.padding = 0;
	button.labelShadowOffset = new Point(-1, -1);
	button.labelShadowColor = colors[1];
	button.labelColor = this.buttonLabelColor;
	button.contrast = this.buttonContrast;
	// button.hint = 'cloud operations';
	button.fixLayout();
	button.refresh();
	cloudButton = button;

	// TODO Hide the cloud button for tutorials IDE_Morph.prototype.hideCloudBtn
	this.controlBar.add(cloudButton);

	this.controlBar.cloudButton = cloudButton; // for menu positioning & refresh

	this.controlBar.fixLayout = function () {
		x = this.right() - padding;
		[stopButton, pauseButton, startButton].forEach((button) => {
			button.setCenter(myself.controlBar.center());
			button.setRight(x);
			x -= button.width();
			x -= padding;
		});

		x = startButton.left() - (3 * padding + 2 * stageSizeButton.width());
		if (!myself.config.noSprites) {
			x = Math.min(
				x,
				myself.right() -
					myself.stage.dimensions.x * (myself.isSmallStage ? myself.stageRatio : 1) -
					(myself.config.border || 0)
			);
			x = Math.max(x, this.left());
		}
		[stageSizeButton, appModeButton].forEach((button) => {
			x += padding;
			button.setCenter(myself.controlBar.center());
			button.setLeft(x);
			x += button.width();
		});

		slider.setCenter(myself.controlBar.center());
		if (myself.performerMode) {
			slider.setRight(startButton.left() - padding);
		} else {
			slider.setRight(stageSizeButton.left() - padding);
		}

		steppingButton.setCenter(myself.controlBar.center());
		steppingButton.setRight(slider.left() - padding);

		settingsButton.setCenter(myself.controlBar.center());
		settingsButton.setLeft(this.left());

		if (myself.config.hideSettings) {
			settingsButton.hide();
		}

		projectButton.setCenter(myself.controlBar.center());

		if (myself.config.noImports || myself.config.hideProjects) {
			projectButton.hide();
		}

		if (myself.cloud.disabled) {
			cloudButton.hide();
			projectButton.setRight(settingsButton.left() - padding);
		} else {
			cloudButton.setCenter(myself.controlBar.center());
			cloudButton.setRight(settingsButton.left() - padding);
			projectButton.setRight(cloudButton.left() - padding);
		}

		this.refreshSlider();
		this.updateLabel();
	};

	this.controlBar.refreshSlider = function () {
		if (Process.prototype.enableSingleStepping && !myself.isAppMode) {
			slider.fixLayout();
			slider.rerender();
			slider.show();
		} else {
			slider.hide();
		}
		this.refreshResumeSymbol();
	};

	this.controlBar.refreshResumeSymbol = function () {
		var pauseSymbols;
		if (Process.prototype.enableSingleStepping && Process.prototype.flashTime > 0.5) {
			myself.stage.threads.pauseAll(myself.stage);
			pauseSymbols = [new SymbolMorph("pause", 12), new SymbolMorph("stepForward", 14)];
		} else {
			pauseSymbols = [new SymbolMorph("pause", 12), new SymbolMorph("pointRight", 14)];
		}
		pauseButton.labelString = pauseSymbols;
		pauseButton.createLabel();
		pauseButton.fixLayout();
		pauseButton.refresh();
	};

	this.controlBar.updateLabel = function () {
		var prefix = myself.hasUnsavedEdits() ? "\u270E " : "",
			suffix = myself.world().isDevMode ? " - " + localize("development mode") : "",
			name,
			scene,
			txt;

		if (this.label) {
			this.label.destroy();
		}
		if (myself.isAppMode || myself.config.hideProjectName) {
			return;
		}
		scene = myself.scenes.at(1) !== myself.scene ? " (" + myself.scene.name + ")" : "";
		name = myself.getProjectName() || localize("untitled");
		if (!myself.config.preserveTitle) {
			document.title = "Snap! " + (myself.getProjectName() ? name : SnapVersion);
		}
		txt = new StringMorph(
			prefix + name + scene + suffix,
			14,
			"sans-serif",
			true,
			false,
			false,
			IDE_Morph.prototype.isBright ? null : new Point(2, 1),
			myself.frameColor.darker(myself.buttonContrast)
		);
		txt.color = myself.buttonLabelColor;

		this.label = new FrameMorph();
		this.label.acceptsDrops = false;
		this.label.alpha = 0;
		txt.setPosition(this.label.position());
		this.label.add(txt);
		this.label.setExtent(new Point(steppingButton.left() - settingsButton.right() - padding * 2, txt.height()));
		this.label.setCenter(this.center());
		this.label.setLeft(this.settingsButton.right() + padding);
		this.add(this.label);
	};
};

// Updates the x y coordinates in the corral bar
IDE_Morph.prototype.updateCorralCoordinates = function (xlabel, ylabel) {
	var MouseX = this.stage.reportMouseX();
	var MouseY = this.stage.reportMouseY();
	var myself = this;

	Morph.prototype.trackChanges = false;
	if (
		MouseX > StageMorph.prototype.dimensions.x / 2 ||
		MouseY > StageMorph.prototype.dimensions.y / 2 ||
		MouseX < StageMorph.prototype.dimensions.x / -2 ||
		MouseY < StageMorph.prototype.dimensions.y / -2
	) {
		xlabel.text = "";
		ylabel.text = "";
	} else {
		xlabel.text = "X: " + Math.round(this.stage.reportMouseX());
		ylabel.text = "Y: " + Math.round(this.stage.reportMouseY());
	}
	Morph.prototype.trackChanges = true;

	//update only if the coordinates have changed to save CPU
	if (this.corralBarOldX != xlabel.text || this.corralBarOldY != ylabel.text) {
		this.corralBarOldX = xlabel.text;
		this.corralBarOldY = ylabel.text;
		xlabel.rerender();
		ylabel.rerender();

		this.corralBar.changed();
	}
};

IDE_Morph.prototype.createCategories = function () {
	var myself = this,
		categorySelectionAction = this.scene.unifiedPalette ? scrollToCategory : changePalette,
		categoryQueryAction = this.scene.unifiedPalette ? queryTopCategory : queryCurrentCategory,
		shift = this.config.noDefaultCat ? 4 : 0,
		flag = true;

	if (this.categories) {
		flag = this.categories.isVisible;
		this.categories.destroy();
	}
	this.categories = new Morph();
	this.categories.color = this.groupColor;
	this.categories.bounds.setWidth(this.paletteWidth);
	this.categories.buttons = [];
	this.categories.isVisible = flag;

	this.categories.droppedImage = (aCanvas, name, embeddedData) => {
		this.droppedImage(aCanvas, name, embeddedData, "categories");
	};

	this.categories.refresh = function () {
		this.buttons.forEach((cat) => {
			cat.refresh();
			if (cat.state) {
				cat.scrollIntoView();
			}
		});
	};

	this.categories.refreshEmpty = function () {
		var dict = myself.currentSprite.emptyCategories();
		dict.variables = dict.variables || dict.lists || dict.other;
		this.buttons.forEach((cat) => {
			if (Object.hasOwn(dict, cat.category) && dict[cat.category]) {
				cat.enable();
			} else {
				cat.disable();
			}
		});
	};

	function changePalette(category) {
		return () => {
			myself.currentCategory = category;
			myself.categories.buttons.forEach((each) => each.refresh());
			myself.refreshPalette(true);
		};
	}

	function scrollToCategory(category) {
		return () => myself.scrollPaletteToCategory(category);
	}

	function queryCurrentCategory(category) {
		return () => myself.currentCategory === category;
	}

	function queryTopCategory(category) {
		return () => myself.topVisibleCategoryInPalette() === category;
	}

	function addCategoryButton(category) {
		var labelWidth = 75,
			colors = [
				myself.frameColor,
				myself.frameColor.darker(IDE_Morph.prototype.isBright ? 5 : 50),
				SpriteMorph.prototype.blockColor[category],
			],
			button;

		button = new ToggleButtonMorph(
			colors,
			myself, // the IDE is the target
			categorySelectionAction(category),
			category[0].toUpperCase().concat(category.slice(1)), // label
			categoryQueryAction(category), // query
			null, // env
			null, // hint
			labelWidth, // minWidth
			true // has preview
		);

		button.category = category;
		button.corner = 8;
		button.padding = 0;
		button.labelShadowOffset = new Point(-1, -1);
		button.labelShadowColor = IDE_Morph.prototype.isBright ? CLEAR : colors[1];
		button.labelColor = myself.buttonLabelColor;
		if (IDE_Morph.prototype.isBright) {
			button.labelPressColor = WHITE;
		}
		button.fixLayout();
		button.refresh();
		myself.categories.add(button);
		myself.categories.buttons.push(button);
		return button;
	}

	function addCustomCategoryButton(category, color) {
		var labelWidth = 168,
			colors = [myself.frameColor, myself.frameColor.darker(IDE_Morph.prototype.isBright ? 5 : 50), color],
			button;

		button = new ToggleButtonMorph(
			colors,
			myself, // the IDE is the target
			categorySelectionAction(category),
			category, // label
			categoryQueryAction(category), // query
			null, // env
			null, // hint
			labelWidth, // minWidth
			true // has preview
		);

		button.category = category;
		button.corner = 8;
		button.padding = 0;
		button.labelShadowOffset = new Point(-1, -1);
		button.labelShadowColor = IDE_Morph.prototype.isBright ? CLEAR : colors[1];
		button.labelColor = myself.buttonLabelColor;
		if (IDE_Morph.prototype.isBright) {
			button.labelPressColor = WHITE;
		}
		button.fixLayout();
		button.refresh();
		myself.categories.add(button);
		myself.categories.buttons.push(button);
		return button;
	}

	function fixCategoriesLayout() {
		var buttonWidth = myself.categories.children[0].width(),
			buttonHeight = myself.categories.children[0].height(),
			more = SpriteMorph.prototype.customCategories.size,
			border = 3,
			xPadding =
				(200 - // myself.logo.width()
					border -
					buttonWidth * 2) /
				3,
			yPadding = 2,
			l = myself.categories.left(),
			t = myself.categories.top(),
			scroller,
			row,
			col,
			i;

		myself.categories.children.forEach((button, i) => {
			row = i < 8 ? i % 4 : i - 4;
			col = i < 4 || i > 7 ? 1 : 2;
			button.setPosition(
				new Point(
					l + (col * xPadding + (col - 1) * buttonWidth),
					t + ((row - shift + 1) * yPadding + (row - shift) * buttonHeight + border) + (i > 7 ? border + 2 : 0)
				)
			);
		});

		if (shift) {
			// hide the built-in category buttons
			for (i = 0; i < 8; i += 1) {
				myself.categories.children[i].hide();
			}
		}

		if (more > 6) {
			scroller = new ScrollFrameMorph(null, null, myself.sliderColor);
			scroller.setColor(myself.groupColor);
			scroller.acceptsDrops = false;
			scroller.contents.acceptsDrops = false;
			scroller.setPosition(new Point(0, myself.categories.children[8].top()));
			scroller.setWidth(myself.paletteWidth);
			scroller.setHeight(buttonHeight * 6 + yPadding * 5);

			for (i = 0; i < more; i += 1) {
				scroller.addContents(myself.categories.children[8]);
			}
			myself.categories.add(scroller);
			myself.categories.scroller = scroller;
			myself.categories.setHeight(
				(4 + 1 - shift) * yPadding +
					(4 - shift) * buttonHeight +
					6 * (yPadding + buttonHeight) +
					border +
					2 +
					2 * border
			);
		} else {
			myself.categories.setHeight(
				(4 + 1 - shift) * yPadding +
					(4 - shift) * buttonHeight +
					(more ? more * (yPadding + buttonHeight) + border + 2 : 0) +
					2 * border
			);
		}
	}

	// TODO De-categorizes the blocks for tutorials
	// if (!StageMorph.prototype.decategorize) {
	// 	SpriteMorph.prototype.categories.forEach((cat) => {
	// 		if (!contains(["lists", "other"], cat)) {
	// 			addCategoryButton(cat);
	// 		}
	// 	});
	// }

	SpriteMorph.prototype.categories.forEach((cat) => {
		if (!contains(["lists", "other"], cat)) {
			addCategoryButton(cat);
		}
	});

	// sort alphabetically
	Array.from(SpriteMorph.prototype.customCategories.keys())
		.sort()
		.forEach((name) => addCustomCategoryButton(name, SpriteMorph.prototype.customCategories.get(name)));

	// TODO De-categorizes the blocks for tutorials, tweaks the layout based on it
	// if (!StageMorph.prototype.decategorize) fixCategoriesLayout();
	// if (StageMorph.prototype.decategorize) this.categories.setHeight(84);
	fixCategoriesLayout();
	this.add(this.categories);
};

IDE_Morph.prototype.createSpriteBar = function () {
	// assumes that the categories pane has already been created
	var rotationStyleButtons = [],
		thumbSize = new Point(45, 45),
		nameField,
		padlock,
		thumbnail,
		tabCorner = 15,
		tabColors = this.tabColors,
		tabBar = new AlignmentMorph("row", -tabCorner * 2),
		tab,
		symbols = [
			new SymbolMorph("arrowRightThin", 10),
			new SymbolMorph("turnAround", 10),
			new SymbolMorph("arrowLeftRightThin", 10),
		],
		labels = ["don't rotate", "can rotate", "only face left/right"],
		myself = this;

	if (this.spriteBar) {
		this.spriteBar.destroy();
	}

	this.spriteBar = new Morph();
	this.spriteBar.color = this.frameColor;
	this.add(this.spriteBar);

	function addRotationStyleButton(rotationStyle) {
		var colors = myself.rotationStyleColors,
			button;

		button = new ToggleButtonMorph(
			colors,
			myself, // the IDE is the target
			() => {
				if (myself.currentSprite instanceof SpriteMorph) {
					myself.currentSprite.rotationStyle = rotationStyle;
					myself.currentSprite.changed();
					myself.currentSprite.fixLayout();
					myself.currentSprite.rerender();
					myself.currentSprite.recordUserEdit("sprite", "rotation", rotationStyle);
				}
				rotationStyleButtons.forEach((each) => each.refresh());
			},
			symbols[rotationStyle], // label
			() =>
				myself.currentSprite instanceof SpriteMorph && // query
				myself.currentSprite.rotationStyle === rotationStyle,
			null, // environment
			localize(labels[rotationStyle])
		);

		button.corner = 8;
		button.labelMinExtent = new Point(11, 11);
		button.padding = 0;
		button.labelShadowOffset = new Point(-1, -1);
		button.labelShadowColor = colors[1];
		button.labelColor = myself.buttonLabelColor;
		button.fixLayout();
		button.refresh();
		rotationStyleButtons.push(button);
		button.setPosition(myself.spriteBar.position().add(new Point(2, 4)));
		button.setTop(button.top() + (rotationStyleButtons.length - 1) * (button.height() + 2));
		myself.spriteBar.add(button);
		if (myself.currentSprite instanceof StageMorph) {
			button.hide();
		}
		return button;
	}

	addRotationStyleButton(1);
	addRotationStyleButton(2);
	addRotationStyleButton(0);
	this.rotationStyleButtons = rotationStyleButtons;

	thumbnail = new Morph();
	thumbnail.isCachingImage = true;
	thumbnail.bounds.setExtent(thumbSize);
	thumbnail.cachedImage = this.currentSprite.thumbnail(thumbSize);
	thumbnail.setPosition(rotationStyleButtons[0].topRight().add(new Point(5, 3)));
	this.spriteBar.add(thumbnail);

	// TODO Hide the thumbnail for tutorials
	// if (IDE_Morph.prototype.hideSpriteBar) thumbnail.hide();

	thumbnail.fps = 3;

	thumbnail.step = function () {
		if (thumbnail.version !== myself.currentSprite.version) {
			thumbnail.cachedImage = myself.currentSprite.thumbnail(thumbSize, thumbnail.cachedImage);
			thumbnail.changed();
			thumbnail.version = myself.currentSprite.version;
		}
	};

	nameField = new InputFieldMorph(this.currentSprite.name);
	nameField.setWidth(100); // fixed dimensions
	nameField.contrast = 90;
	nameField.setPosition(thumbnail.topRight().add(new Point(10, 3)));
	this.spriteBar.add(nameField);

	// TODO Hide the sprite name editor for tutorials
	// if (IDE_Morph.prototype.hideSpriteBar) nameField.hide();

	this.spriteBar.nameField = nameField;
	nameField.fixLayout();
	nameField.accept = function () {
		var newName = nameField.getValue();
		myself.currentSprite.setName(myself.newSpriteName(newName, myself.currentSprite));
		nameField.setContents(myself.currentSprite.name);
	};
	this.spriteBar.reactToEdit = nameField.accept;

	// padlock
	padlock = new ToggleMorph(
		"checkbox",
		null,
		() => {
			this.currentSprite.isDraggable = !this.currentSprite.isDraggable;
			this.currentSprite.recordUserEdit("sprite", "draggable", this.currentSprite.isDraggable);
		},
		localize("draggable"),
		() => this.currentSprite.isDraggable
	);
	padlock.label.isBold = false;
	padlock.label.setColor(this.buttonLabelColor);
	padlock.color = tabColors[2];
	padlock.highlightColor = tabColors[0];
	padlock.pressColor = tabColors[1];

	padlock.tick.shadowOffset = MorphicPreferences.isFlat ? ZERO : new Point(-1, -1);
	padlock.tick.shadowColor = BLACK;
	padlock.tick.color = this.buttonLabelColor;
	padlock.tick.isBold = false;
	padlock.tick.fixLayout();

	padlock.setPosition(nameField.bottomLeft().add(2));
	padlock.fixLayout();
	this.spriteBar.add(padlock);
	if (this.currentSprite instanceof StageMorph) {
		padlock.hide();
	}

	// tab bar
	tabBar.tabTo = function (tabString) {
		var active;
		if (myself.currentTab === tabString) {
			return;
		}
		myself.world().hand.destroyTemporaries();
		myself.currentTab = tabString;
		this.children.forEach((each) => {
			each.refresh();
			if (each.state) {
				active = each;
			}
		});
		active.refresh(); // needed when programmatically tabbing
		myself.createSpriteEditor();
		myself.fixLayout("tabEditor");
	};

	tab = new TabMorph(
		tabColors,
		null, // target
		() => tabBar.tabTo("scripts"),
		localize("Scripts"), // label
		() => this.currentTab === "scripts" // query
	);
	tab.padding = 3;
	tab.corner = tabCorner;
	tab.edge = 1;
	tab.labelShadowOffset = new Point(-1, -1);
	tab.labelShadowColor = tabColors[1];
	tab.labelColor = this.buttonLabelColor;

	tab.getPressRenderColor = function () {
		if (MorphicPreferences.isFlat || SyntaxElementMorph.prototype.alpha > 0.85) {
			return this.pressColor;
		}
		return this.pressColor.mixed(
			Math.max(SyntaxElementMorph.prototype.alpha - 0.15, 0),
			SpriteMorph.prototype.paletteColor
		);
	};

	tab.fixLayout();
	tabBar.add(tab);

	tab = new TabMorph(
		tabColors,
		null, // target
		() => tabBar.tabTo("costumes"),
		localize(this.currentSprite instanceof SpriteMorph ? "Costumes" : "Backgrounds"),
		() => this.currentTab === "costumes" // query
	);
	tab.padding = 3;
	tab.corner = tabCorner;
	tab.edge = 1;
	tab.labelShadowOffset = new Point(-1, -1);
	tab.labelShadowColor = tabColors[1];
	tab.labelColor = this.buttonLabelColor;
	tab.fixLayout();
	tabBar.add(tab);

	// TODO Hide the costume tab for tutorials
	// if (StageMorph.prototype.hideCostumesTab) tab.hide();

	tab = new TabMorph(
		tabColors,
		null, // target
		() => tabBar.tabTo("sounds"),
		localize("Sounds"), // label
		() => this.currentTab === "sounds" // query
	);
	tab.padding = 3;
	tab.corner = tabCorner;
	tab.edge = 1;
	tab.labelShadowOffset = new Point(-1, -1);
	tab.labelShadowColor = tabColors[1];
	tab.labelColor = this.buttonLabelColor;
	tab.fixLayout();
	tabBar.add(tab);

	// TODO Hide the sounds tab for tutorials
	// if (StageMorph.prototype.hideSoundsTab) tab.hide();

	tabBar.fixLayout();
	tabBar.children.forEach((each) => each.refresh());
	this.spriteBar.tabBar = tabBar;
	this.spriteBar.add(this.spriteBar.tabBar);

	this.spriteBar.fixLayout = function () {
		this.tabBar.setLeft(this.left());
		this.tabBar.setBottom(this.bottom() + myself.padding);
	};
};

IDE_Morph.prototype.createLogo = function () {
	var myself = this;

	if (this.logo) {
		this.logo.destroy();
	}

	this.logo = new Morph();

	// the logo texture is not loaded dynamically as an image, but instead
	// hard-copied here to avoid tainting the world canvas. This lets us
	// use Snap's (and Morphic's) color pickers to sense any pixel which
	// otherwise would be compromised by annoying browser security.

	// this.logo.texture = this.logoURL; // original code, commented out
	this.logo.texture =
		"data:image/png;base64," +
		"iVBORw0KGgoAAAANSUhEUgAAACwAAAAYCAYAAACBbx+6AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAA" +
		"AsTAAALEwEAmpwYAAAAB3RJTUUH3gITEyEH0BfhhwAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0" +
		"lNUFeBDhcAAAftSURBVFjD1Vd5VJNXFr/v+7JBCIYYVEKAIqi4sVYghrJKWRRlE0Q5glOl7h7R6lSx6HS" +
		"0Y9HijnoQcUE6EVCqhXE7DmoQdWpHBxEULKIoJECQELJ9+d78MUeOKbTF6Uw9fX++3+/e97vv3XfffQC/" +
		"s4Hehjw3Vgqnzsph1ozgiXG+hhlioSmCw4IQu2FaYJE6oDETlL1caO2C601trMLM7Q+OAahM70zwrs1JI" +
		"4cznn4f66Owo3SvwAB8aFcZYZTQ6jmFSWAgEyi7NGJbPgYW0sJDpSNc+Rd7Qdbum4Xps32h8PTt3+4odm" +
		"+Kkj4vGY3bSu3xs7Jxr3I3RJezeE7Rg3Hj42clVB/xa35e4oRV5UJcmuOru1fxR4vfRGhqogRCp4VOeVn" +
		"mjDvKHehtqwO/AQCInjZlCNZeQnlBUP2LEnvcXu6KFyR4HwSIJ/7vohtl49pbSjxx7MzQcbdOBg3AY5Mz" +
		"f9Y+UCrxqCl4H3eUjsL3TvkbnB3F/o7OLkMSzmUAmjH3i5+CFzGLN4mru86M1HeV2emLN4muAcfF/eRfQ" +
		"p+9ZkgDY5KjknfghIxiffzCE/qw2E+bhxp4XMSEZQ2yKbjz7EjccNqfKsxJ2ggAxJfrowZwR4nswN1jii" +
		"RxWbn+zfn+KLev9MroLPtWG+IOkmsP4B5GKC/cC32gKOq7V99kCAQAmJ66v1jg/vnXRoO6HhsV+ymjtst" +
		"mlJ9oKGIdHGzhzIW6/dM26Nn5199z/a7F5hClbYvctiZCvG575QB+24uXIJ6cuq6PdmSZAYc2+MHj08Fe" +
		"ipJR+JFMWuGfVMR4jc2KkHLbSkS9N/aNrgYA+HDBFZy4MO8Pb5NOwWFxb52CASEJCAAgbvHZczOX3sFvY" +
		"oyPt92Cu/ludy2tuc/HJsmjAeT9YMgkrFH18VbUPOaOBwBACEOnsm0FABT4Tw2HmupLAACQtFjG12CX1r" +
		"66zIWcSV/l0BRlT9NGYFFNjd8eSxszbV5xJ2I7CQiSASYaA5dDN9/OlwR4z86r4fBdhRqtqZVgDXehKAQ" +
		"M6NWxus8GAsAdABbQtFFpVodPbvHxmunZevdPZU4r+DaifVm7zvxk5BEpuZXsEYmRVF/dE3VzwZnrl/66" +
		"Njx6HnD4bsON/KQOhv4+aJW30sT21vLGHxRHBG7rg1i9lWn6PgXBIFEtl6l+9aKtV8p3Tjmq63lIkVQHA" +
		"4RxYGG8s4xH1F0mOa4WL9X2/ySY1lB1QOIQlPHNAaxrczh3PMOrf4dZDPShxsCBHcdu7fulo7pQvDoqIk" +
		"mXw7TxXTtswo410eKUJarHu1IFdhMrVTQFHfWHt9TILx1/nQ2RollYrzNOv3gqK/kNN4/DZ5LhwomrZmu" +
		"f5ucBAy25X77oREOLVh0QkoAsWYa57PH7ToWk70ljshjsl3WFn5hduggfoFq7Bn89j2dPGiha9ukn5w+F" +
		"WemeHy2iSa6lwGN3WW3VQScGSQKHJ2SbOScBEG3iBHi6CMPn7C2NWXy1cfbKK1gwbvFcRNNY3fVEAZgBd" +
		"s6TEQDAjaul+OKFc8W0phGYVmN8NQq57MaN6stmPutbSGRjNXhJnL+l1kK21ePikY1e4h9Bmsuln6Uaaz" +
		"8eRhAIxgUs3YwxAoIgzVkYA8eSpxw2ZX8bV+DuqW/Ozbl0ICxY/1JWiUiK0vQqMSAEllZCMzOSyQWg1C0" +
		"Vsq1Hxk8w3zRCXqeps+XpoOAzSf/W71nrDQAAV/Z6V0nHdIQ3d4p63L0DBwR0peZJD9bUA200eVIUNaAx" +
		"MWEEtgL2R0yr8eTfDwcl1z/4/nA3BVUc7ojHBE1gk8EAgBBYWdn2V4I56VkfmUhbUDSd/i4gcnUF34pjb" +
		"VYlMnfVVkS/71Y3bfzTLw9lSRrSpzZdv1ir4Z3Inlzh7dg+8WqTd/jnB8/1AAAERS2vMtJou5296w+9fT" +
		"qWyaDbCVwvaLi56c8OgbEnfyyYphEAxp1GyjQ8OHXP2hH2Ezc+uF06Ayw9V5oQMpIEgUxGCph28R5R8SM" +
		"UOp3mPQ0nIp9W3bhj47o02UiKIrlau5ibt/9R1C84ZeYH4JY617vmQI46xv1puVrHAD8XNdA02be8cHRm" +
		"hE97BgBcJgFc+S5JU2kkKtPSFJvJY+nZuiaD4s78ObZiyQVrS6OyXavtfVOwNZfQND15tI9n3cXG/KhVL" +
		"3pQjMAppLPh2vrzo6U5fjRBACIBerSW50G0hMVFNBiVsvt/+3qDb8y83C9IdttYWcG6orcq4q2lY1S5a3" +
		"w2/5peRBoUNfgDETw9OzazGYeGBPGG6utnG5C0RCkk73EITZF2ZMsLQx8C+Jnl084NkUNaRF5VOei8JVc" +
		"ACAAoJKQHw6PDPP67Bn5JWtDUVdON12zZz0hs0gKBMNAED0amkAmmvqaywWxc3XwTbu9UlRAGFWAw14MB" +
		"gYkyQFL+7EqB+9ao5WPndHkK7wswEIAAA40xPH1lC94LHg3QxxiK4LxjVdV5x4C9dNE8vqOg20qjQ3S0+" +
		"4uW+XEjvY8WDRQsEtlCYuhwt7pWPZy86eowwpoyP3JMAwGAddpuLfTIuXvP6Homufr8h4MQAA2g7jNqAR" +
		"79ui/Sm6NshyR3srg7JSybv9yCBLMCrDMh48XsjoNVDywqMrbeS39nf7r+niLMH5SvONyspG6Vp7OJiRE" +
		"a4PZuI6Iyjw6zsTQ96W1ofPbuv9sr0wN+kbN4nuR/vu6/AcAxS9LBl+KMAAAAAElFTkSuQmCC";

	this.logo.render = function (ctx) {
		var gradient = ctx.createLinearGradient(0, 0, this.width(), 0);
		gradient.addColorStop(0, "black");
		gradient.addColorStop(0.5, myself.frameColor.toString());
		ctx.fillStyle = MorphicPreferences.isFlat || IDE_Morph.prototype.isBright ? myself.frameColor.toString() : gradient;
		ctx.fillRect(0, 0, this.width(), this.height());
		if (this.cachedTexture) {
			this.renderCachedTexture(ctx);
		} else if (this.texture) {
			this.renderTexture(this.texture, ctx);
		}
	};

	this.logo.renderCachedTexture = function (ctx) {
		ctx.drawImage(this.cachedTexture, 5, Math.round((this.height() - this.cachedTexture.height) / 2));
		this.changed();
	};

	this.logo.mouseClickLeft = function () {
		myself.snapMenu();
	};

	this.logo.color = BLACK;
	this.logo.setExtent(new Point(200, 28)); // dimensions are fixed
	this.add(this.logo);
};

IDE_Morph.prototype.fixLayout = function (situation) {
	// situation is a string, i.e.
	// 'selectSprite' or 'refreshPalette' or 'tabEditor'
	var padding = this.padding,
		cnf = this.config,
		border = cnf.border || 0,
		flag,
		maxPaletteWidth;

	// logo
	this.logo.setLeft(this.left() + border);
	this.logo.setTop(this.top() + border);

	if (situation !== "refreshPalette") {
		// controlBar
		this.controlBar.setPosition(this.logo.topRight());
		this.controlBar.setWidth(this.right() - this.controlBar.left() - border);
		this.controlBar.fixLayout();

		// categories
		this.categories.setLeft(this.logo.left());
		this.categories.setTop(cnf.hideControls ? this.top() + border : this.logo.bottom());
		this.categories.setWidth(this.paletteWidth);
		if (this.categories.scroller) {
			this.categories.scroller.setWidth(this.paletteWidth);
		}

		// TODO Set the categories to 0 for a basic layout flag
		// if (StageMorph.prototype.basicLayout) this.categories.setWidth(0);
	}

	// palette
	this.palette.setLeft(this.logo.left());
	this.palette.setTop(
		cnf.hideCategories
			? cnf.hideControls
				? this.top() + border
				: this.controlBar.bottom() + padding
			: this.categories.bottom()
	);
	this.palette.setHeight(this.bottom() - this.palette.top() - border);
	this.palette.setWidth(this.paletteWidth);

	// TODO Set the palette to 0 for a basic layout flag
	// if (StageMorph.prototype.basicLayout) this.palette.setWidth(0);

	if (situation !== "refreshPalette") {
		// stage
		if (this.performerMode) {
			this.stage.setLeft(this.palette.right() + padding);
			this.stage.setTop(this.spriteBar.bottom() + padding);
			this.stage.setScale(1);
			this.stageRatio = 1;
			this.isSmallStage = false;
			this.stage.dimensions = new Point(
				(this.width() - this.palette.width()) / this.performerScale,
				(this.palette.height() - this.corralBar.height() - this.corral.childThatIsA(SpriteIconMorph).height()) /
					this.performerScale
			);
			this.stage.stopVideo();
			this.stage.setExtent(
				new Point(this.stage.dimensions.x * this.performerScale, this.stage.dimensions.y * this.performerScale)
			);
			this.stage.resizePenTrails();
			Costume.prototype.maxDimensions = this.stage.dimensions;
			this.paletteHandle.fixLayout();
			this.controlBar.stageSizeButton.hide();
		} else if (this.isEmbedMode) {
			this.stage.setScale(
				Math.floor(Math.min(this.width() / this.stage.dimensions.x, this.height() / this.stage.dimensions.y) * 100) /
					100
			);
			flag = this.embedPlayButton.flag;
			flag.size = Math.floor(Math.min(this.width(), this.height())) / 5;
			flag.fixLayout();
			this.embedPlayButton.size = flag.size * 1.6;
			this.embedPlayButton.fixLayout();
			if (this.embedOverlay) {
				this.embedOverlay.setExtent(this.extent());
			}
			this.stage.setCenter(this.center());
			this.embedPlayButton.setCenter(this.stage.center());
			flag.setCenter(this.embedPlayButton.center());
			flag.setLeft(flag.left() + flag.size * 0.1); // account for slight asymmetry
		} else if (this.isAppMode) {
			this.stage.setScale(
				Math.floor(
					Math.min(
						(this.width() - padding * 2) / this.stage.dimensions.x,
						(this.height() - this.controlBar.height() * 2 - padding * 2) / this.stage.dimensions.y
					) * 10
				) / 10
			);
			this.stage.setCenter(this.center());
		} else {
			this.stage.setScale(this.isSmallStage ? this.stageRatio : 1);
			this.stage.setTop(cnf.hideControls ? this.top() + border : this.logo.bottom() + padding);
			this.stage.setRight(this.right() - border);
			if (cnf.noSprites) {
				maxPaletteWidth = Math.max(200, this.width() - border * 2);
			} else {
				maxPaletteWidth = Math.max(
					200,
					this.width() - this.stage.width() - this.spriteBar.tabBar.width() - padding * 2 - border * 2
				);
			}
			if (this.paletteWidth > maxPaletteWidth) {
				this.paletteWidth = maxPaletteWidth;
				this.fixLayout();
			}
			this.stageHandle.fixLayout();
			this.paletteHandle.fixLayout();
		}

		// spriteBar
		this.spriteBar.setLeft(cnf.noPalette ? this.left() + border : this.paletteWidth + padding + border);

		// TODO Set the spriteBar left to 0 for a basic layout flag
		// if (StageMorph.prototype.basicLayout) this.spriteBar.setLeft(this.paletteWidth + padding - 200);

		this.spriteBar.setTop(cnf.hideControls ? this.top() + border : this.logo.bottom() + padding);
		this.spriteBar.setWidth(Math.max(0, this.stage.left() - padding - this.spriteBar.left()));
		this.spriteBar.setHeight(Math.round(this.logo.height() * 2.6));

		//TODO ? Note to self: Not sure about this redundancy, but might had something to do with workbooks
		// if (StageMorph.prototype.basicLayout) {
		// 	this.spriteBar.setExtent(
		// 		new Point(
		// 			Math.max(0, this.stage.left() - padding - this.spriteBar.left()),
		// 			this.categories.bottom() - this.spriteBar.top() - padding - 8
		// 		)
		// 	);
		// }
		this.spriteBar.fixLayout();

		// spriteEditor
		if (this.spriteEditor.isVisible) {
			if (this.performerMode) {
				this.spriteEditor.setTop(this.stage.top());
				this.spriteEditor.setLeft(this.stage.left());
				this.spriteEditor.setWidth(this.stage.width());
				this.spriteEditor.setHeight(this.stage.height());
			} else {
				this.spriteEditor.setLeft(this.spriteBar.left());
				this.spriteEditor.setTop(
					cnf.noSprites || cnf.noSpriteEdits
						? cnf.hideControls
							? this.top() + border
							: this.controlBar.bottom() + padding
						: this.spriteBar.bottom() + padding
				);
				this.spriteEditor.setWidth(
					cnf.noSprites ? this.right() - this.spriteEditor.left() - border : this.spriteBar.width()
				);
				this.spriteEditor.setHeight(this.bottom() - this.spriteEditor.top() - border);
			}
		}

		// TODO Modify the layout for the sprite editor for workbooks (basic layout flag)
		// if (StageMorph.prototype.basicLayout) {
		// 	this.spriteEditor.setPosition(new Point(this.spriteBar.left() - 200, this.spriteBar.bottom() + padding));
		// 	this.spriteEditor.setExtent(new Point(this.spriteBar.width() + 200, this.bottom() - this.spriteEditor.top()));
		// }

		// corralBar
		this.corralBar.setLeft(this.stage.left());
		this.corralBar.setTop(this.stage.bottom() + padding);
		this.corralBar.setWidth(this.stage.width());

		// corral
		if (!contains(["selectSprite", "tabEditor"], situation)) {
			this.corral.setPosition(this.corralBar.bottomLeft());
			this.corral.setWidth(this.stage.width());
			this.corral.setHeight(this.bottom() - this.corral.top() - border);
			this.corral.fixLayout();
		}
	}
};

IDE_Morph.prototype.snapMenu = function () {
	var menu,
		world = this.world();

	menu = new MenuMorph(this);
	menu.addItem("About...", "aboutSnap");
	menu.addLine();
	menu.addItem("Reference manual", () => {
		var url = this.resourceURL("help", "SnapManual.pdf");
		window.open(url, "SnapReferenceManual");
	});
	menu.addItem("CSDT Homepage", () => window.open("https://csdt.org/", "SnapWebsite"));
	menu.addItem("Download source", () => window.open("https://github.com/jmoenig/Snap/releases/latest", "SnapSource"));
	if (world.isDevMode) {
		menu.addLine();
		menu.addItem(
			"Switch back to user mode",
			"switchToUserMode",
			"disable deep-Morphic\ncontext menus" + "\nand show user-friendly ones",
			new Color(0, 100, 0)
		);
	} else if (world.currentKey === 16) {
		// shift-click
		menu.addLine();
		menu.addItem(
			"Switch to dev mode",
			"switchToDevMode",
			"enable Morphic\ncontext menus\nand inspectors," + "\nnot user-friendly!",
			new Color(100, 0, 0)
		);
	}
	menu.popup(world, this.logo.bottomLeft());
};

IDE_Morph.prototype.createCloudAccount = function () {
	var world = this.world();

	// TODO We need our own tos and privacy pages
	new DialogBoxMorph(null, (user) =>
		this.cloud.signup(
			user.username,
			user.password,
			user.passwordRepeat,
			user.email,
			(txt, title) =>
				new DialogBoxMorph().inform(
					title,
					txt + ".\n\nYou can now log in.",
					world,
					this.cloudIcon(null, new Color(0, 180, 0))
				),
			this.cloudError()
		)
	)
		.withKey("cloudsignup")
		.promptCredentials(
			"Sign up",
			"signup",
			"https://snap.berkeley.edu/tos.html",
			"Terms of Service...",
			"https://snap.berkeley.edu/privacy.html",
			"Privacy...",
			"I have read and agree\nto the Terms of Service",
			world,
			this.cloudIcon(),
			this.cloudMsg
		);
};

IDE_Morph.prototype.projectMenu = function () {
	var menu,
		tm,
		world = this.world(),
		pos = this.controlBar.projectButton.bottomLeft(),
		graphicsName = this.currentSprite instanceof SpriteMorph ? "Costumes" : "Backgrounds",
		shiftClicked = world.currentKey === 16,
		backup = this.availableBackup(shiftClicked);

	menu = new MenuMorph(this);
	menu.addItem("Notes...", "editNotes");
	menu.addLine();
	if (!this.config.noProjectItems) {
		menu.addPair("New", "createNewProject", "^N");
		menu.addPair("Open...", "openProjectsBrowser", "^O");
		menu.addPair("Save", "save", "^S");
		menu.addItem("Save As...", "saveProjectsBrowser");
		if (backup) {
			menu.addItem("Restore unsaved project", "restore", backup, shiftClicked ? new Color(100, 0, 0) : null);
			if (shiftClicked) {
				menu.addItem("Clear backup", "clearBackup", backup, new Color(100, 0, 0));
			}
		}
		menu.addLine();
		menu.addItem(
			"Import...",
			"importLocalFile",
			"file menu import hint"
			// looks up the actual text in the translator
		);
		menu.addItem(
			"Export project...",
			() => {
				var pn = this.getProjectName();
				if (pn) {
					this.exportProject(pn);
				} else {
					this.prompt("Export Project As...", (name) => this.exportProject(name), null, "exportProject");
				}
			},
			"save project data as XML\nto your downloads folder"
		);
		menu.addItem("Export summary...", () => this.exportProjectSummary(), "save a summary\nof this project");
		if (shiftClicked) {
			menu.addItem(
				"Export summary with drop-shadows...",
				() => this.exportProjectSummary(true),
				"download and save" +
					"\nwith a summary of this project" +
					"\nwith drop-shadows on all pictures." +
					"\nnot supported by all browsers",
				new Color(100, 0, 0)
			);
			menu.addItem(
				"Export all scripts as pic...",
				() => this.exportScriptsPicture(),
				"show a picture of all scripts\nand block definitions",
				new Color(100, 0, 0)
			);
		}
		if (this.stage.trailsLog.length) {
			tm = new MenuMorph(this);
			tm.addItem(
				"png...",
				() =>
					this.saveCanvasAs(
						this.currentSprite.reportPenTrailsAsCostume().contents,
						this.getProjectName() || this.stage.name
					),
				"export pen trails\nas PNG image"
			);
			tm.addItem("svg...", () => this.stage.exportTrailsLogAsSVG(), "export pen trails\nline segments as SVG");
			tm.addItem(
				"poly svg...",
				() => this.stage.exportTrailsLogAsPolySVG(),
				"export pen trails\nline segments as polyline SVG"
			);
			tm.addItem("dst...", () => this.stage.exportTrailsLogAsDST(), "export pen trails\nas DST embroidery file");
			tm.addItem("exp...", () => this.stage.exportTrailsLogAsEXP(), "export pen trails\nas EXP embroidery file");
			menu.addMenu("Export pen trails", tm);
		} else {
			menu.addItem(
				"Export pen trails...",
				() =>
					this.saveCanvasAs(
						this.currentSprite.reportPenTrailsAsCostume().contents,
						this.getProjectName() || this.stage.name
					),
				"export pen trails\nas PNG image"
			);
		}
		menu.addLine();
		if (this.stage.globalBlocks.length || SpriteMorph.prototype.hasCustomizedPrimitives()) {
			menu.addItem("Export blocks...", () => this.exportGlobalBlocks(), "save global custom block\ndefinitions as XML");
		}
		if (this.stage.globalBlocks.length) {
			menu.addItem(
				"Unused blocks...",
				() => this.removeUnusedBlocks(),
				"find unused global custom blocks" + "\nand remove their definitions"
			);
		}
		if (SpriteMorph.prototype.hasCustomizedPrimitives()) {
			if (shiftClicked) {
				menu.addItem(
					"Export customized primitives...",
					() => this.exportCustomizedPrimitives(),
					"EXPERIMENTAL!",
					new Color(100, 0, 0)
				);
			}
			menu.addItem(
				"Restore primitives",
				() => this.stage.restorePrimitives(),
				"switch (back) to primitive blocks in the palette,\n" + "CAUTION - can break extensions."
			);
		}
		menu.addItem("Hide blocks...", () => new BlockVisibilityDialogMorph(this.currentSprite).popUp(world));
		menu.addItem("New category...", () => this.createNewCategory());
		if (SpriteMorph.prototype.customCategories.size) {
			menu.addItem("Remove a category...", () => this.deleteUserCategory(pos));
		}
		if (this.currentSprite instanceof SpriteMorph && !this.currentSprite.solution) {
			menu.addItem("Generate puzzle", "generatePuzzle", "generate a Parson's Puzzle\n" + "from the current sprite");
		}
		menu.addLine();
		if (this.scenes.length() > 1) {
			menu.addItem("Scenes...", "scenesMenu");
		}
		menu.addPair("New scene", "createNewScene");
		menu.addPair("Add scene...", "addScene");
		menu.addLine();
	}
	menu.addItem(
		"Libraries...",
		() => {
			if (location.protocol === "file:") {
				this.importLocalFile();
				return;
			}
			this.getURL(this.resourceURL("libraries", "LIBRARIES.json"), (txt) => {
				var libraries = this.parseResourceFile(txt);
				new LibraryImportDialogMorph(this, libraries).popUp();
			});
		},
		"Select categories of additional blocks to add to this project."
	);
	menu.addItem(
		// localize(graphicsName) + "...",
		"Sprite images...",
		() => {
			if (location.protocol === "file:") {
				this.importLocalFile();
				return;
			}
			this.importMedia(graphicsName);
		},
		"Select a costume from the media library"
	);
	menu.addItem(
		localize("Sounds") + "...",
		() => {
			if (location.protocol === "file:") {
				this.importLocalFile();
				return;
			}
			this.importMedia("Sounds");
		},
		"Select a sound from the media library"
	);

	if (this.scene.trash.length) {
		menu.addLine();
		menu.addItem(
			"Undelete sprites...",
			() => this.undeleteSprites(this.controlBar.projectButton.bottomLeft()),
			"Bring back deleted sprites"
		);
	}
	menu.popup(world, pos);
};

IDE_Morph.prototype.cloudMenu = function () {
	var menu,
		world = this.world(),
		pos = this.controlBar.cloudButton.bottomLeft(),
		shiftClicked = world.currentKey === 16;

	if (location.protocol === "file:" && !shiftClicked) {
		this.showMessage("cloud unavailable without a web server.");
		return;
	}

	menu = new MenuMorph(this);
	if (shiftClicked) {
		menu.addItem("url...", "setCloudURL", null, new Color(100, 0, 0));
		menu.addLine();
	}
	if (!this.cloud.username) {
		menu.addItem("Login...", "initializeCloud");
		menu.addItem("Signup...", () => window.open("/accounts/signup/", "SnapWebsite"));
		menu.addItem("Reset Password...", () => window.open("/accounts/password/reset/", "SnapWebsite"));
		// menu.addItem("Signup...", "createCloudAccount");
		// menu.addItem("Reset Password...", "resetCloudPassword");
		// menu.addItem("Resend Verification Email...", "resendVerification");
	} else {
		menu.addItem(localize("Logout") + " " + this.cloud.username, "logout");
		menu.addItem("My Projects", () => window.open("/users/" + this.cloud.user_id, "SnapWebsite"));
		menu.addItem("Change Password...", () => window.open("/accounts/password/reset/", "SnapWebsite"));
		// menu.addItem("Change Password...", "changeCloudPassword");
	}
	if (this.hasCloudProject()) {
		menu.addLine();
		menu.addItem("Open in Community Site", () => {
			var dict = this.urlParameters();
			window.open(this.cloud.showProjectPath(dict.Username, dict.ProjectName), "_blank");
		});
	}
	if (shiftClicked) {
		menu.addLine();
		menu.addItem(
			"export project media only...",
			() => {
				var pn = this.getProjectName();
				if (pn) {
					this.exportProjectMedia(pn);
				} else {
					this.prompt("Export Project As...", (name) => this.exportProjectMedia(name), null, "exportProject");
				}
			},
			null,
			this.hasChangedMedia ? new Color(100, 0, 0) : new Color(0, 100, 0)
		);
		menu.addItem(
			"export project without media...",
			() => {
				var pn = this.getProjectName();
				if (pn) {
					this.exportProjectNoMedia(pn);
				} else {
					this.prompt("Export Project As...", (name) => this.exportProjectNoMedia(name), null, "exportProject");
				}
			},
			null,
			new Color(100, 0, 0)
		);
		menu.addItem(
			"export project as cloud data...",
			() => {
				var pn = this.getProjectName();
				if (pn) {
					this.exportProjectAsCloudData(pn);
				} else {
					this.prompt("Export Project As...", (name) => this.exportProjectAsCloudData(name), null, "exportProject");
				}
			},
			null,
			new Color(100, 0, 0)
		);
		menu.addLine();
		menu.addItem(
			"open shared project from cloud...",
			() => {
				this.prompt(
					"Author name…",
					(usr) => {
						this.prompt(
							"Project name...",
							(prj) => {
								this.showMessage("Fetching project\nfrom the cloud...");
								this.cloud.getPublicProject(
									prj,
									usr.toLowerCase(),
									(projectData) => {
										var msg;
										if (!Process.prototype.isCatchingErrors) {
											window.open("data:text/xml," + projectData);
										}
										this.nextSteps([
											() => {
												msg = this.showMessage("Opening project...");
											},
											() => {
												this.rawOpenCloudDataString(projectData);
												msg.destroy();
											},
										]);
									},
									this.cloudError()
								);
							},
							null,
							"project"
						);
					},
					null,
					"project"
				);
			},
			null,
			new Color(100, 0, 0)
		);
	}
	menu.popup(world, pos);
};

// IDE_Morph.prototype.popupMediaImportDialog = function (folderName, items) {
// 	// private - this gets called by importMedia() and creates
// 	// the actual dialog
// 	var dialog = new DialogBoxMorph().withKey("import" + folderName),
// 		frame = new ScrollFrameMorph(),
// 		selectedIcon = null,
// 		turtle = new SymbolMorph("turtle", 60),
// 		myself = this,
// 		world = this.world(),
// 		handle;

// 	frame.acceptsDrops = false;
// 	frame.contents.acceptsDrops = false;
// 	frame.color = myself.groupColor;
// 	frame.fixLayout = nop;
// 	dialog.labelString = folderName;
// 	dialog.createLabel();
// 	dialog.addBody(frame);
// 	dialog.addButton("ok", "Import");
// 	dialog.addButton("cancel", "Cancel");

// 	dialog.ok = function () {
// 		if (selectedIcon) {
// 			if (selectedIcon.object instanceof Sound) {
// 				myself.droppedAudio(selectedIcon.object.copy().audio, selectedIcon.labelString);
// 			} else if (selectedIcon.object instanceof SVG_Costume) {
// 				myself.droppedSVG(selectedIcon.object.contents, selectedIcon.labelString);
// 			} else {
// 				myself.droppedImage(selectedIcon.object.contents, selectedIcon.labelString);
// 			}
// 		}
// 	};

// 	dialog.fixLayout = function () {
// 		var th = fontHeight(this.titleFontSize) + this.titlePadding * 2,
// 			x = 0,
// 			y = 0,
// 			fp,
// 			fw;
// 		this.buttons.fixLayout();
// 		this.body.setPosition(this.position().add(new Point(this.padding, th + this.padding)));
// 		this.body.setExtent(
// 			new Point(this.width() - this.padding * 2, this.height() - this.padding * 3 - th - this.buttons.height())
// 		);
// 		fp = this.body.position();
// 		fw = this.body.width();
// 		frame.contents.children.forEach(function (icon) {
// 			icon.setPosition(fp.add(new Point(x, y)));
// 			x += icon.width();
// 			if (x + icon.width() > fw) {
// 				x = 0;
// 				y += icon.height();
// 			}
// 		});
// 		frame.contents.adjustBounds();
// 		this.label.setCenter(this.center());
// 		this.label.setTop(this.top() + (th - this.label.height()) / 2);
// 		this.buttons.setCenter(this.center());
// 		this.buttons.setBottom(this.bottom() - this.padding);

// 		// refresh shadow
// 		this.removeShadow();
// 		this.addShadow();
// 	};

// 	items.forEach((item) => {
// 		// Caution: creating very many thumbnails can take a long time!
// 		var url = this.resourceURL(folderName, item.fileName),
// 			img = new Image(),
// 			suffix = url.slice(url.lastIndexOf(".") + 1).toLowerCase(),
// 			isSVG = suffix === "svg" && !MorphicPreferences.rasterizeSVGs,
// 			isSound = contains(["wav", "mp3"], suffix),
// 			icon;

// 		if (isSound) {
// 			icon = new SoundIconMorph(new Sound(new Audio(), item.name));
// 		} else {
// 			icon = new CostumeIconMorph(new Costume(turtle.getImage(), item.name));
// 		}
// 		icon.isDraggable = false;
// 		icon.userMenu = nop;
// 		icon.action = function () {
// 			if (selectedIcon === icon) {
// 				return;
// 			}
// 			var prevSelected = selectedIcon;
// 			selectedIcon = icon;
// 			if (prevSelected) {
// 				prevSelected.refresh();
// 			}
// 		};
// 		icon.doubleClickAction = dialog.ok;
// 		icon.query = function () {
// 			return icon === selectedIcon;
// 		};
// 		frame.addContents(icon);
// 		if (isSound) {
// 			icon.object.audio.onloadeddata = function () {
// 				icon.createThumbnail();
// 				icon.fixLayout();
// 				icon.refresh();
// 			};

// 			icon.object.audio.src = url;
// 			icon.object.audio.load();
// 		} else if (isSVG) {
// 			img.onload = function () {
// 				icon.object = new SVG_Costume(img, item.name);
// 				icon.refresh();
// 			};
// 			this.getURL(url, (txt) => (img.src = "data:image/svg+xml;base64," + window.btoa(txt)));
// 		} else {
// 			img.onload = function () {
// 				var canvas = newCanvas(new Point(img.width, img.height), true);
// 				canvas.getContext("2d").drawImage(img, 0, 0);
// 				icon.object = new Costume(canvas, item.name);
// 				icon.refresh();
// 			};
// 			img.src = url;
// 		}
// 	});
// 	dialog.popUp(world);
// 	dialog.setExtent(new Point(400, 300));
// 	dialog.setCenter(world.center());

// 	handle = new HandleMorph(dialog, 300, 280, dialog.corner, dialog.corner);
// };

IDE_Morph.prototype.popupMediaImportDialog = function (folderName, items) {
	// private - this gets called by importMedia() and creates
	// the actual dialog
	var dialog = new DialogBoxMorph().withKey("import" + folderName),
		frame = new ScrollFrameMorph(),
		selectedIcon = null,
		turtle = new SymbolMorph("turtle", 60),
		myself = this,
		world = this.world(),
		handle,
		content = new ScrollFrameMorph(),
		section,
		msg,
		listFieldWidth = 100;

	let uniqueSections = [...new Set(items.map((item) => item.description))];
	uniqueSections.push("All");

	let createSpriteView = function (parent, items) {
		items.forEach((item) => {
			// Caution: creating very many thumbnails can take a long time!
			var url = myself.resourceURL(folderName, item.fileName),
				img = new Image(),
				suffix = url.slice(url.lastIndexOf(".") + 1).toLowerCase(),
				isSVG = suffix === "svg" && !MorphicPreferences.rasterizeSVGs,
				isSound = contains(["wav", "mp3"], suffix),
				icon;

			if (isSound) {
				icon = new SoundIconMorph(new Sound(new Audio(), item.name));
			} else {
				icon = new CostumeIconMorph(new Costume(turtle.getImage(), item.name));
			}
			icon.isDraggable = false;
			icon.userMenu = nop;
			icon.action = function () {
				if (selectedIcon === icon) {
					return;
				}
				var prevSelected = selectedIcon;
				selectedIcon = icon;
				if (prevSelected) {
					prevSelected.refresh();
				}
			};
			icon.doubleClickAction = dialog.ok;
			icon.query = function () {
				return icon === selectedIcon;
			};
			frame.addContents(icon);
			if (isSound) {
				icon.object.audio.onloadeddata = function () {
					icon.createThumbnail();
					icon.fixLayout();
					icon.refresh();
				};

				icon.object.audio.src = url;
				icon.object.audio.load();
			} else if (isSVG) {
				img.onload = function () {
					icon.object = new SVG_Costume(img, item.name);
					icon.refresh();
				};
				parent.getURL(url, (txt) => (img.src = "data:image/svg+xml;base64," + window.btoa(txt)));
			} else {
				img.onload = function () {
					var canvas = newCanvas(new Point(img.width, img.height), true);
					canvas.getContext("2d").drawImage(img, 0, 0);
					icon.object = new Costume(canvas, item.name);
					icon.refresh();
				};
				img.src = url;
			}
		});
	};

	var listField = new ListMorph(uniqueSections, (element) => {
		return element;
	});

	listField.setWidth(listFieldWidth);
	listField.contents.children[0].children.forEach(function (x) {
		x.action = function () {
			let msg = myself.showMessage(localize("Loading") + "\n" + localize(x.labelString), 1);

			frame.destroy();
			frame = new ScrollFrameMorph();
			frame.acceptsDrops = false;
			frame.contents.acceptsDrops = false;
			frame.color = myself.groupColor;
			frame.fixLayout = nop;

			// Filters costume by category
			let currentSection = x.labelString === "All" ? items : items.filter((y) => y.description == x.labelString);

			createSpriteView(myself, currentSection);

			content.add(frame);
			dialog.fixLayout();
		};
	});

	listField.fixLayout = nop;

	frame.acceptsDrops = false;
	frame.contents.acceptsDrops = false;
	frame.color = myself.groupColor;
	frame.fixLayout = nop;
	dialog.labelString = folderName === "Costumes" ? "Sprite images" : folderName;
	dialog.createLabel();
	content.add(frame);
	content.add(listField);
	dialog.addBody(content);
	dialog.addButton("ok", "Import");
	dialog.addButton("cancel", "Cancel");

	dialog.ok = function () {
		if (selectedIcon) {
			if (selectedIcon.object instanceof Sound) {
				myself.droppedAudio(selectedIcon.object.copy().audio, selectedIcon.labelString);
			} else if (selectedIcon.object instanceof SVG_Costume) {
				myself.droppedSVG(selectedIcon.object.contents, selectedIcon.labelString);
			} else {
				myself.droppedImage(selectedIcon.object.contents, selectedIcon.labelString);
			}
		}
	};

	dialog.cancel = function () {
		// CSDT Kill Audio Sampling (need to clean up...)
		let audioArray = frame.children[0].children.filter((a) => a instanceof SoundIconMorph);
		for (let i = 0; i < audioArray.length; i++) {
			try {
				audioArray[i].object.previewAudio.pause();
				audioArray[i].object.previewAudio.pause();
				audioArray[i].object.previewAudio.terminated = true;
				audioArray[i].object.previewAudio = null;
			} catch (e) {}
		}
		dialog.destroy();
	};

	dialog.fixLayout = function () {
		var th = fontHeight(this.titleFontSize) + this.titlePadding * 2,
			x = 0,
			y = 0,
			lw = listFieldWidth,
			margin = 15,
			cp,
			ce,
			lp,
			le,
			fp,
			fe,
			fw;
		this.buttons.fixLayout();
		cp = this.position().add(new Point(this.padding, th + this.padding));
		ce = new Point(this.width() - this.padding * 2, this.height() - this.padding * 3 - th - this.buttons.height());

		content.setPosition(cp);
		content.setExtent(ce);

		this.body.setPosition(new Point(cp.x, cp.y));
		this.body.setExtent(new Point(ce.x, ce.y));

		fp = new Point(cp.x + lw + margin, cp.y);
		lp = new Point(cp.x, cp.y);

		fe = new Point(ce.x - lw - margin, ce.y);
		le = new Point(lw, ce.y);

		frame.setPosition(fp);
		frame.setExtent(fe);
		listField.setPosition(lp);
		listField.setExtent(le);
		frame.contents.children.forEach(function (icon) {
			icon.setPosition(fp.add(new Point(x + 5, y + 5)));
			x += icon.width();
			if (x + icon.width() > fe.x) {
				x = 0;
				y += icon.height() + 4;
			}
		});
		frame.contents.adjustBounds();
		this.label.setCenter(this.center());
		this.label.setTop(this.top() + (th - this.label.height()) / 2);
		this.buttons.setCenter(this.center());
		this.buttons.setBottom(this.bottom() - this.padding);

		// refresh shadow
		this.removeShadow();
		this.addShadow();
	};
	createSpriteView(myself, items);

	dialog.popUp(world);
	dialog.setExtent(new Point(600, 500));
	dialog.setCenter(world.center());

	handle = new HandleMorph(dialog, 300, 280, dialog.corner, dialog.corner);
};

IDE_Morph.prototype.openIn = function (world) {
	var hash,
		myself = this;

	window.onmessage = function (event) {
		// make the API accessible from outside an iframe
		var ide = myself;
		if (!isNil(event.data.selector)) {
			window.top.postMessage(
				{
					selector: event.data.selector,
					response: ide[event.data.selector].apply(ide, event.data.params),
				},
				"*"
			);
		}
	};

	function initUser(username) {
		sessionStorage.username = username;
		myself.controlBar.cloudButton.refresh();
		if (username) {
			myself.source = "cloud";
			if (!myself.cloud.verified) {
				new DialogBoxMorph().inform(
					"Unverified account",
					"Your account is still unverified.\n" +
						"Please use the verification link that\n" +
						"was sent to your email address when you\n" +
						"signed up.\n\n" +
						"If you cannot find that email, please\n" +
						"check your spam folder. If you still\n" +
						'cannot find it, please use the "Resend\n' +
						'Verification Email..." option in the cloud\n' +
						"menu.",
					world,
					myself.cloudIcon(null, new Color(0, 180, 0))
				);
			}
		}
	}

	this.buildPanes();
	world.add(this);
	world.userMenu = this.userMenu;

	// override SnapCloud's user message with Morphic
	this.cloud.message = (string) => {
		var m = new MenuMorph(null, string),
			intervalHandle;
		m.popUpCenteredInWorld(world);
		intervalHandle = setInterval(() => {
			m.destroy();
			clearInterval(intervalHandle);
		}, 2000);
	};

	// prevent non-DialogBoxMorphs from being dropped
	// onto the World in user-mode
	world.reactToDropOf = (morph) => {
		if (!(morph instanceof DialogBoxMorph || morph instanceof MenuMorph)) {
			if (world.hand.grabOrigin) {
				morph.slideBackTo(world.hand.grabOrigin);
			} else {
				world.hand.grab(morph);
			}
		}
	};

	this.reactToWorldResize(world.bounds);

	function applyFlags(dict) {
		if (dict.noCloud) {
			myself.cloud.disable();
		}
		if (dict.embedMode) {
			myself.setEmbedMode();
		}
		if (dict.editMode) {
			myself.toggleAppMode(false);
		} else {
			myself.toggleAppMode(true);
		}
		if (!dict.noRun) {
			autoRun();
		}
		if (dict.hideControls) {
			myself.controlBar.hide();
			window.onbeforeunload = nop;
		}
		if (dict.noExitWarning) {
			window.onbeforeunload = window.cachedOnbeforeunload;
		}
		if (dict.blocksZoom) {
			myself.savingPreferences = false;
			myself.setBlocksScale(Math.max(1, Math.min(dict.blocksZoom, 12)));
			myself.savingPreferences = true;
		}

		// only force my world to get focus if I'm not in embed mode
		// to prevent the iFrame from involuntarily scrolling into view
		if (!myself.isEmbedMode) {
			world.worldCanvas.focus();
		}
	}

	function autoRun() {
		// if we're going to run the project anyway, remove the embed
		// overlay in case we're in embedMode
		if (myself.embedOverlay) {
			myself.embedPlayButton.destroy();
			myself.embedOverlay.destroy();
		}
		// wait until all costumes and sounds are loaded
		if (isLoadingAssets()) {
			myself.world().animations.push(new Animation(nop, nop, 0, 200, nop, autoRun));
		} else {
			myself.runScripts();
		}
	}

	function isLoadingAssets() {
		return myself.sprites
			.asArray()
			.concat([myself.stage])
			.some(
				(any) =>
					(any.costume ? any.costume.loaded !== true : false) ||
					any.costumes.asArray().some((each) => each.loaded !== true) ||
					any.sounds.asArray().some((each) => each.loaded !== true)
			);
	}

	// dynamic notifications from non-source text files
	// has some issues, commented out for now
	/*
    this.cloudMsg = getURL('https://snap.berkeley.edu/cloudmsg.txt');
    motd = getURL('https://snap.berkeley.edu/motd.txt');
    if (motd) {
        this.inform('Snap!', motd);
    }
    */

	function interpretUrlAnchors() {
		var dict, idx;

		if (location.hash.substr(0, 6) === "#open:") {
			hash = location.hash.substr(6);
			if (hash.charAt(0) === "%" || hash.search(/\%(?:[0-9a-f]{2})/i) > -1) {
				hash = decodeURIComponent(hash);
			}
			if (
				contains(
					["project", "blocks", "sprites", "snapdata"].map((each) => hash.substr(0, 8).indexOf(each)),
					1
				)
			) {
				this.droppedText(hash);
			} else if (hash.match(/\.(png|gif|svg|jpe?g|tiff)$/i)) {
				// Import an image, which could contain embedded scripts
				fetch(hash)
					.then((res) => res.blob())
					.then((blob) => {
						let pic = new Image(),
							imgURL = URL.createObjectURL(blob),
							dataMarker = MorphicPreferences.pngPayloadMarker;

						pic.src = imgURL;
						pic.onload = (async () => {
							let buff = new Uint8Array(await blob.arrayBuffer()),
								strBuff = buff.reduce((acc, b) => acc + String.fromCharCode(b), ""),
								hasImportanbleCode = (txt) => txt.match(/^<(blocks|block|script|sprite)/i),
								embeddedData,
								canvas;

							if (strBuff.includes(dataMarker)) {
								embeddedData = decodeURIComponent(strBuff.split(dataMarker)[1]);
								if (hasImportanbleCode(embeddedData)) {
									return this.rawOpenScriptString(embeddedData, true);
								}
							} else {
								canvas = newCanvas(new Point(pic.width, pic.height), true);
								canvas.getContext("2d").drawImage(pic, 0, 0);
								this.droppedImage(canvas, decodeURIComponent(hash));
							}
						})();
					});
			} else {
				idx = hash.indexOf("&");
				if (idx > 0) {
					dict = myself.cloud.parseDict(hash.substr(idx));
					dict.editMode = true;
					hash = hash.slice(0, idx);
					applyFlags(dict);
				}
				this.shield = new Morph();
				this.shield.alpha = 0;
				this.shield.setExtent(this.parent.extent());
				this.parent.add(this.shield);
				this.showMessage("Fetching project...");

				this.getURL(hash, (projectData) => {
					var msg;
					this.nextSteps([
						() => (msg = this.showMessage("Opening project...")),
						() => {
							if (projectData.indexOf("<snapdata") === 0) {
								this.rawOpenCloudDataString(projectData);
							} else if (projectData.indexOf("<project") === 0) {
								this.rawOpenProjectString(projectData);
							} else if (projectData.indexOf("<blocks") === 0) {
								this.rawOpenBlocksString(
									projectData,
									null, // name, optional
									true // silently
								);
							}
							this.hasChangedMedia = true;
						},
						() => {
							this.shield.destroy();
							this.shield = null;
							msg.destroy();
							this.toggleAppMode(false);
						},
					]);
				});
			}
		} else if (location.hash.substr(0, 5) === "#run:") {
			dict = "";
			hash = location.hash.substr(5);

			//decoding if hash is an encoded URI
			if (hash.charAt(0) === "%" || hash.search(/\%(?:[0-9a-f]{2})/i) > -1) {
				hash = decodeURIComponent(hash);
			}
			idx = hash.indexOf("&");

			// supporting three URL cases

			// xml project
			if (hash.substr(0, 8) === "<project") {
				this.rawOpenProjectString(hash.slice(0, hash.indexOf("</project>") + 10));
				applyFlags(myself.cloud.parseDict(hash.substr(hash.indexOf("</project>") + 10)));
				// no project, only flags
			} else if (idx == 0) {
				applyFlags(myself.cloud.parseDict(hash));
				// xml file path
				// three path types allowed:
				//  (1) absolute (http...),
				//  (2) relative to site ("/path") or
				//  (3) relative to folder ("path")
			} else {
				this.shield = new Morph();
				this.shield.alpha = 0;
				this.shield.setExtent(this.parent.extent());
				this.parent.add(this.shield);
				this.showMessage("Fetching project...");
				if (idx > 0) {
					dict = myself.cloud.parseDict(hash.substr(idx));
					hash = hash.slice(0, idx);
				}
				this.getURL(hash, (projectData) => {
					var msg;
					this.nextSteps([
						() => (msg = this.showMessage("Opening project...")),
						() => {
							if (projectData.indexOf("<snapdata") === 0) {
								this.rawOpenCloudDataString(projectData);
							} else if (projectData.indexOf("<project") === 0) {
								this.rawOpenProjectString(projectData);
							}
							this.hasChangedMedia = true;
						},
						() => {
							this.shield.destroy();
							this.shield = null;
							msg.destroy();
							// this.toggleAppMode(true);
							applyFlags(dict);
						},
					]);
				});
			}
		} else if (location.hash.substr(0, 9) === "#present:") {
			this.shield = new Morph();
			this.shield.color = this.color;
			this.shield.setExtent(this.parent.extent());
			this.parent.add(this.shield);
			myself.showMessage("Fetching project\nfrom the cloud...");

			// make sure to lowercase the username
			dict = myself.cloud.parseDict(location.hash.substr(9));
			dict.Username = dict.Username.toLowerCase();

			myself.cloud.getPublicProject(
				dict.ProjectName,
				dict.Username,
				(projectData) => {
					var msg;
					myself.nextSteps([
						() => (msg = myself.showMessage("Opening project...")),
						() => {
							if (projectData.indexOf("<snapdata") === 0) {
								myself.rawOpenCloudDataString(projectData);
							} else if (projectData.indexOf("<project") === 0) {
								myself.rawOpenProjectString(projectData);
							}
							myself.hasChangedMedia = true;
						},
						() => {
							myself.shield.destroy();
							myself.shield = null;
							msg.destroy();
							applyFlags(dict);
						},
					]);
				},
				this.cloudError()
			);
		} else if (location.hash.substr(0, 7) === "#cloud:") {
			this.shield = new Morph();
			this.shield.alpha = 0;
			this.shield.setExtent(this.parent.extent());
			this.parent.add(this.shield);
			myself.showMessage("Fetching project\nfrom the cloud...");

			// make sure to lowercase the username
			dict = myself.cloud.parseDict(location.hash.substr(7));

			myself.cloud.getPublicProject(
				dict.ProjectName,
				dict.Username,
				(projectData) => {
					var msg;
					myself.nextSteps([
						() => (msg = myself.showMessage("Opening project...")),
						() => {
							if (projectData.indexOf("<snapdata") === 0) {
								myself.rawOpenCloudDataString(projectData);
							} else if (projectData.indexOf("<project") === 0) {
								myself.rawOpenProjectString(projectData);
							}
							myself.hasChangedMedia = true;
						},
						() => {
							myself.shield.destroy();
							myself.shield = null;
							msg.destroy();
							myself.toggleAppMode(false);
						},
					]);
				},
				this.cloudError()
			);
		} else if (location.hash.substr(0, 4) === "#dl:") {
			myself.showMessage("Fetching project\nfrom the cloud...");

			// make sure to lowercase the username
			dict = myself.cloud.parseDict(location.hash.substr(4));
			dict.Username = dict.Username.toLowerCase();

			myself.cloud.getPublicProject(
				dict.ProjectName,
				dict.Username,
				(projectData) => {
					myself.saveXMLAs(projectData, dict.ProjectName);
					myself.showMessage("Saved project\n" + dict.ProjectName, 2);
				},
				this.cloudError()
			);
		} else if (location.hash.substr(0, 6) === "#lang:") {
			dict = myself.cloud.parseDict(location.hash.substr(6));
			applyFlags(dict);
		} else if (location.hash.substr(0, 7) === "#signup") {
			this.createCloudAccount();
		}
		this.loadNewProject = false;
	}

	// function launcherLangSetting() {
	// 	var langSetting = null;
	// 	if (location.hash.substr(0, 6) === "#lang:") {
	// 		if (location.hash.charAt(8) === "_") {
	// 			langSetting = location.hash.slice(6, 11);
	// 		} else {
	// 			langSetting = location.hash.slice(6, 8);
	// 		}
	// 	}
	// 	// lang-flag wins lang-anchor setting
	// 	langSetting = myself.cloud.parseDict(location.hash).lang || langSetting;
	// 	return langSetting;
	// }

	function launcherLangSetting() {
		var langSetting = null;
		if (location.search.includes("lang=")) {
			langSetting = location.search.split("lang=")[1].split("&")[0];
		} else if (location.hash.substr(0, 6) === "#lang:") {
			if (location.hash.charAt(8) === "_") {
				langSetting = location.hash.slice(6, 11);
			} else {
				langSetting = location.hash.slice(6, 8);
			}
		}
		// lang-flag wins lang-anchor setting
		langSetting = myself.cloud.parseDict(location.hash).lang || langSetting;
		return langSetting;
	}

	if (launcherLangSetting()) {
		// launch with this non-persisten lang setting
		this.loadNewProject = true;
		this.setLanguage(launcherLangSetting(), interpretUrlAnchors, true);
	} else if (this.userLanguage) {
		this.loadNewProject = true;
		this.setLanguage(this.userLanguage, interpretUrlAnchors);
	} else {
		interpretUrlAnchors.call(this);
	}

	// Checks and loads in current project
	function loadCSDTProject() {
		if (typeof config !== "undefined") {
			if (typeof config.project !== "undefined") {
				myself.cloud.getProject(
					config.project,
					"",
					function (response) {
						myself.source = "cloud";
						myself.droppedText(response);
					},
					myself.cloudError()
				);
			}
		}
	}
	loadCSDTProject();

	if (location.protocol === "file:") {
		Process.prototype.enableJS = true;
	} else {
		if (!sessionStorage.username) {
			// check whether login should persist across browser sessions
			this.cloud.initSession(initUser);
		} else {
			// login only persistent during a single browser session
			this.cloud.checkCredentials(initUser);
		}
	}

	world.keyboardFocus = this.stage;
	this.warnAboutIE();

	// configure optional settings
	this.applyConfigurations();

	this.warnAboutDev();
	return this;
};

IDE_Morph.prototype.saveProjectToCloud = function (name) {
	var projectBody, projectSize;

	this.confirm(localize("Are you sure you want to replace") + '\n"' + name + '"?', "Replace Project", () => {
		if (name) {
			name = this.setProjectName(name);
		}

		this.showMessage("Saving project\nto the cloud...");
		projectBody = this.buildProjectRequest();
		projectSize = this.verifyProject(projectBody);
		if (!projectSize) {
			return;
		} // Invalid Projects don't return anything.
		this.showMessage("Uploading " + Math.round(projectSize / 1024) + " KB...");
		this.cloud.saveProject(
			this.getProjectName(),
			projectBody,
			(data) => {
				this.recordSavedChanges();
				this.cloud.updateURL(data.id);
				this.cloud.project_id = data.id;
				this.cloud.project_approved = data.approved;
				this.showMessage("saved.", 2);
			},
			this.cloudError()
		);
	});
};

IDE_Morph.prototype.saveAsProjectToCloud = function (name) {
	var projectBody, projectSize;

	if (name) {
		this.setProjectName(name);
	}

	if (this.cloud.project_id) {
		this.cloud.project_id = null;
	}
	this.showMessage("Saving project\nto the cloud...");
	projectBody = this.buildProjectRequest();
	projectSize = this.verifyProject(projectBody);
	if (!projectSize) {
		return;
	} // Invalid Projects don't return anything.
	this.showMessage("Uploading " + Math.round(projectSize / 1024) + " KB...");
	this.cloud.saveProject(
		this.getProjectName(),
		projectBody,
		(data) => {
			this.recordSavedChanges();

			this.cloud.updateURL(data.id);
			this.cloud.project_id = data.id;
			this.cloud.project_approved = data.approved;

			this.showMessage("saved.", 2);
		},
		this.cloudError()
	);
};

IDE_Morph.prototype.save = function () {
	// temporary hack - only allow exporting projects to disk
	// when running Snap! locally without a web server
	var pn = this.getProjectName();
	if (location.protocol === "file:") {
		if (pn) {
			this.exportProject(pn);
		} else {
			this.prompt("Export Project As...", (name) => this.exportProject(name), null, "exportProject");
		}
		return;
	}

	if (this.source === "examples" || this.source === "local") {
		// cannot save to examples, deprecated localStorage
		this.source = null;
	}

	if (this.cloud.disabled) {
		this.source = "disk";
	}

	if (pn) {
		if (this.source === "disk") {
			this.exportProject(pn);
		} else if (this.source === "cloud") {
			if (this.cloud.project_id) {
				if (this.cloud.project_approved) {
					this.saveProjectsBrowser();
				} else {
					this.saveProjectToCloud(pn);
				}
			} else {
				this.saveProjectsBrowser();
			}
		} else {
			this.saveProjectsBrowser();
		}
	} else {
		this.saveProjectsBrowser();
	}
};

IDE_Morph.prototype.aboutSnap = function () {
	var dlg,
		aboutTxt,
		noticeTxt,
		creditsTxt,
		versions = "",
		translations,
		module,
		btn1,
		btn2,
		btn3,
		btn4,
		licenseBtn,
		translatorsBtn,
		world = this.world();

	aboutTxt = "CSnap! 11.0.0\nSnap! with Culture\n\n";
	"        CSnap Pro! was developed by the CSDT Team and " +
		"the University of Michigan       \n" +
		"with support from the National Science Foundation (NSF).\n\n" +
		"The design of CSnap! is influenced and inspired by Snap!,\n" +
		"created by Jens M\u00F6nig.\n\n";
	+"for more information see https://csdt.org";

	noticeTxt =
		localize("License") +
		"\n\n" +
		"Snap! is free software: you can redistribute it and/or modify\n" +
		"it under the terms of the GNU Affero General Public License as\n" +
		"published by the Free Software Foundation, either version 3 of\n" +
		"the License, or (at your option) any later version.\n\n" +
		"This program is distributed in the hope that it will be useful,\n" +
		"but WITHOUT ANY WARRANTY; without even the implied warranty of\n" +
		"MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the\n" +
		"GNU Affero General Public License for more details.\n\n" +
		"You should have received a copy of the\n" +
		"GNU Affero General Public License along with this program.\n" +
		"If not, see http://www.gnu.org/licenses/\n\n" +
		"Want to use Snap! but scared by the open-source license?\n" +
		"Get in touch with us, we'll make it work.";

	creditsTxt =
		localize("Contributors") +
		"\n\nNathan Dinsmore: Saving/Loading, Snap-Logo Design, " +
		"\ncountless bugfixes and optimizations" +
		"\nMichael Ball: Time/Date UI, Library Import Dialog," +
		"\ncountless bugfixes and optimizations" +
		"\nBernat Romagosa: Countless contributions" +
		"\nBartosz Leper: Retina Display Support" +
		"\nDariusz Dorożalski: Web Serial Support," +
		"\ncountless bugfixes and optimizations" +
		"\nZhenlei Jia and Dariusz Dorożalski: IME text editing" +
		"\nKen Kahn: IME support and countless other contributions" +
		"\nJosep Ferràndiz: Video Motion Detection" +
		"\nJoan Guillén: Countless contributions" +
		"\nKartik Chandra: Paint Editor" +
		"\nMichael Aschauer: Embroidery machine support" +
		"\nCarles Paredes: Initial Vector Paint Editor" +
		'\n"Ava" Yuan Yuan, Deborah Servilla: Graphic Effects' +
		"\nKyle Hotchkiss: Block search design" +
		"\nBrian Broll: Many bugfixes and optimizations" +
		"\nEckart Modrow: SciSnap! Extension" +
		"\nBambi Brewer: Birdbrain Robotics Extension Support" +
		"\nGlen Bull & team: TuneScope Music Extension" +
		"\nIan Reynolds: UI Design, Event Bindings, " +
		"Sound primitives" +
		"\nJadga Hügle: Icons and countless other contributions" +
		"\nSimon Walters & Xavier Pi: MQTT extension" +
		"\nVictoria Phelps: Reporter results tracing" +
		"\nSimon Mong: Custom blocks palette arrangement" +
		"\nIvan Motyashov: Initial Squeak Porting" +
		"\nLucas Karahadian: Piano Keyboard Design" +
		"\nego-lay-atman-bay: Piano Keyboard Octave Switching" +
		"\nDavide Della Casa: Morphic Optimizations" +
		"\nAchal Dave: Web Audio" +
		"\nJoe Otto: Morphic Testing and Debugging" +
		"\n\n" +
		"Jahrd, Derec, Jamet, Sarron, Aleassa, and Lirin costumes" +
		"\nare watercolor paintings by Meghan Taylor and represent" +
		"\n characters from her webcomic Prophecy of the Circle," +
		"\nlicensed to us only for use in Snap! projects." +
		"\nMeghan also painted the Tad costumes," +
		"\nbut that character is in the public domain.";

	for (module in modules) {
		if (Object.prototype.hasOwnProperty.call(modules, module)) {
			versions += "\n" + module + " (" + modules[module] + ")";
		}
	}
	if (versions !== "") {
		versions = localize("current module versions:") + " \n\n" + "morphic (" + morphicVersion + ")" + versions;
	}
	translations = localize("Translations") + "\n" + SnapTranslator.credits();

	dlg = new DialogBoxMorph();

	function txt(textString) {
		var tm = new TextMorph(
				textString,
				dlg.fontSize,
				dlg.fontStyle,
				true,
				false,
				"center",
				null,
				null,
				MorphicPreferences.isFlat ? null : new Point(1, 1),
				WHITE
			),
			scroller,
			maxHeight = world.height() - dlg.titleFontSize * 10;
		if (tm.height() > maxHeight) {
			scroller = new ScrollFrameMorph();
			scroller.acceptsDrops = false;
			scroller.contents.acceptsDrops = false;
			scroller.bounds.setWidth(tm.width());
			scroller.bounds.setHeight(maxHeight);
			scroller.addContents(tm);
			scroller.color = new Color(0, 0, 0, 0);
			return scroller;
		}
		return tm;
	}

	dlg.inform("About Snap", aboutTxt, world, this.logo.cachedTexture);
	btn1 = dlg.buttons.children[0];
	translatorsBtn = dlg.addButton(() => {
		dlg.addBody(txt(translations));
		dlg.body.fixLayout();
		btn1.show();
		btn2.show();
		btn3.hide();
		btn4.hide();
		licenseBtn.hide();
		translatorsBtn.hide();
		dlg.fixLayout();
		dlg.setCenter(world.center());
	}, "Translators...");
	btn2 = dlg.addButton(() => {
		dlg.addBody(txt(aboutTxt));
		dlg.body.fixLayout();
		btn1.show();
		btn2.hide();
		btn3.show();
		btn4.show();
		licenseBtn.show();
		translatorsBtn.hide();
		dlg.fixLayout();
		dlg.setCenter(world.center());
	}, "Back...");
	btn2.hide();
	licenseBtn = dlg.addButton(() => {
		dlg.addBody(txt(noticeTxt));
		dlg.body.fixLayout();
		btn1.show();
		btn2.show();
		btn3.hide();
		btn4.hide();
		licenseBtn.hide();
		translatorsBtn.hide();
		dlg.fixLayout();
		dlg.setCenter(world.center());
	}, "License...");
	btn3 = dlg.addButton(() => {
		dlg.addBody(txt(versions));
		dlg.body.fixLayout();
		btn1.show();
		btn2.show();
		btn3.hide();
		btn4.hide();
		licenseBtn.hide();
		translatorsBtn.hide();
		dlg.fixLayout();
		dlg.setCenter(world.center());
	}, "Modules...");
	btn4 = dlg.addButton(() => {
		dlg.addBody(txt(creditsTxt));
		dlg.body.fixLayout();
		btn1.show();
		btn2.show();
		translatorsBtn.show();
		btn3.hide();
		btn4.hide();
		licenseBtn.hide();
		dlg.fixLayout();
		dlg.setCenter(world.center());
	}, "Credits...");
	translatorsBtn.hide();
	dlg.fixLayout();
};
