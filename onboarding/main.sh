#!/usr/bin/env bash

set -e

export DOPS_INTERNAL=${DOPS_INTERNAL:-$(pwd)/.dops}
if [ ! -d "${DOPS_INTERNAL}" ]; then
  mkdir $DOPS_INTERNAL
fi
set -u
export DOPS_PARTIES_FILE=${DOPS_INTERNAL}/parties.json
if [ ! -f "${DOPS_PARTIES_FILE}" ]; then
  echo '{"parties": []}' > "${DOPS_PARTIES_FILE}"
fi
export DOPS_ACCOUNT_FACTORIES_FILE=${DOPS_INTERNAL}/account-factories.json
if [ ! -f "${DOPS_ACCOUNT_FACTORIES_FILE}" ]; then
  echo '{"accountFactories": []}' > "${DOPS_ACCOUNT_FACTORIES_FILE}"
fi
export DOPS_ACCOUNT_OPEN_OFFER_FACTORIES_FILE=${DOPS_INTERNAL}/account-open-offer-factories.json
if [ ! -f "${DOPS_ACCOUNT_OPEN_OFFER_FACTORIES_FILE}" ]; then
  echo '{"accountOpenOfferFactories": []}' > "${DOPS_ACCOUNT_OPEN_OFFER_FACTORIES_FILE}"
fi
export DOPS_HOLDING_FACTORIES_FILE=${DOPS_INTERNAL}/holding-factories.json
if [ ! -f "${DOPS_HOLDING_FACTORIES_FILE}" ]; then
  echo '{"holdingFactories": []}' > "${DOPS_HOLDING_FACTORIES_FILE}"
fi
export DOPS_SETTLEMENT_FACTORIES_FILE=${DOPS_INTERNAL}/settlement-factories.json
if [ ! -f "${DOPS_SETTLEMENT_FACTORIES_FILE}" ]; then
  echo '{"settlementFactories": []}' > "${DOPS_SETTLEMENT_FACTORIES_FILE}"
fi
export DOPS_SETTLEMENT_ONE_TIME_OFFER_FACTORIES_FILE=${DOPS_INTERNAL}/settlement-one-time-offer-factories.json
if [ ! -f "${DOPS_SETTLEMENT_ONE_TIME_OFFER_FACTORIES_FILE}" ]; then
  echo '{"settlementOneTimeOfferFactories": []}' > "${DOPS_SETTLEMENT_ONE_TIME_OFFER_FACTORIES_FILE}"
fi
export DOPS_SETTLEMENT_OPEN_OFFER_FACTORIES_FILE=${DOPS_INTERNAL}/settlement-open-offer-factories.json
if [ ! -f "${DOPS_SETTLEMENT_OPEN_OFFER_FACTORIES_FILE}" ]; then
  echo '{"settlementOpenOfferFactories": []}' > "${DOPS_SETTLEMENT_OPEN_OFFER_FACTORIES_FILE}"
fi
export DOPS_INSTRUMENT_FACTORIES_FILE=${DOPS_INTERNAL}/instrument-factories.json
if [ ! -f "${DOPS_INSTRUMENT_FACTORIES_FILE}" ]; then
  echo '{"instrumentFactories": []}' > "${DOPS_INSTRUMENT_FACTORIES_FILE}"
fi
export DOPS_ISSUER_FACTORIES_FILE=${DOPS_INTERNAL}/issuer-factories.json
if [ ! -f "${DOPS_ISSUER_FACTORIES_FILE}" ]; then
  echo '{"issuerFactories": []}' > "${DOPS_ISSUER_FACTORIES_FILE}"
fi
export DOPS_MINTER_BURNER_FACTORIES_FILE=${DOPS_INTERNAL}/minter-burner-factories.json
if [ ! -f "${DOPS_MINTER_BURNER_FACTORIES_FILE}" ]; then
  echo '{"minterBurnerFactories": []}' > "${DOPS_MINTER_BURNER_FACTORIES_FILE}"
fi
export DOPS_ROUTE_PROVIDERS_FILE=${DOPS_INTERNAL}/route-providers.json
if [ ! -f "${DOPS_ROUTE_PROVIDERS_FILE}" ]; then
  echo '{"routeProviders": []}' > "${DOPS_ROUTE_PROVIDERS_FILE}"
fi
export DOPS_ACCOUNT_OPEN_OFFERS_FILE=${DOPS_INTERNAL}/account-open-offers.json
if [ ! -f "${DOPS_ACCOUNT_OPEN_OFFERS_FILE}" ]; then
  echo '{"accountOpenOffers": []}' > "${DOPS_ACCOUNT_OPEN_OFFERS_FILE}"
fi
export DOPS_FUND_ISSUER_OPEN_OFFERS_FILE=${DOPS_INTERNAL}/fund-issuer-open-offers.json
if [ ! -f "${DOPS_FUND_ISSUER_OPEN_OFFERS_FILE}" ]; then
  echo '{"fundIssuerOpenOffers": []}' > "${DOPS_FUND_ISSUER_OPEN_OFFERS_FILE}"
fi

if [ -z ${1+x} ]; then
  echo "Please provide command"
  exit 1
fi
command=$1
shift

