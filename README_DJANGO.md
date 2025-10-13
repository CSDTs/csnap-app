# CSnap Django Integration - Quick Start

This guide helps you integrate CSnap into your Django application.

## The Issue You're Facing

When serving CSnap from Django at URLs like `/applications/109/`, library extensions fail to load because:

1. ❌ CSnap uses relative paths that don't work with Django's URL structure
2. ❌ Django doesn't automatically serve the library files

## The Solution (2 Steps)

### ✅ Step 1: Fix CSnap Path Handling (DONE)

The `csnap/gui.js` file has been updated to prepend Django paths to library URLs.

**What was changed:** Added `autoLoadExtensions()` override in `csnap/gui.js` (line 729)

**Status:** ✅ **Complete** - Your paths are now correct!

### ⏳ Step 2: Configure Django to Serve Files (YOU NEED TO DO THIS)

Django needs to be configured to actually serve the CSnap static files.

## Quick Setup (5 Minutes)

### Option A: Copy-Paste Solution (Fastest)

1. **Copy the view file:**

   ```bash
   cp django_csnap_view.py /path/to/your/django/app/
   ```

2. **Update `CSNAP_ROOT` in `django_csnap_view.py`:**

   ```python
   CSNAP_ROOT = '/Users/ahunn/Projects/csdt/migration/csnap'
   ```

3. **Add to your `urls.py`:**

   ```python
   from django.urls import re_path
   from .django_csnap_view import serve_csnap_file

   urlpatterns = [
       # ... your other URLs ...

       # CSnap files (put this last!)
       re_path(
           r'^applications/(?P<application_id>\d+)/(?P<file_path>.+)$',
           serve_csnap_file,
           name='serve_csnap_file'
       ),
   ]
   ```

4. **Restart Django and test!**

### Option B: Use Whitenoise (Production-Ready)

See **[DJANGO_STATIC_FILES_SETUP.md](./DJANGO_STATIC_FILES_SETUP.md)** for complete Whitenoise setup.

## Files You Need to Know About

| File                             | Purpose                                                      |
| -------------------------------- | ------------------------------------------------------------ |
| **DJANGO_FIX.md**                | Explains the CSnap path handling fix (Part 1)                |
| **DJANGO_STATIC_FILES_SETUP.md** | Complete guide for Django static file configuration (Part 2) |
| **django_csnap_view.py**         | Ready-to-use Django view for serving CSnap files             |
| **django-template-example.html** | Example Django template showing proper configuration         |
| **csnap/gui.js**                 | Modified file with path fix (lines 729-767)                  |

## Testing

### 1. Test with Debug View

Add to your `urls.py`:

```python
from .django_csnap_view import csnap_debug_view

urlpatterns = [
    path('csnap-debug/', csnap_debug_view),
]
```

Visit: `http://localhost:8000/csnap-debug/`

This will show:

- ✅ If CSnap directory is found
- ✅ If key files exist
- ✅ Directory contents

### 2. Test File Serving

Try loading a file directly in your browser:

```
http://localhost:8000/applications/109/libraries/beetle/babylon.js
```

**Expected:** JavaScript file content
**Not:** 404 error or HTML page

### 3. Test in Browser Console

Open your CSnap app and check the browser console:

- ✅ No 404 errors for library files
- ✅ Files load with correct MIME type (`application/javascript`)
- ✅ Beetle/websockets extensions work

## Common Errors & Solutions

### Error: `GET .../babylon.js 404 (Not Found)` + `MIME type 'text/html'`

**Problem:** Django is not serving the file (returning 404 HTML page)

**Solution:** You're at this step now! Configure Django using Option A or B above.

### Error: `GET .../babylon.js 404` (File path looks wrong)

**Problem:** CSnap path handling not configured

**Solution:** Make sure you set `assetPath` in your template:

```javascript
new IDE_Morph({
	assetPath: "/applications/{{ application.id }}/",
}).openIn(world);
```

### Error: Permission denied reading file

**Problem:** Django doesn't have read permissions

**Solution:**

```bash
chmod -R 755 /path/to/csnap
```

### Error: File served but MIME type is wrong

**Problem:** MIME type not set correctly

**Solution:** The `django_csnap_view.py` handles this automatically. Make sure you're using it!

## Template Setup

Your Django template should look like this:

```html
<!doctype html>
<html>
	<head>
		<title>CSnap</title>

		<!-- Configure asset path -->
		<script type="text/javascript">
			let config = {
				asset_path: "/applications/{{ application.id }}/",
			};
		</script>

		<!-- Load CSnap scripts -->
		<script src="/applications/{{ application.id }}/snap/src/morphic.js"></script>
		<script src="/applications/{{ application.id }}/csnap/morphic.js"></script>
		<!-- ... more scripts ... -->
		<script src="/applications/{{ application.id }}/snap/src/gui.js"></script>
		<script src="/applications/{{ application.id }}/csnap/gui.js"></script>

		<script>
			window.onload = function () {
				world = new WorldMorph(document.getElementById("world"));
				new IDE_Morph({
					assetPath: "/applications/{{ application.id }}/",
				}).openIn(world);
			};
		</script>
	</head>
	<body>
		<canvas id="world"></canvas>
	</body>
</html>
```

See **[django-template-example.html](./django-template-example.html)** for a complete example.

## What's Next?

1. ✅ **Part 1 is done** - CSnap path handling is fixed
2. ⏳ **Do Part 2 now** - Configure Django to serve files (see above)
3. 🎉 **Test it** - Load CSnap in your browser and use library extensions

## Need More Help?

- **Detailed Django setup:** See [DJANGO_STATIC_FILES_SETUP.md](./DJANGO_STATIC_FILES_SETUP.md)
- **Understanding the fix:** See [DJANGO_FIX.md](./DJANGO_FIX.md)
- **Ready-to-use view:** Use [django_csnap_view.py](./django_csnap_view.py)

## Production Deployment

For production, consider:

1. **Use Whitenoise** - Efficient static file serving in Django
2. **Use Nginx/Apache** - Serve static files directly (fastest)
3. **Enable caching** - Set long cache times for library files
4. **CDN** - Consider hosting CSnap on a CDN for global apps

See **[DJANGO_STATIC_FILES_SETUP.md](./DJANGO_STATIC_FILES_SETUP.md)** for production setup guides.

