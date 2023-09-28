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
  --script-name Synfini.Onboarding.Factory.Settlement:createSettlementFactories \
  "${@:2}" <<< $(echo $input)

new_sfs_file=$(mktemp)
jq -n '{ settlementFactories: [ inputs.settlementFactories ] | add }' $TOKENIZATION_SETTLEMENT_FACTORIES_FILE $output_file > $new_sfs_file
mv $new_sfs_file $TOKENIZATION_SETTLEMENT_FACTORIES_FILE

rm $output_file
