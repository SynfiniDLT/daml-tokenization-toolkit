#!/usr/bin/env bash

set -eu

parties=$(cat $TOKENIZATION_PARTIES_FILE)
settlement_factories=$(cat $TOKENIZATION_SETTLEMENT_FACTORIES_FILE)
mint=$(cat $1)
input=$(jq --slurp 'add' <(echo "$parties") <(echo "$settlement_factories") <(echo "$mint"))

daml script \
  --input-file /dev/stdin \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Mint.Unilateral:createMint \
  "${@:2}" <<< $(echo $input)
