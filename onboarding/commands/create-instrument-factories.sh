#!/usr/bin/env bash

set -eu

output_file=$(mktemp)

$TOKENIZATION_UTIL/add-json.sh $TOKENIZATION_PARTIES_FILE $1 | daml script \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Factory.Instrument:createInstrumentFactories \
  "${@:2}"

new_ifs_file=$(mktemp)
jq -n '{ instrumentFactories: [ inputs.instrumentFactories ] | add }' $TOKENIZATION_INSTRUMENT_FACTORIES_FILE $output_file > $new_ifs_file
mv $new_ifs_file $TOKENIZATION_INSTRUMENT_FACTORIES_FILE

rm $output_file
