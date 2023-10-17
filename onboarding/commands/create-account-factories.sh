#!/usr/bin/env bash

set -eu

output_file=$(mktemp)

$TOKENIZATION_UTIL/add-json.sh $TOKENIZATION_PARTIES_FILE $1 | $TOKENIZATION_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Factory.Account:createAccountFactories \
  "${@:2}"

new_afs_file=$(mktemp)
jq -n '{ accountFactories: [ inputs.accountFactories ] | add }' $TOKENIZATION_ACCOUNT_FACTORIES_FILE $output_file > $new_afs_file
mv $new_afs_file $TOKENIZATION_ACCOUNT_FACTORIES_FILE

rm $output_file
