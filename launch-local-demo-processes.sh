#!/usr/bin/env bash

set -eu

tokenization_lib_home=$(pwd)

make compile-wallet-views
make install-operations
export DOPS_HOME=~/.dops
export PATH=$PATH:$DOPS_HOME/bin

set +e
psql -h localhost -p 5432 -U postgres -c 'drop database wallet_views'
set -e
psql -h localhost -p 5432 -U postgres -c 'create database wallet_views'

export LEDGER_HOST=localhost
export LEDGER_PORT=6865
export LEDGER_PLAINTEXT=true
export LEDGER_AUTH_ENABLED=false

nohup daml sandbox &
sandbox_pid=$!
sandbox_pg_id=$(ps --pid $sandbox_pid -o "pgid" --no-headers)
echo $sandbox_pg_id > $tokenization_lib_home/sandbox.pgid
sleep 20s

nohup daml json-api --http-port 7575 --ledger-host ${LEDGER_HOST} --ledger-port ${LEDGER_PORT} &
json_api_pid=$!
json_api_pg_id=$(ps --pid $json_api_pid -o "pgid" --no-headers)
echo $json_api_pg_id > $tokenization_lib_home/json-api.pgid

rm -rf .dops
config_dir=${tokenization_lib_home}/demo-config
dops upload-dar
dops allocate-parties ${config_dir}/parties/parties.json
read_as=$(./party-id-from-label.sh WalletOperator)
dops create-users ${config_dir}/users/users.json

cd ${tokenization_lib_home}/wallet-views/java
nohup mvn -Dmaven.test.skip=true spring-boot:run \
  -Dspring-boot.run.jvmArguments="-Dprojection.flyway.migrate-on-start=true" \
  -Dspring-boot.run.arguments=" \
    --walletviews.ledger-host=${LEDGER_HOST} \
    --walletviews.ledger-port=${LEDGER_PORT} \
    --walletviews.ledger-plaintext=true" > springboot.log 2>&1 &
spring_pid=$!
spring_pg_id=$(ps --pid $spring_pid -o "pgid" --no-headers)
echo $spring_pg_id > $tokenization_lib_home/spring.pgid
sleep 20s

curl http://localhost:8080/wallet-views/v1/projection/start \
  -H 'Content-Type: application/json' \
  -d "
    {
      \"readAs\": \"${read_as}\",
      \"tokenUrl\": null
    }
  "
sleep 20s

cd ${tokenization_lib_home}

# Factories
dops create-account-factories ${config_dir}/factories/account-factories.json
dops create-holding-factories ${config_dir}/factories/holding-factories.json
dops create-settlement-factories ${config_dir}/factories/settlement-factories.json
dops create-settlement-one-time-offer-factories ${config_dir}/factories/settlement-one-time-offer-factories.json
dops create-settlement-open-offer-factories ${config_dir}/factories/settlement-open-offer-factories.json
dops create-instrument-factories ${config_dir}/factories/instrument-factories.json
dops create-instrument-metadata-factories  ${config_dir}/factories/instrument-metadata-factories.json
dops create-account-open-offer-factories ${config_dir}/factories/account-open-offer-factories.json
dops create-issuer-factories  ${config_dir}/factories/issuer-factories.json
dops create-instrument-metadata-publisher-factories ${config_dir}/factories/instrument-metadata-publisher-factories.json
dops create-minter-burner-factories ${config_dir}/factories/minter-burner-factories.json

# Route Providers
dops create-route-providers ${config_dir}/route-providers/route-providers.json

# Issuer
dops create-issuers ${config_dir}/issuers/issuers.json

# Accounts
dops create-accounts-unilateral ${config_dir}/accounts/accounts.json
dops create-account-open-offers ${config_dir}/accounts/account-open-offers.json

# Stablecoin
dops create-minter-burners ${config_dir}/stablecoin/minter-burner.json
dops create-settlement-open-offers ${config_dir}/stablecoin/on-ramp-offer.json
mint_id=$(uuidgen)
dops take-settlement-open-offer ${config_dir}/stablecoin/take-on-ramp-offer.json $mint_id
dops accept-settlement ${config_dir}/settlement/investorA-settlement-preferences.json StableCoinIssuer,InvestorA $mint_id
dops accept-settlement ${config_dir}/settlement/stablecoin-issuer-settlement-preferences.json StableCoinIssuer,InvestorA $mint_id
dops execute-settlement ${config_dir}/settlement/stablecoin-issuer-execute.json StableCoinIssuer,InvestorA $mint_id
dops create-settlement-open-offers ${config_dir}/stablecoin/off-ramp-offer.json
burn_id=$(uuidgen)
dops take-settlement-open-offer ${config_dir}/stablecoin/take-off-ramp-offer.json $burn_id

# SBT
dops create-minter-burners ${config_dir}/synfini-id/minter-burner.json
issuer_sbt_args="SbtIssuer SbtDepository SbtIssuer.V1 SbtIssuer.V1 ${config_dir}/settlement/SbtIssuer-settlement-preferences.json"
python3 create-synfini-id.py $issuer_sbt_args InvestorA ${config_dir}/settlement/investorA-settlement-preferences.json 'John Doe' WalletOperator

# Fund
dops create-minter-burners ${config_dir}/fund/fundA-minter-burner.json
dops create-settlement-open-offers ${config_dir}/fund/fundA-invest-offer.json
invest_id=$(uuidgen)
dops take-settlement-open-offer ${config_dir}/fund/take-fundA-invest-offer.json $invest_id
dops accept-settlement ${config_dir}/settlement/investorA-settlement-preferences.json FundA,InvestorA $invest_id
dops accept-settlement ${config_dir}/settlement/FundA-settlement-preferences.json FundA,InvestorA $invest_id
dops accept-settlement ${config_dir}/settlement/FundManagerA-settlement-preferences.json FundA,InvestorA $invest_id
dops execute-settlement ${config_dir}/settlement/FundA-execute.json FundA,InvestorA $invest_id

# Environmental token
dops create-minter-burners ${config_dir}/environmental-token/minter-burner.json
