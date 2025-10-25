var moduleUrl = world.children[0].getVar("__module__beetle__"),
	baseUrl = moduleUrl.substring(0, moduleUrl.lastIndexOf("/") + 1);

function loadSrc(url) {
	var url = baseUrl + url;
	return new Promise((resolve, reject) => {
		if (contains(SnapExtensions.scripts, url)) {
			console.log("[beetle init.js] Script already loaded, skipping:", url);
			resolve(); // Resolve instead of reject to continue the chain
			return;
		}
		scriptElement = document.createElement("script");
		scriptElement.onload = () => {
			SnapExtensions.scripts.push(url);
			console.log("[beetle init.js] Script loaded:", url);
			resolve();
		};
		scriptElement.onerror = (err) => {
			console.error("[beetle init.js] Script load error:", url, err);
			reject(err);
		};
		document.head.appendChild(scriptElement);
		scriptElement.src = url;
	});
}

loadSrc("babylon.js")
	.then(() => loadSrc("babylonjs.loaders.min.js"))
	.then(() => loadSrc("babylon.gridMaterial.min.js"))
	.then(() => loadSrc("babylonjs.serializers.min.js"))
	.then(() => loadSrc("earcut.min.js"))
	.then(() => console.log("Loading Beetle library"))
	.then(() => loadSrc("beetle.js"));

// .then(() => loadSrc("anansebot.js"));
