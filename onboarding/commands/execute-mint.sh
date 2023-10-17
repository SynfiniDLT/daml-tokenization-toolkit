#!/usr/bin/env bash

set -eu

$TOKENIZATION_UTIL/add-json.sh $TOKENIZATION_PARTIES_FILE $1 $2 | $TOKENIZATION_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Mint.Instruct:executeMint \
  "${@:3}"
