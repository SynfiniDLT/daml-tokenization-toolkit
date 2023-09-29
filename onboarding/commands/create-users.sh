#!/usr/bin/env bash

set -e

$TOKENIZATION_UTIL/add-json.sh $TOKENIZATION_PARTIES_FILE $1 | daml script \
  --input-file /dev/stdin \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.User:setupUsers \
  "${@:2}"
