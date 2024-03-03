#!/usr/bin/env bash

set -eu

json_input_file=$(mktemp)
jq '. + {"partiesToImport": .parties} | del(.parties)' $1 > $json_input_file
input_json=$($DOPS_UTIL/add-json.sh $json_input_file $DOPS_PARTIES_FILE)
echo $input_json | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file $DOPS_PARTIES_FILE \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Party:importParties \
  "${@:2}"
rm $json_input_file
