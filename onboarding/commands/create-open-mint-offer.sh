#!/usr/bin/env bash

set -eu

output_file=$(mktemp)
$DOPS_UTIL/add-json.sh \
  $DOPS_PARTIES_FILE \
  $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file $output_file \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Onboarding.Mint.OpenOffer:createOpenMintOffers \
  "${@:2}"

new_offers_file=$(mktemp)
jq -n '{ mintOpenOffers: [ inputs.mintOpenOffers ] | add }' $DOPS_MINT_OPEN_OFFERS_FILE $output_file > $new_offers_file
mv $new_offers_file $DOPS_MINT_OPEN_OFFERS_FILE

rm $output_file