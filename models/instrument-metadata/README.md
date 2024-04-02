# Party-bound Token Daml Models

## Overview

This folder contains Daml models to support creationg of party-bound token. These are Daml Finance `Holding`s which are
non-transferable, and have a unique `Instrument` for each holder. The `Instrument` is a customized implementation of the
base `Instrument` interface in Daml Finance. It can, for example, be used to store attributes belonging to the party,
such as their organisation name, address etc.

| Folder | Content | Dependency | Make target
| ------------- | ------------- | ------------- | ------------- |
| interface  | Party-bound token interfaces | Daml Finance | .build/synfini-pbt-interface.dar |
| implementation | Implementation of party-bound token interfaces | Daml Finance, one-time offer interfaces | .build/synfini-pbt.dar |

No unit tests have been developed yet for this package as the model is still experimental.
