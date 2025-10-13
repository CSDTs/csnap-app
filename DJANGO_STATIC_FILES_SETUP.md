# Django Static Files Setup for CSnap

## Problem

You're getting this error:

```
GET http://127.0.0.1:8000/applications/109/libraries/beetle/babylon.js net::ERR_ABORTED 404 (Not Found)
Refused to execute script because its MIME type ('text/html') is not executable
```

This means:

1. ✅ The path is **correct** (our fix is working!)
2. ❌ Django is **not serving** the static files from the `libraries` directory
3. ❌ Django is returning an HTML 404 page instead of the JS file

## Solution Options

You have several options to serve CSnap static files in Django:

### Option 1: Django Static Files (Development)

**Best for development.** Add to your Django app's `views.py`:

```python
from django.conf import settings
from django.http import FileResponse, Http404
from django.views.decorators.http import require_safe
import os
import mimetypes

@require_safe
def serve_csnap_file(request, application_id, file_path):
    """
    Serve CSnap static files for a specific application.
    This handles files like libraries/beetle/babylon.js
    """
    # Path to your csnap directory
    csnap_root = os.path.join(settings.BASE_DIR, 'csnap')

    # Security: prevent directory traversal
    safe_path = os.path.normpath(file_path)
    if safe_path.startswith('..') or safe_path.startswith('/'):
        raise Http404("Invalid file path")

    # Build full file path
    full_path = os.path.join(csnap_root, safe_path)

    # Check if file exists
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise Http404(f"File not found: {file_path}")

    # Guess MIME type
    mime_type, _ = mimetypes.guess_type(full_path)
    if mime_type is None:
        mime_type = 'application/octet-stream'

    # Return file with correct MIME type
    response = FileResponse(open(full_path, 'rb'), content_type=mime_type)

    # Optional: Add caching headers for performance
    if not settings.DEBUG:
        response['Cache-Control'] = 'public, max-age=31536000'  # 1 year

    return response
```

**Add to your `urls.py`:**

```python
from django.urls import path, re_path
from . import views

urlpatterns = [
    # ... your other URLs ...

    # Catch-all for CSnap files
    re_path(
        r'^applications/(?P<application_id>\d+)/(?P<file_path>.+)$',
        views.serve_csnap_file,
        name='serve_csnap_file'
    ),
]
```

### Option 2: Whitenoise (Production-Ready)

**Best for production.** Install and configure Whitenoise:

```bash
pip install whitenoise
```

**In `settings.py`:**

```python
# Add to MIDDLEWARE (after SecurityMiddleware)
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add this
    # ... rest of middleware
]

# Configure static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Add your csnap directory
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'csnap'),
]

# Optional: Enable compression and caching
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

**Then run:**

```bash
python manage.py collectstatic
```

**Update your URLs to use static files:**

```python
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ... your URLs
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
```

### Option 3: Custom Middleware (Flexible)

**For complex routing.** Create `middleware.py`:

```python
from django.http import FileResponse, Http404
from django.conf import settings
import os
import re
import mimetypes

