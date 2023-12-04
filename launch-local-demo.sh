#!/usr/bin/env bash

set -eu

tokenization_lib_home=$(pwd)

make compile-wallet-views
make install-onboarding
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
dops upload-dar
dops allocate-parties onboarding/demo/parties/demo-parties-input.json
read_as=$(jq -r '.parties[] | select(.label == "WalletOperator") | .partyId' .dops/parties.json)
dops create-users onboarding/demo/users/demo-users-input.json

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
dops create-account-factories onboarding/demo/factories/demo-account-factories-input.json
dops create-holding-factories onboarding/demo/factories/demo-holding-factories-input.json
dops create-settlement-factories onboarding/demo/factories/demo-settlement-factories-input.json
dops create-instrument-factories onboarding/demo/factories/demo-instrument-factories-input.json

# Accounts
dops create-accounts-unilateral onboarding/demo/accounts/demo-accounts-input.json
dops create-accounts-unilateral onboarding/demo/accounts/demo-new-account-input.json
dops create-accounts-unilateral onboarding/demo/accounts/demo-fund-account-input.json 
dops create-accounts-unilateral onboarding/demo/accounts/demo-fund-investor-account-input.json
dops create-accounts-unilateral onboarding/demo/accounts/demo-fund-units-accounts-input.json
dops create-accounts-unilateral onboarding/demo/accounts/demo-sbt-accounts-input.json

# AUDN
dops create-mint-unilateral onboarding/demo/audn/demo-mint-input.json
dops create-minters onboarding/demo/audn/demo-minter-input.json
dops create-mint-receivers onboarding/demo/audn/demo-mint-receivers-input.json
instruct_mint_output_file=$(mktemp)
dops instruct-mint onboarding/demo/audn/demo-instruct-mint.json --output-file $instruct_mint_output_file
dops execute-mint onboarding/demo/audn/demo-execute-mint-input.json $instruct_mint_output_file
dops instruct-burn onboarding/demo/audn/demo-instruct-burn.json
rm $instruct_mint_output_file

# SBT
dops create-pbas-unilateral onboarding/demo/sbt/demo-pba-input.json

# Fund
dops create-fund-offer-unilateral onboarding/demo/fund/demo-fund-offer-input.json
dops create-fund-investors onboarding/demo/fund/fund-investors-input.json
dops create-mint-unilateral onboarding/demo/fund/demo-fund-unit-mint-input.json
dops create-mint-receivers onboarding/demo/fund/demo-fund-mint-receivers-input.json
instruct_fund_mint_output_file=$(mktemp)
dops instruct-mint onboarding/demo/fund/demo-fund-instruct-mint.json --output-file $instruct_fund_mint_output_file
dops execute-mint onboarding/demo/fund/demo-execute-fund-mint-input.json $instruct_fund_mint_output_file
rm $instruct_fund_mint_output_file

cd ${tokenization_lib_home}
