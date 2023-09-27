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
  --script-name Synfini.Onboarding.Factory.Account:createAccountFactories \
  "${@:2}" <<< $(echo $input)

new_afs_file=$(mktemp)
jq -n '{ accountFactories: [ inputs.accountFactories ] | add }' $TOKENIZATION_ACCOUNT_FACTORIES_FILE $output_file > $new_afs_file
mv $new_afs_file $TOKENIZATION_ACCOUNT_FACTORIES_FILE

rm $output_file
