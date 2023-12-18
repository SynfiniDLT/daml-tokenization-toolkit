#!/usr/bin/env bash

set -eu

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $2 | \
  jq --arg referenceId $1 '. * {"executeBurnSettings": {"referenceId": $referenceId}}' | \
  $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Onboarding.Scripts.Mint.Instruct:executeBurn \
  "${@:3}"