export DOPS_DAR=${DOPS_HOME}/dops.dar 
export DOPS_UTIL=${DOPS_HOME}/scripts/util
dops_commands=${DOPS_HOME}/scripts/commands

set +u
LEDGER_PLAINTEXT=${LEDGER_PLAINTEXT:-false}
LEDGER_AUTH_ENABLED=${LEDGER_AUTH_ENABLED:-true}
LEDGER_USE_JSON_API=${LEDGER_USE_JSON_API:-false}
set -u

host_port_args="--ledger-host ${LEDGER_HOST} --ledger-port ${LEDGER_PORT}"
tls_args=""
if [ "$LEDGER_PLAINTEXT" = "false" ]; then
  tls_args="--tls"
fi
auth_args=""
if [ "$LEDGER_AUTH_ENABLED" = "true" ]; then
  export DOPS_ACCESS_TOKEN_FILE="${DOPS_INTERNAL}/${ACCESS_TOKEN_CLIENT_ID}-token.txt"
  export DOPS_ACCESS_TOKEN_EXPIRY_FILE="${DOPS_INTERNAL}/${ACCESS_TOKEN_CLIENT_ID}-token-expiry.txt"
  ${DOPS_UTIL}/fetch-access-token.sh
  auth_args="--access-token-file ${DOPS_ACCESS_TOKEN_FILE}"
fi
json_api_args=""
if [ "$LEDGER_USE_JSON_API" = "true" ]; then
  json_api_args="--json-api"
fi
export DOPS_CONNECTION_ARGS="${host_port_args} ${tls_args} ${auth_args} ${json_api_args}"

if [ "$command" = "upload-dar" ]; then
  daml ledger upload-dar \
    --host ${LEDGER_HOST} \
    --port ${LEDGER_PORT} \
    ${tls_args} ${auth_args} ${json_api_args} $@ ${DOPS_DAR}
elif [ "$command" = "allocate-parties" ]; then
  ${dops_commands}/allocate-parties.sh $@
elif [ "$command" = "import-parties" ]; then
  ${dops_commands}/import-parties.sh $@
elif [ "$command" = "create-users" ]; then
  ${dops_commands}/create-users.sh $@
elif [ "$command" = "create-account-factories" ]; then
  ${dops_commands}/create-account-factories.sh $@
elif [ "$command" = "create-account-open-offer-factories" ]; then
  ${dops_commands}/create-account-open-offer-factories.sh $@
elif [ "$command" = "create-holding-factories" ]; then
  ${dops_commands}/create-holding-factories.sh $@
elif [ "$command" = "create-settlement-factories" ]; then
  ${dops_commands}/create-settlement-factories.sh $@
elif [ "$command" = "create-settlement-one-time-offer-factories" ]; then
  ${dops_commands}/create-settlement-one-time-offer-factories.sh $@
elif [ "$command" = "create-settlement-open-offer-factories" ]; then
  ${dops_commands}/create-settlement-open-offer-factories.sh $@
elif [ "$command" = "create-instrument-factories" ]; then
  ${dops_commands}/create-instrument-factories.sh $@
elif [ "$command" = "create-issuer-factories" ]; then
  ${dops_commands}/create-issuer-factories.sh $@
elif [ "$command" = "create-minter-burner-factories" ]; then
  ${dops_commands}/create-minter-burner-factories.sh $@
elif [ "$command" = "create-route-providers" ]; then
  ${dops_commands}/create-route-providers.sh $@
elif [ "$command" = "create-accounts-unilateral" ]; then
  ${dops_commands}/create-accounts-unilateral.sh $@
elif [ "$command" = "create-account-open-offers" ]; then
  ${dops_commands}/create-open-account-offer.sh $@
elif [ "$command" = "take-account-open-offers" ]; then
  ${dops_commands}/take-open-account-offer.sh $@
elif [ "$command" = "create-pbas-unilateral" ]; then
  ${dops_commands}/create-pbas-unilateral.sh $@
elif [ "$command" = "create-settlement-open-offers" ]; then
  ${dops_commands}/create-settlement-open-offers.sh $@
elif [ "$command" = "take-settlement-open-offer" ]; then
  ${dops_commands}/take-settlement-open-offer.sh $@
elif [ "$command" = "accept-settlement" ]; then
  ${dops_commands}/accept-settlement.sh $@
elif [ "$command" = "execute-settlement" ]; then
  ${dops_commands}/execute-settlement.sh $@
elif [ "$command" = "create-issuers" ]; then
  ${dops_commands}/create-issuers.sh $@
elif [ "$command" = "create-minter-burners" ]; then
  ${dops_commands}/create-minter-burners.sh $@
elif [ "$command" = "create-fund-offer-unilateral" ]; then
  ${dops_commands}/create-fund-offer.sh $@
elif [ "$command" = "create-fund-issuer-open-offers" ]; then
  ${dops_commands}/create-fund-issuer-open-offers.sh $@
elif [ "$command" = "take-fund-issuer-open-offer" ]; then
  ${dops_commands}/take-open-fund-issuer-offer.sh $@
elif [ "$command" = "create-fund-investors" ]; then
  ${dops_commands}/create-fund-investors.sh $@
elif [ "$command" = "accept-fund-purchase" ]; then
  ${dops_commands}/accept-fund-purchase.sh $@
else
  echo "Unsupported command: $command"
  exit 1
fi
