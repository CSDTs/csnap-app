#!/bin/bash

# This script updates the snap subtree in the current repository.
# It assumes that the snap subtree is located in the 'snap' directory
# and that the remote for snap is 'snap', pointing to the Snap! repository.
# Usage: ./update-csnap.sh [tag_or_branch]

set -e

# You may need to adjust the remote and branch as needed.
SNAP_REMOTE="snap"
SNAP_REF="${1:-master}"  # Use first argument or default to master
SNAP_PREFIX="snap"

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo "Clean repo not detected. Please either commit or stash your change to pull the latest Snap! version"
    exit 1
else
    echo "Clean repo detected, proceeding with pulling Snap! version: $SNAP_REF"
fi

echo "Fetching latest changes from $SNAP_REMOTE..."
git fetch $SNAP_REMOTE

echo "Pulling subtree for $SNAP_PREFIX from $SNAP_REMOTE/$SNAP_REF..."
git subtree pull --prefix=$SNAP_PREFIX $SNAP_REMOTE $SNAP_REF --squash

echo "Snap subtree updated successfully to $SNAP_REF."
