#!/usr/bin/env bash

set -eu

parties=$(cat $TOKENIZATION_PARTIES_FILE)
factory=$(cat $1)
input=$(jq --slurp 'add' <(echo "$parties") <(echo "$factory"))
output_file=$(mktemp)

daml script \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Factory.Holding:createHoldingFactories \
  "${@:2}" <<< $(echo $input)

new_hfs_file=$(mktemp)
jq -n '{ holdingFactories: [ inputs.holdingFactories ] | add }' $TOKENIZATION_HOLDING_FACTORIES_FILE $output_file > $new_hfs_file
mv $new_hfs_file $TOKENIZATION_HOLDING_FACTORIES_FILE

rm $output_file
