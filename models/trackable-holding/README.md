# Trackable Holding Daml Model

## Overview

This folder contains Daml model which override the default implementation of `Holding` so that additional parties can
be added as observers onto the `Holding`s. These observers are referred to as "trackers" because they remain observers
even if a `Holding` undergoes a consuming choice which creates a new `Holding` (e.g. the `Transfer` choice on the
`Transferable` interface). This is different to Daml Finance's `Disclosure` interface where observers can be added and
removed freely by the disclosure controllers. Example usecases may include exposing `Holding`s to issuers or regulators.
In such cases we may not want to allow these parties to lose visibility of the `Holding`s.

| Folder | Content | Dependency | Make target
| ------------- | ------------- | ------------- | ------------- |
| trackable-holding | Custom implementations of Daml Finance `Holding` interfaces | Daml Finance | .build/synfini-trackable-holding.dar |

No unit tests have been developed yet for this package.
