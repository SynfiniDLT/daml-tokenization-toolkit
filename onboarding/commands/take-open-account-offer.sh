#!/usr/bin/env bash

set -eu

$DOPS_UTIL/add-json.sh \
  $DOPS_PARTIES_FILE \
  $DOPS_ACCOUNT_OPEN_OFFERS_FILE \
  $1 | \
  $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Onboarding.Scripts.Account.OpenOffer:openAccounts \
  "${@:2}"
