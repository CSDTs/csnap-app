var moduleUrl = world.children[0].getVar("__module__print3d__"),
	baseUrl = moduleUrl.substring(0, moduleUrl.lastIndexOf("/") + 1);

function loadSrc(url) {
	var url = baseUrl + url;
	return new Promise((resolve, reject) => {
		if (contains(SnapExtensions.scripts, url)) {
			console.log("[print3d init.js] Script already loaded, skipping:", url);
			resolve(); // Resolve instead of reject to continue the chain
			return;
		}
		scriptElement = document.createElement("script");
		scriptElement.onload = () => {
			SnapExtensions.scripts.push(url);
			console.log("[print3d init.js] Script loaded:", url);
			resolve();
		};
		scriptElement.onerror = (err) => {
			console.error("[print3d init.js] Script load error:", url, err);
			reject(err);
		};
		document.head.appendChild(scriptElement);
		scriptElement.src = url;
	});
}

loadSrc("clipper.js")
	.then(() => loadSrc("earcut.min.js"))
	.then(() => loadSrc("print3d-geometry.js"))
	.then(() => console.log("Loading print3d library"))
	.then(() => loadSrc("print3d.js"));
