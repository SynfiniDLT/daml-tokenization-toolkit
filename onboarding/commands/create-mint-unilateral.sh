#!/usr/bin/env bash

set -eu

$TOKENIZATION_UTIL/add-json.sh $TOKENIZATION_PARTIES_FILE $TOKENIZATION_SETTLEMENT_FACTORIES_FILE $1 | daml script \
  --input-file /dev/stdin \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Mint.Unilateral:createMint \
  "${@:2}"
