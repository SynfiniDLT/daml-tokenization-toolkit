#!/usr/bin/env bash

set -e

PARTIES_FILE=${PARTIES_FILE:-.parties.json}
set -u
if [ ! -f "${PARTIES_FILE}" ]; then
  echo "Parties file does not exist:" $PARTIES_FILE
  exit 1
fi

parties=$(cat $PARTIES_FILE)
users=$(cat $1)
input=$(jq --slurp 'add' <(echo "$parties") <(echo "$users"))

daml script \
  --input-file /dev/stdin \
  --dar .build/synfini-onboarding.dar \
  --script-name Synfini.Onboarding.User:setupUsers \
  "${@:2}" <<< $(echo $input)