class CSnapStaticFilesMiddleware:
    """
    Middleware to serve CSnap static files for application-specific paths.
    Handles URLs like /applications/109/libraries/beetle/babylon.js
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.csnap_root = os.path.join(settings.BASE_DIR, 'csnap')
        # Match /applications/{id}/{file_path}
        self.pattern = re.compile(r'^/applications/\d+/(.+)$')

    def __call__(self, request):
        # Check if this is a CSnap file request
        match = self.pattern.match(request.path)

        if match:
            file_path = match.group(1)
            return self.serve_file(file_path)

        # Not a CSnap file, continue normal processing
        response = self.get_response(request)
        return response

    def serve_file(self, file_path):
        # Security: prevent directory traversal
        safe_path = os.path.normpath(file_path)
        if safe_path.startswith('..') or safe_path.startswith('/'):
            raise Http404("Invalid file path")

        # Build full path
        full_path = os.path.join(self.csnap_root, safe_path)

        # Check if file exists
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            raise Http404(f"File not found: {file_path}")

        # Determine MIME type
        mime_type, _ = mimetypes.guess_type(full_path)
        if mime_type is None:
            mime_type = 'application/octet-stream'

        # Return file
        response = FileResponse(open(full_path, 'rb'), content_type=mime_type)

        # Add caching
        if not settings.DEBUG:
            response['Cache-Control'] = 'public, max-age=31536000'

        return response
```

**Add to `settings.py` MIDDLEWARE:**

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'yourapp.middleware.CSnapStaticFilesMiddleware',  # Add this
    # ... rest of middleware
]
```

### Option 4: Nginx/Apache (Production)

**Best for high-traffic production.** Configure your web server to serve static files directly.

**Nginx example:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve CSnap static files directly
    location ~* ^/applications/\d+/(libraries|snap|csnap|Backgrounds|Costumes|Sounds|Examples|img)/ {
        alias /path/to/your/csnap/;
        expires 1y;
        add_header Cache-Control "public, immutable";

        # Try to serve file, fall back to Django if not found
        try_files $uri @django;
    }

    # Django application
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location @django {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Recommended Approach

### For Development:

Use **Option 1** (Custom View) - it's simple and works immediately.

### For Production:

Use **Option 2** (Whitenoise) - it's Django-native and production-ready.

### For High Traffic:

Use **Option 4** (Nginx/Apache) - serves files directly without hitting Django.

## Testing

After implementing one of the options, test by:

1. **Check if the file serves correctly:**

   ```bash
   curl -I http://127.0.0.1:8000/applications/109/libraries/beetle/babylon.js
   ```

   Should return:

   ```
   HTTP/1.1 200 OK
   Content-Type: application/javascript
   ```

   NOT:

   ```
   HTTP/1.1 404 Not Found
   Content-Type: text/html
   ```

2. **Check browser console:** No 404 errors for library files

3. **Test beetle extension:** It should load and work correctly

## Directory Structure

Make sure your Django project can access the CSnap files:

```
your_django_project/
├── manage.py
├── your_app/
│   ├── views.py
│   ├── urls.py
│   └── ...
└── csnap/                    # Your CSnap directory
    ├── index.html
    ├── libraries/
    │   ├── beetle/
    │   │   ├── init.js
    │   │   ├── babylon.js
    │   │   ├── beetle.js
    │   │   └── ...
    │   ├── websockets/
    │   └── ...
    ├── snap/
    ├── csnap/
    └── ...
```

## Common Issues

### Issue: Still getting 404

- **Check:** File actually exists at the path
- **Check:** Django has read permissions
- **Check:** URL pattern matches your request

### Issue: Wrong MIME type

- **Fix:** Ensure you're using `mimetypes.guess_type()` or manually set:
  ```python
  mime_types = {
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
  }
  ```

### Issue: CORS errors

- **Fix:** Add CORS headers if serving from different domain:
  ```python
  response['Access-Control-Allow-Origin'] = '*'
  ```

## Quick Start (Choose This If Unsure)

**Fastest solution - Add this to your `views.py`:**

```python
from django.http import FileResponse, Http404
from django.conf import settings
import os

def serve_csnap_file(request, application_id, file_path):
    csnap_root = '/Users/ahunn/Projects/csdt/migration/csnap'  # Your actual path
    full_path = os.path.join(csnap_root, file_path)

    if os.path.exists(full_path) and os.path.isfile(full_path):
        return FileResponse(open(full_path, 'rb'))
    raise Http404()
```

**Add to `urls.py`:**

```python
from django.urls import re_path

urlpatterns = [
    re_path(r'^applications/(?P<application_id>\d+)/(?P<file_path>.+)$',
            serve_csnap_file),
]
```

This is the minimal working solution. You can enhance it later with proper MIME types, caching, and security.

