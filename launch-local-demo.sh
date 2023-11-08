#!/usr/bin/env bash

set -eu

tokenization_lib_home=$(pwd)

make compile-wallet-views
make build-onboarding

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

cd ${tokenization_lib_home}/onboarding
rm -rf .setup
./setup.sh upload-dar
./setup.sh allocate-parties demo/parties/demo-parties-input.json
read_as=$(jq -r '.parties[] | select(.label == "WalletOperator") | .partyId' .setup/parties.json)
./setup.sh create-users demo/users/demo-users-input.json

cd ${tokenization_lib_home}/wallet-views/java
nohup mvn -Dmaven.test.skip=true spring-boot:run \
  -Dspring-boot.run.arguments=" \
    --walletviews.ledger-host=${LEDGER_HOST} \
    --walletviews.ledger-port=${LEDGER_PORT} \
    --walletviews.ledger-plaintext=true" > springboot.log 2>&1 &
spring_pid=$!
spring_pg_id=$(ps --pid $spring_pid -o "pgid" --no-headers)
echo $spring_pg_id > $tokenization_lib_home/spring.pgid
sleep 20s

curl http://localhost:8080/v1/projection/start \
  -H 'Content-Type: application/json' \
  -d "
    {
      \"readAs\": \"${read_as}\",
      \"tokenUrl\": null
    }
  "
sleep 20s

cd ${tokenization_lib_home}/onboarding

# Factories
./setup.sh account-factories demo/factories/demo-account-factories-input.json
./setup.sh holding-factories demo/factories/demo-holding-factories-input.json
./setup.sh settlement-factories demo/factories/demo-settlement-factories-input.json
./setup.sh instrument-factories demo/factories/demo-instrument-factories-input.json

# Accounts
./setup.sh accounts-unilateral demo/accounts/demo-accounts-input.json
./setup.sh accounts-unilateral demo/accounts/demo-new-account-input.json
./setup.sh accounts-unilateral demo/accounts/demo-fund-account-input.json 
./setup.sh accounts-unilateral demo/accounts/demo-fund-investor-account-input.json
./setup.sh accounts-unilateral demo/accounts/demo-fund-units-accounts-input.json
./setup.sh accounts-unilateral demo/accounts/demo-sbt-accounts-input.json

# AUDN
./setup.sh create-mint-unilateral demo/audn/demo-mint-input.json
./setup.sh minters demo/audn/demo-minter-input.json
./setup.sh mint-receivers demo/audn/demo-mint-receivers-input.json
instruct_mint_output_file=$(mktemp)
./setup.sh instruct-mint demo/audn/demo-instruct-mint.json --output-file $instruct_mint_output_file
./setup.sh execute-mint demo/audn/demo-execute-mint-input.json $instruct_mint_output_file
./setup.sh instruct-burn demo/audn/demo-instruct-burn.json
rm $instruct_mint_output_file

# SBT
./setup.sh create-pbas-unilateral demo/sbt/demo-pba-input.json

# Fund
./setup.sh create-fund-offer demo/fund/demo-fund-offer-input.json
./setup.sh create-fund-investors demo/fund/fund-investors-input.json
./setup.sh create-mint-unilateral demo/fund/demo-fund-unit-mint-input.json
./setup.sh mint-receivers demo/fund/demo-fund-mint-receivers-input.json
instruct_fund_mint_output_file=$(mktemp)
./setup.sh instruct-mint demo/fund/demo-fund-instruct-mint.json --output-file $instruct_fund_mint_output_file
./setup.sh execute-mint demo/fund/demo-execute-fund-mint-input.json $instruct_fund_mint_output_file
rm $instruct_fund_mint_output_file

cd ${tokenization_lib_home}
