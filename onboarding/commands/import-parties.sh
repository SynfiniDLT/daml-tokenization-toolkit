#!/usr/bin/env bash

set -eu

json_input_file=$(mktemp)
jq '. + {"partiesToImport": .parties} | del(.parties)' $1 > $json_input_file
input_json=$($TOKENIZATION_UTIL/add-json.sh $json_input_file $TOKENIZATION_PARTIES_FILE)
echo $input_json | $TOKENIZATION_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file $TOKENIZATION_PARTIES_FILE \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Party:importParties \
  "${@:2}"
rm $json_input_file
