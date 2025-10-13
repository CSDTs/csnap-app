# Django Path Fix for CSnap Libraries

## Problem

When CSnap is served from a Django application at a path like `/applications/109/`, library extensions (like beetle, websockets, etc.) fail to load with 404 errors. This happens because:

1. Library XML files set `__module__` variables with relative paths like `libraries/beetle/init.js`
2. These init.js files then load additional JavaScript files using relative paths
3. In a Django context, these relative paths don't resolve correctly

Example error:

```
GET http://127.0.0.1:8000/applications/109/libraries/beetle/init.js net::ERR_ABORTED 404 (Not Found)
```

## Two-Part Solution

This fix requires **TWO steps**:

### Part 1: Fix CSnap Path Handling (This File)

Modify CSnap to prepend Django paths to library URLs.

### Part 2: Configure Django to Serve Files

Configure Django to actually serve the static files. See **[DJANGO_STATIC_FILES_SETUP.md](./DJANGO_STATIC_FILES_SETUP.md)** for detailed instructions.

## Part 1: CSnap Path Handling

The fix involves overriding the `autoLoadExtensions` method in `/csnap/gui.js` to:

1. **Detect relative library paths** - Check if module URLs are relative (not starting with `://` or `/`)
2. **Prepend the asset path** - Add the Django application's base path to relative URLs
3. **Maintain compatibility** - Check both the full URL and original URL against allowed patterns

### Code Changes

**File: `/Users/ahunn/Projects/csdt/migration/csnap/csnap/gui.js`**

Added an override for `IDE_Morph.prototype.autoLoadExtensions()` after the `resourceURL` method (around line 729):

```javascript
IDE_Morph.prototype.autoLoadExtensions = function () {
	// Override to prepend asset_path to module URLs for Django compatibility
	// This allows libraries to work correctly when served from paths like /applications/109/
	var urls = [],
		myself = this;

	Object.keys(this.globalVariables.vars).forEach((vName) => {
		var val, originalVal;
		if (vName.startsWith("__module__")) {
			val = this.globalVariables.getVar(vName);
			if (isString(val)) {
				originalVal = val;
				// Prepend asset_path if the URL is relative
				if (val.indexOf("://") === -1 && !val.startsWith("/")) {
					val = myself.asset_path + val;
				}
				urls.push({ fullUrl: val, originalUrl: originalVal });
			}
		}
	});

	urls.forEach((urlObj) => {
		var scriptElement,
			url = urlObj.fullUrl,
			originalUrl = urlObj.originalUrl;
		if (contains(SnapExtensions.scripts, url)) {
			return;
		}
		// Check if either the full URL or original URL matches allowed patterns
		if (
			Process.prototype.enableJS ||
			SnapExtensions.urls.some((any) => url.indexOf(any) === 0 || originalUrl.indexOf(any) === 0)
		) {
			scriptElement = document.createElement("script");
			scriptElement.onload = () => {
				SnapExtensions.scripts.push(url);
			};
			document.head.appendChild(scriptElement);
			scriptElement.src = url;
		}
	});
};
```

## Django Integration

When serving CSnap from Django, you need to ensure the `assetPath` configuration is set correctly in your template:

### Example Django Template

```html
<script type="text/javascript">
	let config = {
		modules: [],
		asset_path: "/applications/{{ application.id }}/", // Django-generated path
		urls: {
			demos_url: "demo.xml",
			goals_url: "goals.xml",
		},
	};
</script>

<!-- Load CSnap scripts -->
<script src="/applications/{{ application.id }}/snap/src/morphic.js"></script>
<!-- ... other scripts ... -->

<script>
	var world;
	window.onload = function () {
		world = new WorldMorph(document.getElementById("world"));
		new IDE_Morph({
			assetPath: "/applications/{{ application.id }}/", // Must match asset_path above
		}).openIn(world);
	};
</script>
```

## How It Works

### Before the Fix

1. Library XML sets: `__module__beetle__ = "libraries/beetle/init.js"`
2. `autoLoadExtensions` tries to load: `libraries/beetle/init.js` (fails - 404)
3. The browser looks for: `http://127.0.0.1:8000/libraries/beetle/init.js` (wrong path)

### After the Fix

1. Library XML sets: `__module__beetle__ = "libraries/beetle/init.js"`
2. `autoLoadExtensions` detects it's relative and prepends asset_path
3. Loads: `/applications/109/libraries/beetle/init.js` (success!)
4. The init.js file then calculates its base URL correctly from the full path
5. Subsequent resources load properly: `/applications/109/libraries/beetle/babylon.js`, etc.

## Library Init Files

The library init files (e.g., `libraries/beetle/init.js`) work by:

1. Reading the `__module__` variable to get their own script path
2. Extracting the base directory from that path
3. Loading additional resources relative to that base

Example from `libraries/beetle/init.js`:

```javascript
var moduleUrl = world.children[0].getVar("__module__beetle__"),
	baseUrl = moduleUrl.substring(0, moduleUrl.lastIndexOf("/") + 1);

function loadSrc(url) {
	var url = baseUrl + url; // Prepends the base URL
	// ... loads the script
}
```

With our fix, `moduleUrl` now contains the full Django path, so `baseUrl` is calculated correctly!

## Testing

To verify the fix works:

1. Serve CSnap from Django at a path like `/applications/109/`
2. Load a project that uses a library extension (e.g., beetle, websockets)
3. Open browser DevTools Network tab
4. Verify that library scripts load with the correct full path:
   - ✅ `http://127.0.0.1:8000/applications/109/libraries/beetle/init.js`
   - ✅ `http://127.0.0.1:8000/applications/109/libraries/beetle/babylon.js`
   - ❌ NOT `http://127.0.0.1:8000/libraries/beetle/init.js`

## Affected Libraries

This fix applies to all libraries that use the `__module__` variable pattern:

- beetle (3D Beetle graphics)
- websockets
- serial
- s4aConn (Snap4Arduino)
- ble (Bluetooth)
- ai/nst (Neural Style Transfer)
- microblocks
- Any custom extensions using the same pattern

## Backwards Compatibility

✅ This fix maintains full backwards compatibility:

- Works with relative paths (`./`, no asset path)
- Works with Django absolute paths (`/applications/109/`)
- Works with absolute URLs (`https://...`)
- Respects the existing `SnapExtensions.urls` allowlist
- Doesn't break existing standalone deployments

## Additional Notes

- The fix respects the existing security model (checks against `SnapExtensions.urls`)
- Libraries still need to be served by Django's static file system or custom views
- The `resourceURL` method is already defined for other resources (costumes, sounds, etc.)
- This pattern is consistent with how CSnap handles other asset paths

## Next Steps

⚠️ **IMPORTANT:** After implementing this path fix, you must configure Django to serve the static files.

👉 **See [DJANGO_STATIC_FILES_SETUP.md](./DJANGO_STATIC_FILES_SETUP.md)** for complete Django configuration instructions.

The error you're seeing:

```
GET http://127.0.0.1:8000/applications/109/libraries/beetle/babylon.js net::ERR_ABORTED 404 (Not Found)
```

Means the path is now **correct** (Part 1 ✅), but Django needs to be configured to serve these files (Part 2 ⏳).
