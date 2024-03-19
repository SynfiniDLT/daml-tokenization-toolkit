# Issuer Daml Models

## Overview

This folder contains a set of Daml models to enable Daml Finance issuers to perform the following tasks:

- Create and remove instruments at a depository.
- Create and remove `Holding`s of their instruments under a custodian.

| Folder  | Content | Dependency | Make target
| ------------- | ------------- | ------------- | ------------- |
| instrument-token-interface  | Interfaces to allow an issuer to create `Token` instruments | Daml Finance | .build/synfini-issuer-onboarding-instrument-token-interface.dar
| instrument-token-implementation  | Implementation of the `Token` instrument creation interfaces | Daml Finance, token instrument interfaces | .build/synfini-issuer-onboarding-instrument-token.dar |
| minter-burner-interface  | Interfaces for issuers to create/archive `Holding`s of their instruments | Daml Finance | .build/synfini-issuer-onboarding-minter-burner-interface.dar |
| minter-burner-implementation  | Implementation of the minter-burner interfaces | Daml Finance, minter-burner interfaces | .build/synfini-issuer-onboarding-minter-burner.dar |
| test | Unit tests for all issuer Daml models | Daml Finance, the packages in this folder | test-issuer-onboarding |
