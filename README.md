# CSnap 11.0.0

Last updated: 2025-10-13

## Overview

CSnap: Bringing Culture and Social Justice to Programming

CSnap is a fork of Snap! 11.0.0. It is a visual, blocks based programming language inspired by Scratch. It is designed to be used in the classroom and in the community.

## Upgrading Snap! versions

Since this is a fork of Snap, we made it easy to upgrade to the latest Snap! version.

1. Make sure any existing changes are committed or stashed.
2. Run the `utilities/update-csnap.sh` script. This will update the snap subtree to the latest Snap! version.
3. From here, we need to do a bit of manual work to update the libraries. You need to copy over the libraries from the snap subtree to the libraries folder. (Make sure not to overwrite any existing libraries like beetle, csdt, and ai)
4. We override existing methods in `cnap/`. Sometimes, the functionality for some methods may change, making our changes obsolete. You need to check the changes in the snap subtree and update the methods in `cnap/`, making sure to preserve our customizations.
5. Make sure that `sw.js`and `index.html` are also updated.

## Adding new libraries

Libraries are more complicated than just new blocks. To create a new library, take a look at `libraries/beetle` for an example as well as how it gets initialized in `libraries/beetle.xml`. Also, make sure to add the library to `libraries/LIBRARIES.json`.
