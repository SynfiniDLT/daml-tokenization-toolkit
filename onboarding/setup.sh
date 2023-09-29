#!/usr/bin/env bash

set -e

export TOKENIZATION_INTERNAL=${TOKENIZATION_INTERNAL:-$(pwd)/.setup}
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
export TOKENIZATION_SETTLEMENT_FACTORIES_FILE=${TOKENIZATION_INTERNAL}/settlement-factories.json
if [ ! -f "${TOKENIZATION_SETTLEMENT_FACTORIES_FILE}" ]; then
  echo '{"settlementFactories": []}' > "${TOKENIZATION_SETTLEMENT_FACTORIES_FILE}"
fi

command=$1
shift

export TOKENIZATION_ONBOARDING_DAR=$(pwd)/../.build/tokenization-onboarding.dar
export TOKENIZATION_UTIL=$(pwd)/util

if [ "$command" = "upload-dar" ]; then
  daml ledger upload-dar $@ ${TOKENIZATION_ONBOARDING_DAR}
elif [ "$command" = "parties" ]; then
  ./commands/allocate-parties.sh $@
elif [ "$command" = "users" ]; then
  ./commands/create-users.sh $@
elif [ "$command" = "account-factories" ]; then
  ./commands/create-account-factories.sh $@
elif [ "$command" = "holding-factories" ]; then
  ./commands/create-holding-factories.sh $@
elif [ "$command" = "settlement-factories" ]; then
  ./commands/create-settlement-factories.sh $@
elif [ "$command" = "accounts-unilateral" ]; then
  ./commands/create-accounts-unilateral.sh $@
elif [ "$command" = "mint-unilateral" ]; then
  ./commands/create-mint-unilateral.sh $@
elif [ "$command" = "instruct-mint" ]; then
  ./commands/instruct-mint.sh $@
elif [ "$command" = "execute-mint" ]; then
  ./commands/execute-mint.sh $@
else
  echo "Unsupported command"
  exit 1
fi
