#!/usr/bin/env bash

set -eu

output_file=$(mktemp)
$TOKENIZATION_UTIL/add-json.sh \
  $TOKENIZATION_PARTIES_FILE \
  $1 | $TOKENIZATION_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file $output_file \
  --dar ${TOKENIZATION_ONBOARDING_DAR} \
  --script-name Synfini.Onboarding.Mint.OpenOffer:createOpenMintOffers \
  "${@:2}"

jq -n '{ mintOpenOffers: [ inputs.mintOpenOffers ] | add }' $TOKENIZATION_MINT_OPEN_OFFERS_FILE $output_file > $new_offers_file
mv $new_offers_file $TOKENIZATION_MINT_OPEN_OFFERS_FILE

rm $output_file
