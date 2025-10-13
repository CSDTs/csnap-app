"""
CSnap Static File Serving for Django

Drop this into your Django app and add the URL pattern to serve CSnap files.

USAGE:
------
1. Copy this file to your Django app directory
2. Add to your urls.py:

    from django.urls import re_path
    from .django_csnap_view import serve_csnap_file

    urlpatterns = [
        # ... your other URLs ...
        
        # CSnap static files (must be at the end)
        re_path(
            r'^applications/(?P<application_id>\d+)/(?P<file_path>.+)$',
            serve_csnap_file,
            name='serve_csnap_file'
        ),
    ]

3. Update CSNAP_ROOT below to point to your CSnap directory
"""

from django.http import FileResponse, Http404, HttpResponse
from django.views.decorators.http import require_safe
from django.conf import settings
import os
import mimetypes

# ============================================================================
# CONFIGURATION
# ============================================================================

# Path to your CSnap directory
# Option 1: Relative to Django project
CSNAP_ROOT = os.path.join(settings.BASE_DIR, 'csnap')

# Option 2: Absolute path (uncomment and modify if needed)
# CSNAP_ROOT = '/Users/ahunn/Projects/csdt/migration/csnap'

# ============================================================================
# VIEW
# ============================================================================

@require_safe
def serve_csnap_file(request, application_id, file_path):
    """
    Serve CSnap static files for a specific application.
    
    Args:
        request: Django request object
        application_id: Application ID from URL (e.g., 109)
        file_path: Relative path to file (e.g., libraries/beetle/babylon.js)
    
    Returns:
        FileResponse with the requested file
    
    Raises:
        Http404: If file doesn't exist or path is invalid
    """
    
    # Security: Normalize path and prevent directory traversal
    safe_path = os.path.normpath(file_path)
    if safe_path.startswith('..') or safe_path.startswith('/'):
        raise Http404("Invalid file path")
    
    # Build full file path
    full_path = os.path.join(CSNAP_ROOT, safe_path)
    
    # Check if file exists and is a file (not directory)
    if not os.path.exists(full_path):
        raise Http404(f"File not found: {file_path}")
    
    if not os.path.isfile(full_path):
        raise Http404(f"Path is not a file: {file_path}")
    
    # Determine MIME type
    mime_type, encoding = mimetypes.guess_type(full_path)
    
    # Fallback MIME types for common file extensions
    if mime_type is None:
        extension = os.path.splitext(full_path)[1].lower()
        mime_type_map = {
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.html': 'text/html',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.ttf': 'font/ttf',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
        }
        mime_type = mime_type_map.get(extension, 'application/octet-stream')
    
    # Create response with file
    try:
        response = FileResponse(
            open(full_path, 'rb'),
            content_type=mime_type
        )
    except IOError:
        raise Http404(f"Cannot read file: {file_path}")
    
    # Add caching headers for performance
    if not settings.DEBUG:
        # Cache for 1 year for production
        response['Cache-Control'] = 'public, max-age=31536000, immutable'
    else:
        # Short cache for development
        response['Cache-Control'] = 'public, max-age=60'
    
    # Optional: Add CORS headers if needed
    # response['Access-Control-Allow-Origin'] = '*'
    
    return response


# ============================================================================
# ALTERNATIVE: Catch-all view for any CSnap path pattern
# ============================================================================

@require_safe
def serve_csnap_file_any_pattern(request, file_path):
    """
    Alternative view that works with any URL pattern.
    
    Use this if you want to serve CSnap from different URL structures.
    
    Example URL patterns:
        re_path(r'^csnap/(?P<file_path>.+)$', serve_csnap_file_any_pattern),
        re_path(r'^static/csnap/(?P<file_path>.+)$', serve_csnap_file_any_pattern),
    """
    # Same implementation as above but without application_id
    safe_path = os.path.normpath(file_path)
    if safe_path.startswith('..') or safe_path.startswith('/'):
        raise Http404("Invalid file path")
    
    full_path = os.path.join(CSNAP_ROOT, safe_path)
    
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise Http404(f"File not found: {file_path}")
    
    mime_type, _ = mimetypes.guess_type(full_path)
    if mime_type is None:
        mime_type = 'application/octet-stream'
    
    response = FileResponse(open(full_path, 'rb'), content_type=mime_type)
    
    if not settings.DEBUG:
        response['Cache-Control'] = 'public, max-age=31536000'
    
    return response


