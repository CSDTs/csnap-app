#!/bin/bash

# Script to copy all files from libraries/ to snap/libraries/ except LIBRARIES.json
# Usage: ./copy-libraries.sh

# Set script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source and destination directories
SOURCE_DIR="$PROJECT_ROOT/libraries"
DEST_DIR="$PROJECT_ROOT/snap/libraries"

echo "Copying library files from libraries/ to snap/libraries/"
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_DIR"
echo "Excluding: LIBRARIES.json"
echo

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "✗ Source directory does not exist: $SOURCE_DIR"
    exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Copy all files and directories except LIBRARIES.json
find "$SOURCE_DIR" -mindepth 1 -name "LIBRARIES.json" -prune -o -type f -print0 | while IFS= read -r -d '' file; do
    # Get relative path from source directory
    relative_path="${file#$SOURCE_DIR/}"
    dest_file="$DEST_DIR/$relative_path"
    
    # Create destination directory if needed
    dest_dir="$(dirname "$dest_file")"
    mkdir -p "$dest_dir"
    
    # Copy the file
    cp "$file" "$dest_file"
    echo "✓ Copied $relative_path"
done

# Also copy directories (in case there are empty directories we want to preserve)
find "$SOURCE_DIR" -mindepth 1 -name "LIBRARIES.json" -prune -o -type d -print0 | while IFS= read -r -d '' dir; do
    # Get relative path from source directory
    relative_path="${dir#$SOURCE_DIR/}"
    dest_dir="$DEST_DIR/$relative_path"
    
    # Create destination directory
    mkdir -p "$dest_dir"
done

echo
echo "Copy operation complete!"
echo "Note: LIBRARIES.json was excluded from the copy operation"
