#!/usr/bin/env bash

set -eu

output_file=$(mktemp)

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Onboarding.Scripts.Factory.MinterBurner:createMinterBurnerFactories \
  "${@:2}"

new_factories_file=$(mktemp)
jq -n '{ minterBurnerFactories: [ inputs.minterBurnerFactories ] | add }' $DOPS_MINTER_BURNER_FACTORIES_FILE $output_file > $new_factories_file
mv $new_factories_file $DOPS_MINTER_BURNER_FACTORIES_FILE

rm $output_file
