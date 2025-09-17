ListMorph.prototype.deactivateIndex = function (idx) {
	var item = this.listContents.children[idx];
	if (!item) {
		return;
	}
	item.userState = "normal";
	item.rerender();
};
