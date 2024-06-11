# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env bash

set -eu

input_file=$1
requestors=$2
batch_id=$3

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $input_file | \
  jq \
    --arg id $batch_id \
    --arg reqs $requestors \
    '. * {"acceptSettlementSettings": {"batchId": $id, "requestors": [($reqs | split(","))[]]}}' | \
  $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Settlement.Response:acceptSettlement \
  "${@:4}"
