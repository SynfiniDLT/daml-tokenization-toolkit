# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env bash

set -eu

$DOPS_UTIL/add-json.sh \
  $DOPS_PARTIES_FILE \
  $DOPS_SETTLEMENT_FACTORIES_FILE \
  $DOPS_ROUTE_PROVIDERS_FILE \
  $DOPS_SETTLEMENT_ONE_TIME_OFFER_FACTORIES_FILE \
  $1 | \
  $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Settlement.OneTimeOffer:createSettlementOneTimeOffers \
  "${@:2}"
