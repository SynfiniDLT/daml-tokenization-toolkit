#!/usr/bin/env bash

set -eu

export REACT_APP_PARTIES_WALLET_OPERATOR=$(./party-id-from-label.sh WalletOperator)
export REACT_APP_PARTIES_PUBLIC=$(./party-id-from-label.sh SynfiniPublic)
export REACT_APP_PARTIES_SBT_INSTRUMENT_DEPOSITORY=$(./party-id-from-label.sh SbtDepository)
export REACT_APP_PARTIES_SBT_INSTRUMENT_ISSUER=$(./party-id-from-label.sh SbtIssuer)
export REACT_APP_PARTIES_ENVIRONMENTAL_TOKEN_DEPOSITORY=$(./party-id-from-label.sh EnvironmentalTokenDepository)
make start-wallet-ui
