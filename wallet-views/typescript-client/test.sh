#!/usr/bin/env bash

set -x
set +e

rm -rf .dops

test_dir=$(pwd)

export DOPS_HOME=~/.dops
export PATH=$PATH:${DOPS_HOME}/bin

export LEDGER_HOST=localhost
export LEDGER_PLAINTEXT=true
export LEDGER_AUTH_ENABLED=false

# Get available ports (code snippet taken from https://unix.stackexchange.com/a/423052)
ports=$(
  comm -23 <(seq 49152 65535 | sort) <(ss -Htan | awk '{print $4}' | cut -d':' -f2 | sort -u) | shuf | head -n 6
)
ports_arr=($ports)
export LEDGER_PORT=${ports_arr[0]}
admin_api_port=${ports_arr[1]}
domain_public_port=${ports_arr[2]}
domain_admin_port=${ports_arr[3]}
export WALLET_VIEWS_PORT=${ports_arr[4]}
export POSTGRES_PORT=${ports_arr[5]}
cd ${test_dir}/../java
docker compose up -d db
sleep 15s
psql -h localhost -p $POSTGRES_PORT -U postgres -c 'drop database wallet_views'
psql -h localhost -p $POSTGRES_PORT -U postgres -c 'create database wallet_views'
cd $test_dir

# Start sandbox
cd ${test_dir}/../types
nohup daml sandbox \
  --port $LEDGER_PORT \
  --admin-api-port $admin_api_port \
  --domain-public-port $domain_public_port \
  --domain-admin-port $domain_admin_port &
sandbox_pid=$!
sandbox_pg_id=$(ps --pid $sandbox_pid -o "pgid" --no-headers)

# Start backend
cd ${test_dir}/../java
nohup mvn -Dmaven.test.skip=true spring-boot:run \
  -Dspring-boot.run.jvmArguments="-Dprojection.flyway.migrate-on-start=true" \
  -Dspring-boot.run.arguments=" \
    --spring.datasource.url=jdbc:postgresql://localhost:${POSTGRES_PORT}/wallet_views \
    --walletviews.ledger-host=${LEDGER_HOST} \
    --walletviews.ledger-port=${LEDGER_PORT} \
    --walletviews.ledger-plaintext=true \
    --server.port=${WALLET_VIEWS_PORT}" >> springboot-test.log 2>&1 &
spring_pid=$!
spring_pg_id=$(ps --pid $spring_pid -o "pgid" --no-headers)
sleep 20s

cd $test_dir
dops upload-dar
dops allocate-parties test-config/parties.json
read_as=$(jq -r '.parties[] | select(.label == "custodian") | .partyId' .dops/parties.json)

curl http://localhost:${WALLET_VIEWS_PORT}/wallet-views/v1/projection/start \
  -H 'Content-Type: application/json' \
  -d "
    {
      \"readAs\": \"${read_as}\",
      \"tokenUrl\": null
    }
  "
sleep 15s

dops create-users test-config/users.json
dops create-holding-factories test-config/holding-factories.json
dops create-account-factories test-config/account-factories.json
dops create-account-open-offer-factories test-config/account-open-offer-factories.json
dops create-account-open-offers test-config/account-open-offers.json
dops create-accounts-unilateral test-config/accounts.json
dops create-settlement-factories test-config/settlement-factories.json
dops create-mint-unilateral test-config/mint.json
dops create-mint-receivers test-config/mint-receivers.json
instruct_mint_output_file=$(mktemp)
dops instruct-mint test-config/instruct-mint.json --output-file $instruct_mint_output_file
dops execute-mint test-config/execute-mint.json $instruct_mint_output_file
rm $instruct_mint_output_file

npm test
exit_code=$?

kill -SIGTERM -- $sandbox_pg_id
kill -SIGTERM -- $spring_pg_id
cd ${test_dir}/../java
docker compose down
exit $exit_code
