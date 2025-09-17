#!/bin/bash

# Script to migrate specific library XML files from snap/libraries/ to libraries/
# Usage: ./migrate-libraries.sh

# Set script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source and destination directories
SOURCE_DIR="$PROJECT_ROOT/snap/libraries"
DEST_DIR="$PROJECT_ROOT/libraries"
MICROWORLDS_SOURCE_DIR="$PROJECT_ROOT/snap/libraries/microworlds"
MICROWORLDS_DEST_DIR="$PROJECT_ROOT/libraries/microworlds"

# List of XML files to copy from main libraries directory
FILES=(
    "beetle.xml"
    "bignumbers.xml" 
    "microblocks.xml"
    "mqtt.xml"
    "s4aConn.xml"
    "SciSnap3Blocks.xml"
    "signada.xml"
    "TuneScope.xml"
    "websockets.xml"
)

# List of XML files to copy from microworlds directory
MICROWORLDS_FILES=(
    "translations.xml"
    "script-pic-costume.xml"
    "microworld.xml"
    "fancy-text.xml"
    "fancy-text-morphs.xml"
    "dialogs.xml"
)

echo "Migrating library XML files from snap/libraries/ to libraries/"
echo "Main source: $SOURCE_DIR"
echo "Main destination: $DEST_DIR"
echo "Microworlds source: $MICROWORLDS_SOURCE_DIR"
echo "Microworlds destination: $MICROWORLDS_DEST_DIR"
echo

# Create destination directories if they don't exist
mkdir -p "$DEST_DIR"
mkdir -p "$MICROWORLDS_DEST_DIR"

echo "Copying main library files..."
# Copy each file from main libraries directory and update library paths
for file in "${FILES[@]}"; do
    source_file="$SOURCE_DIR/$file"
    dest_file="$DEST_DIR/$file"
    
    if [ -f "$source_file" ]; then
        cp "$source_file" "$dest_file"
        
        # Replace "libraries/" with "snap/libraries/" in the copied file
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS version of sed
            sed -i '' 's|libraries/|snap/libraries/|g' "$dest_file"
        else
            # Linux version of sed
            sed -i 's|libraries/|snap/libraries/|g' "$dest_file"
        fi
        
        echo "✓ Copied and updated $file"
    else
        echo "✗ File not found: $source_file"
    fi
done

echo
echo "Copying microworlds library files..."
# Copy each file from microworlds directory and update library paths
for file in "${MICROWORLDS_FILES[@]}"; do
    source_file="$MICROWORLDS_SOURCE_DIR/$file"
    dest_file="$MICROWORLDS_DEST_DIR/$file"
    
    if [ -f "$source_file" ]; then
        cp "$source_file" "$dest_file"
        
        # Replace "libraries/" with "snap/libraries/" in the copied file
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS version of sed
            sed -i '' 's|libraries/|snap/libraries/|g' "$dest_file"
        else
            # Linux version of sed
            sed -i 's|libraries/|snap/libraries/|g' "$dest_file"
        fi
        
        echo "✓ Copied and updated microworlds/$file"
    else
        echo "✗ File not found: $source_file"
    fi
done

echo
echo "Migration complete!"
