# Utility Daml Packages

## Overview

This folder contains any utilities that are used in other Daml packages.

| Folder | Content | Dependency | Make target
| ------------- | ------------- | ------------- | ------------- |
| assert | Custom assertion functions | Daml standard library | .build/synfini-assert.dar |

## Build

The dependencies of the Daml packages are managed by the Makefile in the base of this repository. Running `daml`
directly without using `make` will not work as the required DAR files will not be up to date.

To build, run:

```
make .build/synfini-assert.dar
```

from the base of this repository and this will generate the dar file `.build/synfini-assert.dar`

No unit tests have been developed yet for this package.
