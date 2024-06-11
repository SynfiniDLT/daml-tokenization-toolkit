#!/usr/bin/env bash

# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eu

output_file=$(mktemp)

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.RouteProvider:createRouteProviders \
  "${@:2}"

new_rps_file=$(mktemp)
jq -n '{ routeProviders: [ inputs.routeProviders ] | add }' $DOPS_ROUTE_PROVIDERS_FILE $output_file > $new_rps_file
mv $new_rps_file $DOPS_ROUTE_PROVIDERS_FILE

rm $output_file
