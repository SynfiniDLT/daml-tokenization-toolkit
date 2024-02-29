#!/usr/bin/env bash

set -eu

output_file=$(mktemp)

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Factory.Settlement:createSettlementOneTimeOfferFactories \
  "${@:2}"

new_sfs_file=$(mktemp)
jq -n '{ settlementOneTimeOfferFactories: [ inputs.settlementOneTimeOfferFactories ] | add }' \
  $DOPS_SETTLEMENT_ONE_TIME_OFFER_FACTORIES_FILE \
  $output_file > $new_sfs_file
mv $new_sfs_file $DOPS_SETTLEMENT_ONE_TIME_OFFER_FACTORIES_FILE

rm $output_file
