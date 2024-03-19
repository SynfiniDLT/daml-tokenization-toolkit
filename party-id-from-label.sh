#!/usr/bin/env bash

set -eu

party_label=$1
jq -r ".parties[] | select(.label == \"$party_label\") | .partyId" .dops/parties.json
