#!/usr/bin/env bash

set -eu

output_file=$(mktemp)

$TOKENIZATION_UTIL/add-json.sh $TOKENIZATION_PARTIES_FILE $1 | $TOKENIZATION_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Factory.Settlement:createSettlementFactories \
  "${@:2}"

new_sfs_file=$(mktemp)
jq -n '{ settlementFactories: [ inputs.settlementFactories ] | add }' $TOKENIZATION_SETTLEMENT_FACTORIES_FILE $output_file > $new_sfs_file
mv $new_sfs_file $TOKENIZATION_SETTLEMENT_FACTORIES_FILE

rm $output_file
