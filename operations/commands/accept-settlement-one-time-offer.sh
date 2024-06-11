# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eu

input_file=$1
offerers=$2
offer_id=$3
quantity=$4
reference=$5

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $input_file | \
  jq \
    --arg offerers $offerers \
    --arg offer_id $offer_id \
    --arg quantity $quantity \
    --arg reference $reference \
    '. * {"acceptOneTimeOfferSettings": {"offerers": [($offerers | split(","))[]], "offerId": $offer_id, "quantity": $quantity, "reference": $reference}}' | \
  $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Settlement.OneTimeOffer:acceptOneTimeOffer \
  "${@:6}"
