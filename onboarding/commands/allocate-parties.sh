#!/usr/bin/env bash

set -eu

output_file=$(mktemp)
daml script \
  --input-file $1 \
  --output-file $output_file \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Party:allocateParties \
  "${@:2}"

new_parties_file=$(mktemp)
jq -n '{ parties: [ inputs.parties ] | add }' $TOKENIZATION_PARTIES_FILE $output_file > $new_parties_file
mv $new_parties_file $TOKENIZATION_PARTIES_FILE

rm $output_file
