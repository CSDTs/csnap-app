// Block syntax for new dropdown options in blocks
let jensSyntax = SyntaxElementMorph.prototype.labelParts;
export let csdtSyntax = {
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
      target: ["target"],
      source: ["source"],
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

// SyntaxElementMorph function
// export let labelParts = {
//   ...jensSyntax,
//   ...csdtSyntax,
// };

// Hide primitive reversal for tutorials, BlockMorph
export function showPrimitive() {
  var ide = this.parentThatIsA(IDE_Morph),
    dict,
    cat;
  if (!ide) {
    return;
  }
  delete StageMorph.prototype.hiddenPrimitives[this.selector];
  dict = {
    doWarp: "control",
    reifyScript: "operators",
    reifyReporter: "operators",
    reifyPredicate: "operators",
    doDeclareVariables: "variables",
  };
  cat = dict[this.selector] || this.category;
  if (cat === "lists") {
    cat = "variables";
  }
  ide.flushBlocksCache(cat);
  ide.refreshPalette();
}
