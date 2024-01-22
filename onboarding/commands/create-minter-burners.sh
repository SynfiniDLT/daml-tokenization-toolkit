#!/usr/bin/env bash

set -eu

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $DOPS_MINTER_BURNER_FACTORIES_FILE $1 | \
  $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Onboarding.Scripts.Issuer:createMinterBurners \
  "${@:2}"
