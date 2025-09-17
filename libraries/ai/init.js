var moduleUrl = world.children[0].getVar("__module__nst__"),
	baseUrl = moduleUrl.substring(0, moduleUrl.lastIndexOf("/") + 1);

function loadSrc(url) {
	var url = baseUrl + url;

	return new Promise((resolve, reject) => {
		if (contains(SnapExtensions.scripts, url)) {
			reject();
		}
		scriptElement = document.createElement("script");
		scriptElement.onload = () => {
			SnapExtensions.scripts.push(url);
			resolve();
		};
		document.head.appendChild(scriptElement);
		scriptElement.src = url;
	});
}

loadSrc("bundle.js")
	.then(() => loadSrc("test.js"))
	.then(() => loadSrc("nst-core.js"))
	.then(() => loadSrc("nst-ui.js"))
	.then(() => loadSrc("nst.js"));
