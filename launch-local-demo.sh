#!/usr/bin/env bash

set -eu

tokenization_lib_home=$(pwd)

make build-wallet-views
make build-onboarding

set +e
psql -h localhost -p 5432 -U postgres -c 'drop database wallet_views'
set -e
psql -h localhost -p 5432 -U postgres -c 'create database wallet_views'

ledger_host=localhost
ledger_port=6865
host_port_args="--ledger-host ${ledger_host} --ledger-port ${ledger_port}"

cd ${tokenization_lib_home}/onboarding
rm -rf .setup
./setup.sh upload-dar
./setup.sh parties demo/demo-parties-input.json $host_port_args
read_as=$(jq -r '.parties[] | select(.name == "SynfiniValidator") | .partyId' .setup/parties.json)
./setup.sh users demo/demo-users-input.json $host_port_args

cd ${tokenization_lib_home}/wallet-views/java
mvn spring-boot:run \
  -Dspring-boot.run.arguments=" \
    --walletviews.ledger-host=${ledger_host} \
    --walletviews.ledger-port=${ledger_port} \
    --walletviews.ledger-plaintext=true" > springboot.log &
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
./setup.sh account-factories demo/demo-account-factories-input.json $host_port_args
./setup.sh holding-factories demo/demo-holding-factories-input.json $host_port_args
./setup.sh accounts-unilateral demo/demo-accounts-input.json $host_port_args
./setup.sh settlement-factories demo/demo-settlement-factories-input.json $host_port_args
./setup.sh accounts-unilateral demo/demo-new-account-input.json $host_port_args
./setup.sh mint-unilateral demo/demo-mint-input.json $host_port_args
./setup.sh instruct-mint demo/demo-instruct-mint.json $host_port_args
./setup.sh execute-mint demo/demo-execute-mint-input.json $host_port_args
./setup.sh instruct-burn demo/demo-instruct-burn.json $host_port_args
./setup.sh instrument-factories demo/demo-instrument-factories-input.json $host_port_args
./setup.sh parties demo/demo-sbt-parties-input.json $host_port_args
./setup.sh accounts-unilateral demo/demo-sbt-accounts-input.json $host_port_args
./setup.sh create-pbas-unilateral demo/demo-pba-input.json $host_port_args

cd ${tokenization_lib_home}
make start-wallet-ui
