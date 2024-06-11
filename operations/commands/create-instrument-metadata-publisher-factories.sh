# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eu

output_file=$(mktemp)

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Factory.Instrument:createMetadataPublisherFactories \
  "${@:2}"

new_factories_file=$(mktemp)
jq -n '{ instrumentMetadataPublisherFactories: [ inputs.instrumentMetadataPublisherFactories ] | add }' $DOPS_INSTRUMENT_METADATA_PUBLISHER_FACTORIES_FILE $output_file > $new_factories_file
mv $new_factories_file $DOPS_INSTRUMENT_METADATA_PUBLISHER_FACTORIES_FILE

rm $output_file
