#!/usr/bin/env bash

set -eu

output_file=$(mktemp)

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Onboarding.Factory.Holding:createHoldingFactories \
  "${@:2}"

new_hfs_file=$(mktemp)
jq -n '{ holdingFactories: [ inputs.holdingFactories ] | add }' $DOPS_HOLDING_FACTORIES_FILE $output_file > $new_hfs_file
mv $new_hfs_file $DOPS_HOLDING_FACTORIES_FILE

rm $output_file
