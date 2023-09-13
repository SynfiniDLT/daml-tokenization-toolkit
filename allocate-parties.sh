#!/usr/bin/env bash

set -e

PARTIES_FILE=${PARTIES_FILE:-.parties.json}
set -u
if [ ! -f "${PARTIES_FILE}" ]; then
  echo '{"parties": []}' > "${PARTIES_FILE}"
fi

output_file=$(mktemp)
daml script \
  --input-file $1 \
  --output-file $output_file \
  --dar .build/synfini-onboarding.dar \
  --script-name Synfini.Onboarding.Party:allocateParties \
  "${@:2}"

new_parties_file=$(mktemp)
jq -n '{ parties: [ inputs.parties ] | add }' $PARTIES_FILE $output_file > $new_parties_file
mv $new_parties_file $PARTIES_FILE

rm $output_file
