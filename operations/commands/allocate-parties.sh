#!/usr/bin/env bash

set -eu

output_file=$(mktemp)
$DOPS_UTIL/daml-script.sh \
  --input-file $1 \
  --output-file $output_file \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Party:allocateParties \
  "${@:2}"

new_parties_file=$(mktemp)
jq -n '{ parties: [ inputs.parties ] | add }' $DOPS_PARTIES_FILE $output_file > $new_parties_file
mv $new_parties_file $DOPS_PARTIES_FILE

rm $output_file