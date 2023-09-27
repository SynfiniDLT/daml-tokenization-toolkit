#!/usr/bin/env bash

set -eu

parties=$(cat $TOKENIZATION_PARTIES_FILE)
account_factories=$(cat $TOKENIZATION_ACCOUNT_FACTORIES_FILE)
holding_factories=$(cat $TOKENIZATION_HOLDING_FACTORIES_FILE)
accounts=$(cat $1)
input=$(jq --slurp 'add' <(echo "$parties") <(echo "$account_factories") <(echo "$holding_factories") <(echo "$accounts"))

daml script \
  --input-file /dev/stdin \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Account.Unilateral:createAccounts \
  "${@:2}" <<< $(echo $input)
