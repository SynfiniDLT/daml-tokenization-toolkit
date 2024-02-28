#!/usr/bin/env bash

set -eu

output_file=$(mktemp)

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Factory.Instrument:createIssuerFactories \
  "${@:2}"

new_ifs_file=$(mktemp)
jq -n '{ issuerFactories: [ inputs.issuerFactories ] | add }' $DOPS_ISSUER_FACTORIES_FILE $output_file > $new_ifs_file
mv $new_ifs_file $DOPS_ISSUER_FACTORIES_FILE

rm $output_file
