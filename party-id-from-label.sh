# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eu

party_label=$1
jq -r ".parties[] | select(.label == \"$party_label\") | .partyId" .dops/parties.json
