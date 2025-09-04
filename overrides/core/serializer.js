// TODO SnapSerializer.prototype.openProject for tutorial overrides

export let app = "CSnap! Pro, http://csdt.org";

export function loadScene(xmlNode, remixID) {
  // private
  var scene = new Scene(),
    model,
    nameID;

  this.scene = scene;

  model = { scene: xmlNode };
  if (+xmlNode.attributes.version > this.version) {
    throw "Project uses newer version of Serializer";
  }

  /* Project Info */

  this.objects = {};
  scene.name = model.scene.attributes.name;
  if (!scene.name) {
    nameID = 1;
    while (
      Object.prototype.hasOwnProperty.call(
        localStorage,
        "-snap-project-Untitled " + nameID
      )
    ) {
      nameID += 1;
    }
    scene.name = "Untitled " + nameID;
  }
  scene.unifiedPalette = model.scene.attributes.palette === "single";
  scene.showCategories = model.scene.attributes.categories !== "false";
  scene.showPaletteButtons = model.scene.attributes.buttons !== "false";
  scene.disableClickToRun = model.scene.attributes.clickrun === "false";
  scene.penColorModel =
    model.scene.attributes.colormodel === "hsl" ? "hsl" : "hsv";
  model.notes = model.scene.childNamed("notes");
  if (model.notes) {
    scene.notes = model.notes.contents;
  }
  model.palette = model.scene.childNamed("palette");
  if (model.palette) {
    scene.customCategories = this.loadPalette(model.palette);
    SpriteMorph.prototype.customCategories = scene.customCategories;
  }
  model.globalVariables = model.scene.childNamed("variables");

  /* Stage */

  model.stage = model.scene.require("stage");
  scene.stage.remixID = remixID;

  if (Object.prototype.hasOwnProperty.call(model.stage.attributes, "id")) {
    this.objects[model.stage.attributes.id] = scene.stage;
  }
  if (model.stage.attributes.name) {
    scene.stage.name = model.stage.attributes.name;
  }
  if (model.stage.attributes.color) {
    scene.stage.color = this.loadColor(model.stage.attributes.color);
    scene.stage.cachedColorDimensions =
      scene.stage.color[SpriteMorph.prototype.penColorModel]();
  }
  if (model.stage.attributes.volume) {
    scene.stage.volume = +model.stage.attributes.volume;
  }
  if (model.stage.attributes.pan) {
    scene.stage.pan = +model.stage.attributes.pan;
  }
  if (model.stage.attributes.penlog) {
    scene.enablePenLogging = model.stage.attributes.penlog === "true";
  }

  ////////////////////////////////

  if (model.stage.attributes.hideCostumesTab) {
    StageMorph.prototype.hideCostumesTab =
      model.stage.attributes.hideCostumesTab === "true";
  } else {
    StageMorph.prototype.hideCostumesTab = false;
  }
  if (model.stage.attributes.hideSoundsTab) {
    StageMorph.prototype.hideSoundsTab =
      model.stage.attributes.hideSoundsTab === "true";
  } else {
    StageMorph.prototype.hideSoundsTab = false;
  }
  if (model.stage.attributes.hideCorralBar) {
    IDE_Morph.prototype.hideCorralBar =
      model.stage.attributes.hideCorralBar === "true";
  } else {
    IDE_Morph.prototype.hideCorralBar = false;
  }
  if (model.stage.attributes.hideFileBtn) {
    IDE_Morph.prototype.hideFileBtn =
      model.stage.attributes.hideFileBtn === "true";
  } else {
    IDE_Morph.prototype.hideFileBtn = false;
  }
  if (model.stage.attributes.hideCloudBtn) {
    IDE_Morph.prototype.hideCloudBtn =
      model.stage.attributes.hideCloudBtn === "true";
  } else {
    IDE_Morph.prototype.hideCloudBtn = false;
  }
  if (model.stage.attributes.hideControlBtns) {
    IDE_Morph.prototype.hideControlBtns =
      model.stage.attributes.hideControlBtns === "true";
  } else {
    IDE_Morph.prototype.hideControlBtns = false;
  }
  if (model.stage.attributes.hideSpriteBar) {
    IDE_Morph.prototype.hideSpriteBar =
      model.stage.attributes.hideSpriteBar === "true";
  } else {
    IDE_Morph.prototype.hideSpriteBar = false;
  }
  if (model.stage.attributes.decategorize) {
    StageMorph.prototype.decategorize =
      model.stage.attributes.decategorize === "true";
  } else {
    StageMorph.prototype.decategorize = false;
  }
  if (model.stage.attributes.changeBlocks) {
    StageMorph.prototype.changeBlocks =
      model.stage.attributes.changeBlocks === "true";
  } else {
    StageMorph.prototype.changeBlocks = false;
  }
  if (model.stage.attributes.enableGlide) {
    StageMorph.prototype.enableGlide =
      model.stage.attributes.enableGlide === "true";
  } else {
    StageMorph.prototype.enableGlide = false;
  }
  ////////////////////////////////

  model.pentrails = model.stage.childNamed("pentrails");
  if (model.pentrails) {
    scene.pentrails = new Image();
    scene.pentrails.onload = function () {
      if (scene.stage.trailsCanvas) {
        // work-around a bug in FF
        normalizeCanvas(scene.stage.trailsCanvas);
        var context = scene.stage.trailsCanvas.getContext("2d");
        context.drawImage(scene.pentrails, 0, 0);
        scene.stage.changed();
      }
    };
    scene.pentrails.src = model.pentrails.contents;
  }
  scene.stage.setTempo(model.stage.attributes.tempo);
  if (model.stage.attributes.width) {
    scene.stage.dimensions.x = Math.max(+model.stage.attributes.width, 240);
  }
  if (model.stage.attributes.height) {
    scene.stage.dimensions.y = Math.max(+model.stage.attributes.height, 180);
  }
  scene.stage.setExtent(scene.stage.dimensions);
  scene.useFlatLineEnds = model.stage.attributes.lines === "flat";
  BooleanSlotMorph.prototype.isTernary =
    model.stage.attributes.ternary !== "false";
  scene.enableHyperOps = model.stage.attributes.hyperops !== "false";
  scene.stage.isThreadSafe = model.stage.attributes.threadsafe === "true";
  scene.enableCodeMapping = model.stage.attributes.codify === "true";
  scene.enableInheritance = model.stage.attributes.inheritance !== "false";
  scene.enableSublistIDs = model.stage.attributes.sublistIDs === "true";

  model.hiddenPrimitives = model.scene.childNamed("hidden");
  if (model.hiddenPrimitives) {
    model.hiddenPrimitives.contents.split(" ").forEach((sel) => {
      if (sel) {
        scene.hiddenPrimitives[sel] = true;
      }
    });
  }

  model.codeHeaders = model.scene.childNamed("headers");
  if (model.codeHeaders) {
    model.codeHeaders.children.forEach(
      (xml) => (scene.codeHeaders[xml.tag] = xml.contents)
    );
  }

  model.codeMappings = model.scene.childNamed("code");
  if (model.codeMappings) {
    model.codeMappings.children.forEach(
      (xml) => (scene.codeMappings[xml.tag] = xml.contents)
    );
  }

  model.globalBlocks = model.scene.childNamed("blocks");
  if (model.globalBlocks) {
    this.loadCustomBlocks(scene.stage, model.globalBlocks, true);
    this.populateCustomBlocks(scene.stage, model.globalBlocks, true);
  }
  this.loadObject(scene.stage, model.stage);

  /* Sprites */

  model.sprites = model.stage.require("sprites");
  if (model.sprites.attributes.select) {
    scene.spriteIdx = +model.sprites.attributes.select;
  }
  scene.spritesDict[scene.stage.name] = scene.stage;
  model.sprites
    .childrenNamed("sprite")
    .forEach((model) => this.loadValue(model));

  // restore inheritance and nesting associations
  this.scene.stage.children.forEach((sprite) => {
    var exemplar, anchor;
    if (sprite.inheritanceInfo) {
      // only sprites can inherit
      exemplar = this.scene.spritesDict[sprite.inheritanceInfo.exemplar];
      if (exemplar) {
        sprite.setExemplar(exemplar);
      }
      sprite.inheritedAttributes = sprite.inheritanceInfo.delegated || [];
      sprite.updatePropagationCache();
    }
    if (sprite.nestingInfo) {
      // only sprites may have nesting info
      anchor = this.scene.spritesDict[sprite.nestingInfo.anchor];
      if (anchor) {
        anchor.attachPart(sprite);
      }
      sprite.rotatesWithAnchor = sprite.nestingInfo.synch === "true";
    }
  });
  this.scene.stage.children.forEach((sprite) => {
    var costume;
    if (sprite.nestingInfo) {
      // only sprites may have nesting info
      sprite.nestingScale = +(sprite.nestingInfo.scale || sprite.scale);
      delete sprite.nestingInfo;
    }
    ["scripts", "costumes", "sounds"].forEach((att) => {
      if (sprite.inheritsAttribute(att)) {
        sprite.refreshInheritedAttribute(att);
      }
    });
    if (sprite.inheritsAttribute("costumes")) {
      if (sprite.inheritsAttribute("costume #")) {
        costume = sprite.exemplar.costume;
      } else {
        costume =
          sprite.costumes.asArray()[sprite.inheritanceInfo.costumeNumber - 1];
      }
      if (costume) {
        if (costume.loaded) {
          sprite.wearCostume(costume, true);
        } else {
          costume.loaded = function () {
            this.loaded = true;
            sprite.wearCostume(costume, true);
          };
        }
      }
    }
    delete sprite.inheritanceInfo;
  });

  /* Global Variables */

  if (model.globalVariables) {
    this.loadVariables(scene.globalVariables, model.globalVariables);
  }

  this.objects = {};

  /* Watchers */

  model.sprites.childrenNamed("watcher").forEach((model) => {
    var watcher, color, target, hidden, extX, extY;

    color = this.loadColor(model.attributes.color);
    target = Object.prototype.hasOwnProperty.call(model.attributes, "scope")
      ? scene.spritesDict[model.attributes.scope]
      : null;

    // determine whether the watcher is hidden, slightly
    // complicated to retain backward compatibility
    // with former tag format: hidden="hidden"
    // now it's: hidden="true"
    hidden =
      Object.prototype.hasOwnProperty.call(model.attributes, "hidden") &&
      model.attributes.hidden !== "false";

    if (Object.prototype.hasOwnProperty.call(model.attributes, "var")) {
      watcher = new WatcherMorph(
        model.attributes["var"],
        color,
        isNil(target) ? scene.globalVariables : target.variables,
        model.attributes["var"],
        hidden
      );
    } else {
      watcher = new WatcherMorph(
        localize(this.watcherLabels[model.attributes.s]),
        color,
        target,
        model.attributes.s,
        hidden
      );
    }
    watcher.setStyle(model.attributes.style || "normal");
    if (watcher.style === "slider") {
      watcher.setSliderMin(model.attributes.min || "1", true);
      watcher.setSliderMax(model.attributes.max || "100", true);
    }
    watcher.setPosition(
      scene.stage
        .topLeft()
        .add(new Point(+model.attributes.x || 0, +model.attributes.y || 0))
    );
    scene.stage.add(watcher);
    watcher.onNextStep = function () {
      this.currentValue = null;
    };

    // set watcher's contentsMorph's extent if it is showing a list and
    // its monitor dimensions are given
    if (
      watcher.currentValue instanceof List &&
      watcher.cellMorph.contentsMorph
    ) {
      extX = model.attributes.extX;
      if (extX) {
        watcher.cellMorph.contentsMorph.setWidth(+extX);
      }
      extY = model.attributes.extY;
      if (extY) {
        watcher.cellMorph.contentsMorph.setHeight(+extY);
      }
      // adjust my contentsMorph's handle position
      watcher.cellMorph.contentsMorph.handle.fixLayout();
    }
  });

  // clear sprites' inherited methods caches, if any
  this.scene.stage.children.forEach(
    (sprite) => (sprite.inheritedMethodsCache = [])
  );

  this.objects = {};
  return scene.initialize();
}

// export { app, loadScene };
