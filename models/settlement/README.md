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
| test | Unit tests for the settlement Daml models | Daml Finance, the packages in this folder | test-settlement |

More units are still required and the `helpers` package is not tested yet.
