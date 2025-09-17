#!/bin/bash

# This script updates the snap subtree in the current repository.
# It assumes that the snap subtree is located in the 'snap' directory
# and that the remote for snap is 'snap', pointing to the Snap! repository.

set -e

# You may need to adjust the remote and branch as needed.
SNAP_REMOTE="snap"
SNAP_BRANCH="master"
SNAP_PREFIX="snap"

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo "Clean repo not detected. Please either commit or stash your change to pull the latest Snap! version"
    exit 1
else
    echo "Clean repo detected, proceeding with pulling the latest Snap! version"
fi

echo "Fetching latest changes from $SNAP_REMOTE/$SNAP_BRANCH..."
git fetch $SNAP_REMOTE $SNAP_BRANCH

echo "Pulling latest subtree for $SNAP_PREFIX from $SNAP_REMOTE/$SNAP_BRANCH..."
git subtree pull --prefix=$SNAP_PREFIX $SNAP_REMOTE $SNAP_BRANCH --squash

echo "Snap subtree updated successfully."
