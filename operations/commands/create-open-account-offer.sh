# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env bash

set -eu

output_file=$(mktemp)
$DOPS_UTIL/add-json.sh \
  $DOPS_PARTIES_FILE \
  $DOPS_ACCOUNT_FACTORIES_FILE \
  $DOPS_ACCOUNT_OPEN_OFFER_FACTORIES_FILE \
  $DOPS_HOLDING_FACTORIES_FILE \
  $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file $output_file \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Account.OpenOffer:createOpenAccountOffer \
  "${@:2}"

new_offers_file=$(mktemp)
jq -n '{ accountOpenOffers: [ inputs.accountOpenOffers ] | add }' $DOPS_ACCOUNT_OPEN_OFFERS_FILE $output_file > $new_offers_file
mv $new_offers_file $DOPS_ACCOUNT_OPEN_OFFERS_FILE

rm $output_file
