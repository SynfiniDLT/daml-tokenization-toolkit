# Settlement Daml Models

## Overview

This folder contains Daml models which build upon the existing settlement interfaces in Daml Finance. They are designed
to faciliate common workflows for requesting and responding to settlement instructions.

| Folder | Content | Dependency | Make target
| ------------- | ------------- | ------------- | ------------- |
| one-time-offer-interface | Interfaces to enable creation of one-time only offers for settlement instruction | Daml Finance | .build/synfini-settlement-one-time-offer-interface.dar |
| one-time-offer-implementation | Implementation of the one-time offer interfaces | Daml Finance, one-time offer interfaces | .build/synfini-settlement-one-time-offer.dar |
| open-offer-interface | Interfaces to enable creation of open-ended offers for settlement instruction | Daml Finance | .build/synfini-settlement-open-offer-interface.dar |
| open-offer-implementation | Implementation of the open-offer interfaces | Daml Finance, open-time offer interfaces | .build/synfini-settlement-open-offer.dar |
| helpers | Helper contracts to respond to settlement instructions | Daml Finance, minter/burner interface from `issuer-onboarding` | .build/synfini-settlement-helpers.dar |

## Build

The dependencies of the Daml packages are managed by the Makefile in the base of this repository. Running `daml`
directly without using `make` will not work as the required DAR files will not be up to date.

The Daml packages can be built using the above `make` targets (those with the `.dar` suffix). For example, running

```
make .build/synfini-settlement-one-time-offer.dar
```

from the base of this repository will generate the dar file `.build/synfini-settlement-one-time-offer.dar` and also its
dependency `.build/synfini-settlement-one-time-offer-interface.dar`.

All the unit tests can be running using:

```
make test-settlement
```

More units are required and the `helpers` package is not tested yet.
