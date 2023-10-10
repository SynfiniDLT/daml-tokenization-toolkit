#!/usr/bin/env bash

set -eu

$TOKENIZATION_UTIL/add-json.sh $TOKENIZATION_PARTIES_FILE $1 | \
  jq --arg referenceId $(uuidgen) '. * {"instructBurnSettings": {"referenceId": $referenceId}}' | \
  $TOKENIZATION_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Mint.Instruct:instructBurn \
  "${@:2}"
