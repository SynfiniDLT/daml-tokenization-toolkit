#!/usr/bin/env bash

set -eu

output_file=$(mktemp)
$DOPS_UTIL/add-json.sh \
  $DOPS_PARTIES_FILE \
  $DOPS_ISSUER_FACTORIES_FILE \
  $DOPS_INSTRUMENT_FACTORIES_FILE \
  $DOPS_INSTRUMENT_METADATA_PUBLISHER_FACTORIES_FILE \
  $DOPS_INSTRUMENT_METADATA_FACTORIES_FILE \
  $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file $output_file \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Issuer:createIssuers \
  "${@:2}"

new_issuers_file=$(mktemp)
jq -n '{ issuers: [ inputs.issuers ] | add }' $DOPS_ISSUERS_FILE $output_file > $new_issuers_file
mv $new_issuers_file $DOPS_ISSUERS_FILE

new_publishers_file=$(mktemp)
jq \
  -n '{ instrumentMetadataPublishers: [ inputs.instrumentMetadataPublishers ] | add }' \
  $DOPS_INSTRUMENT_METADATA_PUBLISHERS_FILE \
  $output_file > $new_publishers_file
mv $new_publishers_file $DOPS_INSTRUMENT_METADATA_PUBLISHERS_FILE

rm $output_file
