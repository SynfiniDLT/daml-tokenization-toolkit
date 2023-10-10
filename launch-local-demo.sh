#!/usr/bin/env bash

set -eu

tokenization_lib_home=$(pwd)

make build-wallet-views
make build-onboarding

set +e
psql -h localhost -p 5432 -U postgres -c 'drop database wallet_views'
set -e
psql -h localhost -p 5432 -U postgres -c 'create database wallet_views'

export LEDGER_HOST=localhost
export LEDGER_PORT=6865
export LEDGER_PLAINTEXT=true
export LEDGER_AUTH=false

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
./setup.sh parties demo/demo-parties-input.json
read_as=$(jq -r '.parties[] | select(.name == "SynfiniValidator") | .partyId' .setup/parties.json)
./setup.sh users demo/demo-users-input.json

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
./setup.sh account-factories demo/demo-account-factories-input.json
./setup.sh holding-factories demo/demo-holding-factories-input.json
./setup.sh accounts-unilateral demo/demo-accounts-input.json
./setup.sh settlement-factories demo/demo-settlement-factories-input.json
./setup.sh accounts-unilateral demo/demo-new-account-input.json
./setup.sh mint-unilateral demo/demo-mint-input.json
./setup.sh instruct-mint demo/demo-instruct-mint.json
./setup.sh execute-mint demo/demo-execute-mint-input.json
./setup.sh instruct-burn demo/demo-instruct-burn.json
./setup.sh instrument-factories demo/demo-instrument-factories-input.json
./setup.sh parties demo/demo-sbt-parties-input.json
./setup.sh accounts-unilateral demo/demo-sbt-accounts-input.json
./setup.sh create-pbas-unilateral demo/demo-pba-input.json

cd ${tokenization_lib_home}
make start-wallet-ui
