#!/usr/bin/env bash

set -eu

output_file=$(mktemp)

$TOKENIZATION_UTIL/add-json.sh $TOKENIZATION_PARTIES_FILE $1 | daml script \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Factory.Holding:createHoldingFactories \
  "${@:2}"

new_hfs_file=$(mktemp)
jq -n '{ holdingFactories: [ inputs.holdingFactories ] | add }' $TOKENIZATION_HOLDING_FACTORIES_FILE $output_file > $new_hfs_file
mv $new_hfs_file $TOKENIZATION_HOLDING_FACTORIES_FILE

rm $output_file