# ============================================================================
# DEBUG: Test view to check configuration
# ============================================================================

def csnap_debug_view(request):
    """
    Debug view to check if CSnap files are accessible.
    
    Add to urls.py:
        path('csnap-debug/', csnap_debug_view),
    
    Visit: http://localhost:8000/csnap-debug/
    """
    html = f"""
    <html>
    <head><title>CSnap Debug</title></head>
    <body>
        <h1>CSnap Configuration Debug</h1>
        
        <h2>Settings</h2>
        <ul>
            <li><strong>CSNAP_ROOT:</strong> {CSNAP_ROOT}</li>
            <li><strong>Exists:</strong> {os.path.exists(CSNAP_ROOT)}</li>
            <li><strong>Is Directory:</strong> {os.path.isdir(CSNAP_ROOT)}</li>
            <li><strong>DEBUG:</strong> {settings.DEBUG}</li>
        </ul>
        
        <h2>Directory Contents</h2>
        <ul>
    """
    
    if os.path.exists(CSNAP_ROOT):
        try:
            for item in os.listdir(CSNAP_ROOT)[:20]:  # Show first 20 items
                full_item = os.path.join(CSNAP_ROOT, item)
                item_type = 'DIR' if os.path.isdir(full_item) else 'FILE'
                html += f"<li>[{item_type}] {item}</li>"
        except Exception as e:
            html += f"<li>Error reading directory: {e}</li>"
    else:
        html += "<li>CSNAP_ROOT does not exist!</li>"
    
    html += """
        </ul>
        
        <h2>Test Files</h2>
        <ul>
    """
    
    test_files = [
        'index.html',
        'libraries/beetle/init.js',
        'libraries/beetle/babylon.js',
        'libraries/LIBRARIES.json',
        'snap/src/morphic.js',
    ]
    
    for test_file in test_files:
        test_path = os.path.join(CSNAP_ROOT, test_file)
        exists = os.path.exists(test_path)
        status = '✅' if exists else '❌'
        html += f"<li>{status} {test_file}</li>"
    
    html += """
        </ul>
    </body>
    </html>
    """
    
    return HttpResponse(html)


# ============================================================================
# NOTES
# ============================================================================

"""
SECURITY NOTES:
--------------
1. Path traversal protection is included (prevents ../../../etc/passwd)
2. Only files within CSNAP_ROOT can be served
3. The view is read-only (@require_safe decorator)
4. Consider adding authentication if your app requires it

PERFORMANCE NOTES:
-----------------
1. Caching headers are set for production
2. For high-traffic sites, consider serving static files with Nginx/Apache
3. Consider using Whitenoise for production deployments

DEBUGGING:
---------
1. Use the csnap_debug_view to check configuration
2. Check Django logs for file access errors
3. Verify file permissions (Django user needs read access)
4. Check that CSNAP_ROOT path is correct

EXAMPLE USAGE IN TEMPLATE:
-------------------------
{% load static %}
<!DOCTYPE html>
<html>
<head>
    <script>
        let config = {
            asset_path: "/applications/{{ application.id }}/",
        };
    </script>
    <script src="/applications/{{ application.id }}/snap/src/morphic.js"></script>
    <script src="/applications/{{ application.id }}/csnap/gui.js"></script>
</head>
<body>
    <canvas id="world"></canvas>
    <script>
        var world = new WorldMorph(document.getElementById("world"));
        new IDE_Morph({
            assetPath: "/applications/{{ application.id }}/",
        }).openIn(world);
    </script>
</body>
</html>
"""


