# Instrument Metadata Daml Models

## Overview

This folder contains Daml models to support creation of on-ledger metadata associated with an instrument. This can be
used by an issuer attach arbitrary attributes (key-value pairs) to their instruments. Note that the metadata is stored
on a separate contract, rather than the instrument contract. This way, metadata can be attached to any sort of
instrument.

The model also allows an issuer to delegate the rights to disclose the metadata to other parties: for example, for a
Soul-bound token, the issuer can delegate this to the Soul-bound token owner. This allows the owner to share the
attributes of their unique token with other parties. The implementation also discloses the `Instrument` as a consequence
of disclosing of the `Metadata`. This approach was chosen because the `Metadata` is not meaningful without access to the
`Instrument`.

| Folder | Content | Dependency | Make target
| ------------- | ------------- | ------------- | ------------- |
| interface  | Metadata interfaces | Daml Finance | .build/synfini-instrument-metadata-interface.dar |
| implementation | Implementation of the metadata interfaces | Daml Finance, metadata interfaces | .build/synfini-instrument-metadata.dar |

No unit tests have been developed yet for this package as the model is still experimental.
