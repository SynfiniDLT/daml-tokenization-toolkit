# Account Setup Daml Models

## Overview

This folder contains a set of Daml models to enable Daml Finance `Account` contracts to be setup using propose-accept
workflows. It contains the below folders, each of which is a single Daml package.

| Folder  | Content | Dependency | Make target
| ------------- | ------------- | ------------- | ------------- |
| one-time-offer-interface  | Interfaces for workflows that use a single-use only propsoal | Daml Finance | .build/synfini-account-onboarding-one-time-offer-interface.dar
| one-time-offer-implementation  | Implementation of the one-time offer interfaces | Daml Finance, one-time offer interfaces | .build/synfini-account-onboarding-one-time-offer.dar |
| open-offer-interface  | Interfaces for workflows that use a propsoal which can be re-used | Daml Finance | .build/synfini-account-onboarding-open-offer-interface.dar |
| open-offer-implementation  | Implementation of the open-offer interfaces | Daml Finance, open-offer interfaces | .build/synfini-account-onboarding-open-offer.dar |
| test  | Unit tests for all of the account setup workflows | Daml Finance, all open and one-time offer packages | test-account-onboarding |

## Build

The dependencies of the Daml packages are managed by the Makefile in the base of this repository. Running `daml`
directly without using `make` will not work as the required DAR files will not be up to date.

The Daml packages can be built using the above `make` targets (those with the `.dar` suffix). For example, running

```
make .build/synfini-account-onboarding-one-time-offer.dar
```

from the base of this repository will generate the dar file `.build/synfini-account-onboarding-one-time-offer.dar` and
also its dependency `.build/synfini-account-onboarding-one-time-offer-interface.dar`.

All the unit tests can be running using:

```
make test-account-onboarding
```
