# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eu

input_file=$1
offerers=$2
offer_id=$3
batch_id=$4
quantity=$5
description=$6

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $input_file | \
  jq \
    --arg offerers $offerers \
    --arg offer_id $offer_id \
    --arg batch_id $batch_id \
    --arg quantity $quantity \
    --arg description $description \
    '. * {"takeOpenOfferSettings": {"offerers": [($offerers | split(","))[]], "offerId": $offer_id, "id": $batch_id, "quantity": $quantity, "description": $description}}' | \
  $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Settlement.OpenOffer:takeOpenOffer \
  "${@:7}"
