# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env bash

set -eu

export REACT_APP_PARTIES_WALLET_OPERATOR=$(./party-id-from-label.sh WalletOperator)
export REACT_APP_PARTIES_PUBLIC=$(./party-id-from-label.sh SynfiniPublic)
export REACT_APP_PARTIES_SBT_CUSTODIAN=$(./party-id-from-label.sh SynfiniValidator)
export REACT_APP_PARTIES_SBT_INSTRUMENT_DEPOSITORY=$(./party-id-from-label.sh SbtDepository)
export REACT_APP_PARTIES_SBT_INSTRUMENT_ISSUER=$(./party-id-from-label.sh SbtIssuer)
export REACT_APP_SETTLEMENT_FACTORY_CID=$(
  jq -r ".settlementFactories[] | select(.label == \"V1\") | .cid" .dops/settlement-factories.json
)
export REACT_APP_ROUTE_PROVIDER_CID=$(
  jq -r ".routeProviders[] | select(.label == \"validatorCustodianV1\") | .cid" .dops/route-providers.json
)
make start-wallet-ui
