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
export TOKENIZATION_INSTRUMENT_FACTORIES_FILE=${TOKENIZATION_INTERNAL}/instrument-factories.json
if [ ! -f "${TOKENIZATION_INSTRUMENT_FACTORIES_FILE}" ]; then
  echo '{"instrumentFactories": []}' > "${TOKENIZATION_INSTRUMENT_FACTORIES_FILE}"
fi

command=$1
shift

export TOKENIZATION_ONBOARDING_DAR=$(pwd)/../.build/tokenization-onboarding.dar
export TOKENIZATION_UTIL=$(pwd)/util

set +u
LEDGER_PLAINTEXT=${LEDGER_PLAINTEXT:-false}
LEDGER_AUTH_ENABLED=${LEDGER_AUTH_ENABLED:-true}
set -u

host_port_args="--ledger-host ${LEDGER_HOST} --ledger-port ${LEDGER_PORT}"
tls_args=""
if [ "$LEDGER_PLAINTEXT" = "false" ]; then
  tls_args="--tls"
fi
auth_args=""
if [ "$LEDGER_AUTH_ENABLED" = "true" ]; then
  export TOKENIZATION_ACCESS_TOKEN_FILE="${TOKENIZATION_INTERNAL}/${ACCESS_TOKEN_CLIENT_ID}-token.txt"
  export TOKENIZATION_ACCESS_TOKEN_EXPIRY_FILE="${TOKENIZATION_INTERNAL}/${ACCESS_TOKEN_CLIENT_ID}-token-expiry.txt"
  ./jwt/fetch-access-token.sh
  auth_args="--access-token-file ${TOKENIZATION_ACCESS_TOKEN_FILE}"
fi
export TOKENIZATION_CONNECTION_ARGS="${host_port_args} ${tls_args} ${auth_args}"

if [ "$command" = "upload-dar" ]; then
  daml ledger upload-dar \
    --host ${LEDGER_HOST} \
    --port ${LEDGER_PORT} \
    ${tls_args} ${auth_args} $@ ${TOKENIZATION_ONBOARDING_DAR}
elif [ "$command" = "allocate-parties" ]; then
  ./commands/allocate-parties.sh $@
elif [ "$command" = "import-parties" ]; then
  ./commands/import-parties.sh $@
elif [ "$command" = "create-users" ]; then
  ./commands/create-users.sh $@
elif [ "$command" = "account-factories" ]; then
  ./commands/create-account-factories.sh $@
elif [ "$command" = "holding-factories" ]; then
  ./commands/create-holding-factories.sh $@
elif [ "$command" = "settlement-factories" ]; then
  ./commands/create-settlement-factories.sh $@
elif [ "$command" = "instrument-factories" ]; then
  ./commands/create-instrument-factories.sh $@
elif [ "$command" = "accounts-unilateral" ]; then
  ./commands/create-accounts-unilateral.sh $@
elif [ "$command" = "accounts-open-offer" ]; then
  ./commands/create-open-account-offer.sh $@
elif [ "$command" = "accounts-take-open-offer" ]; then
  ./commands/take-open-account-offer.sh $@
elif [ "$command" = "create-pbas-unilateral" ]; then
  ./commands/create-pbas-unilateral.sh $@
elif [ "$command" = "create-mint-unilateral" ]; then
  ./commands/create-mint-unilateral.sh $@
elif [ "$command" = "instruct-mint" ]; then
  ./commands/instruct-mint.sh $@
elif [ "$command" = "execute-mint" ]; then
  ./commands/execute-mint.sh $@
elif [ "$command" = "instruct-burn" ]; then
  ./commands/instruct-burn.sh $@
else
  echo "Unsupported command"
  exit 1
fi
