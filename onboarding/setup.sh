#!/usr/bin/env bash

set -e

export TOKENIZATION_INTERNAL=${TOKENIZATION_INTERNAL:-.setup}
if [ ! -d "${TOKENIZATION_INTERNAL}" ]; then
  mkdir $TOKENIZATION_INTERNAL
fi
set -u
export TOKENIZATION_PARTIES_FILE=${TOKENIZATION_INTERNAL}/parties.json
if [ ! -f "${TOKENIZATION_PARTIES_FILE}" ]; then
  echo '{"parties": []}' > "${TOKENIZATION_PARTIES_FILE}"
fi
export TOKENIZATION_ACCOUNT_FACTORIES_FILE=${TOKENIZATION_INTERNAL}/account-factories.json
if [ ! -f "${TOKENIZATION_ACCOUNT_FACTORIES_FILE}" ]; then
  echo '{"accountFactories": []}' > "${TOKENIZATION_ACCOUNT_FACTORIES_FILE}"
fi
export TOKENIZATION_HOLDING_FACTORIES_FILE=${TOKENIZATION_INTERNAL}/holding-factories.json
if [ ! -f "${TOKENIZATION_HOLDING_FACTORIES_FILE}" ]; then
  echo '{"holdingFactories": []}' > "${TOKENIZATION_HOLDING_FACTORIES_FILE}"
fi

command=$1
shift

export TOKENIZATION_ONBOARDING_DAR=../.build/tokenization-onboarding.dar

if [ "$command" = "parties" ]; then
  ./allocate-parties.sh $@
elif [ "$command" = "users" ]; then
  ./create-users.sh $@
elif [ "$command" = "account-factories" ]; then
  ./create-account-factories.sh $@
elif [ "$command" = "holding-factories" ]; then
  ./create-holding-factories.sh $@
elif [ "$command" = "accounts-unilateral" ]; then
  ./create-accounts-unilateral.sh $@
else
  echo "Unsupported command"
  exit 1
fi
