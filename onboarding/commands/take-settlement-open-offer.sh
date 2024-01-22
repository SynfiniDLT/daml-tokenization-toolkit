#!/usr/bin/env bash

set -eu

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $1 | \
  jq --arg id $2 '. * {"takeOpenOfferSettings": {"id": $id}}' | \
  $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Onboarding.Scripts.Settlement.OpenOffer:takeOpenOffer \
  "${@:3}"
