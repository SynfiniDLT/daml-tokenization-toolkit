#!/usr/bin/env bash

set -eu

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $1 | \
  $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Onboarding.Fund.Delegation:createFundInvestors \
  "${@:2}"
