#!/usr/bin/env bash

set -e

parties=$(cat $TOKENIZATION_PARTIES_FILE)
users=$(cat $1)
input=$(jq --slurp 'add' <(echo "$parties") <(echo "$users"))

daml script \
  --input-file /dev/stdin \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.User:setupUsers \
  "${@:2}" <<< $(echo $input)
