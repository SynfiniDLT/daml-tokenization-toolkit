# Trackable Settlement Daml Model

## Overview

This folder contains a Daml model which overrides the default Daml Finance settlement implementation so that additional
parties can be added as observers onto the `Batch`es and `Instruction`s. These observers are referred to as
"trackers" because they remain observers of the `Batch` and `Instruction`s throughout the entire batch settlement
workflow. This is different to Daml Finance's `Disclosure` interface where observers can be added and removed freely by
the disclosure controllers. Example usecases may include exposing settlements to issuers or regulators. In such cases we
may not want to allow these parties to lose visibility of the settlements.

| Folder | Content | Dependency | Make target
| ------------- | ------------- | ------------- | ------------- |
| trackable-settlement | Custom implementations of Daml Finance settlement interfaces | Daml Finance | .build/synfini-trackable-settlement.dar |

No unit tests have been developed yet for this package.
