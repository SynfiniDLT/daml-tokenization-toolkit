#!/usr/bin/env bash

# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eu

output_file=$(mktemp)

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Factory.Instrument:createInstrumentFactories \
  "${@:2}"

new_ifs_file=$(mktemp)
jq -n '{ instrumentFactories: [ inputs.instrumentFactories ] | add }' $DOPS_INSTRUMENT_FACTORIES_FILE $output_file > $new_ifs_file
mv $new_ifs_file $DOPS_INSTRUMENT_FACTORIES_FILE

rm $output_file
