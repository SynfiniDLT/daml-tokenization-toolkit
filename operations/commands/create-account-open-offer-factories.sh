#!/usr/bin/env bash

set -eu

output_file=$(mktemp)

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Factory.Account:createAccountOpenOfferFactories \
  "${@:2}"

new_afs_file=$(mktemp)
jq -n '{ accountOpenOfferFactories: [ inputs.accountOpenOfferFactories ] | add }' $DOPS_ACCOUNT_OPEN_OFFER_FACTORIES_FILE $output_file > $new_afs_file
mv $new_afs_file $DOPS_ACCOUNT_OPEN_OFFER_FACTORIES_FILE

rm $output_file
