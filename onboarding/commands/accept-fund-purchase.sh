#!/usr/bin/env bash

set -eu

$TOKENIZATION_UTIL/add-json.sh $TOKENIZATION_PARTIES_FILE $2 | \
  jq --arg investmentId $1 '. * {"acceptPurchaseSettings": {"investmentId": $investmentId}}' | \
  $TOKENIZATION_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Fund.Purchase:acceptFundPurchase \
  "${@:3}"
