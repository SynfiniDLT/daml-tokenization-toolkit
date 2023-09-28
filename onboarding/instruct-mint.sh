#!/usr/bin/env bash

set -eu

parties=$(cat $TOKENIZATION_PARTIES_FILE)
instruction=$(cat $1)
input=$(jq --slurp 'add' <(echo "$parties") <(echo "$instruction"))

daml script \
  --input-file /dev/stdin \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Mint.Instruct:instructMint \
  "${@:2}" <<< $(echo $input)
