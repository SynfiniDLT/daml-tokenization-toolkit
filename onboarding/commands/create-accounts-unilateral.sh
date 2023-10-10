#!/usr/bin/env bash

set -eu

$TOKENIZATION_UTIL/add-json.sh \
  $TOKENIZATION_PARTIES_FILE \
  $TOKENIZATION_ACCOUNT_FACTORIES_FILE \
  $TOKENIZATION_HOLDING_FACTORIES_FILE \
  $1 | \
  $TOKENIZATION_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Account.Unilateral:createAccounts \
  "${@:2}"
