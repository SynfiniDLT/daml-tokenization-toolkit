# Daml Models

## Overview

This folder contains a set of different Daml models used throughout this project. Each sub-folder contains the source code
of one or more Daml packages. Some of the packages have dependencies on one another. Please refer to each sub-folder for
further details on its contents.

## Build

The dependencies of the Daml packages are managed by the Makefile in the base of this repository. Running `daml`
directly without using `make` will not work as the required DAR files will not be up to date.

The Daml packages can be built using the `make` targets outlined in the README in each sub-folder (in particular, the
targets with the `.dar` suffix). For example, running

```
make .build/synfini-account-onboarding-one-time-offer.dar
```

from the base of this repository will generate the dar file `.build/synfini-account-onboarding-one-time-offer.dar` and
also its dependency `.build/synfini-account-onboarding-one-time-offer-interface.dar`.

The unit tests can be running use the `make` targets beginning with the `test-` suffix and ending with the name of the
sub-folder. For example, to test the models under the `account-onboarding` folder, run:

```
make test-account-onboarding
```
