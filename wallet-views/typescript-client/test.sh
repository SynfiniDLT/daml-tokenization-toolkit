#!/usr/bin/env bash

set -x
set +e

if [ -z "${SCRIBE_LOCATION+x}" ]; then
  echo "Please set SCRIBE_LOCATION"
  exit 1
fi

rm -rf .dops

test_dir=$(pwd)

export DOPS_HOME=~/.dops
export PATH=$PATH:${DOPS_HOME}/bin

export LEDGER_HOST=localhost
export LEDGER_PLAINTEXT=true
export LEDGER_AUTH_ENABLED=false

# Get available ports (code snippet taken from https://unix.stackexchange.com/a/423052)
ports=$(
  comm -23 <(seq 49152 65535 | sort) <(ss -Htan | awk '{print $4}' | cut -d':' -f2 | sort -u) | shuf | head -n 7
)
ports_arr=($ports)
export LEDGER_PORT=${ports_arr[0]}
admin_api_port=${ports_arr[1]}
domain_public_port=${ports_arr[2]}
domain_admin_port=${ports_arr[3]}
export WALLET_VIEWS_PORT=${ports_arr[4]}
export POSTGRES_PORT=${ports_arr[5]}
scribe_health_port=${ports_arr[6]}

db_name=wallet_views

docker compose up -d db
sleep 25s
psql -h localhost -p $POSTGRES_PORT -U postgres -c "drop database $db_name"
psql -h localhost -p $POSTGRES_PORT -U postgres -c "create database $db_name"
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
  -Dspring-boot.run.arguments=" \
    --spring.datasource.url=jdbc:postgresql://localhost:${POSTGRES_PORT}/${db_name} \
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

nohup ${SCRIBE_LOCATION} \
  pipeline \
  ledger \
  postgres-document \
  --source-ledger-port $LEDGER_PORT \
  --pipeline-datasource TransactionStream \
  --pipeline-filter-parties "$read_as" \
  --target-postgres-username postgres \
  --target-postgres-password postgres \
  --target-postgres-database $db_name \
  --target-postgres-host localhost \
  --target-postgres-port $POSTGRES_PORT \
  --health-port $scribe_health_port >> scribe-test.log 2>&1 &
scribe_pid=$!
scribe_pg_id=$(ps --pid $scribe_pid -o "pgid" --no-headers)
sleep 20s

psql -h localhost -p $POSTGRES_PORT -U postgres -d $db_name -f $test_dir/../java/src/main/resources/db/functions.sql

# Factories
dops create-users test-config/users.json
dops create-holding-factories test-config/holding-factories.json
dops create-account-factories test-config/account-factories.json
dops create-account-open-offer-factories test-config/account-open-offer-factories.json
dops create-settlement-factories test-config/settlement-factories.json
dops create-settlement-open-offer-factories test-config/settlement-open-offer-factories.json
dops create-instrument-factories test-config/instrument-factories.json
dops create-issuer-factories test-config/issuer-factories.json

# Route provider
dops create-route-providers test-config/route-providers.json

# Accounts
dops create-account-open-offers test-config/account-open-offers.json
dops create-accounts-unilateral test-config/accounts.json

# Instrument
dops create-issuers test-config/issuers.json

# Settlement
dops create-settlement-open-offers test-config/settlement-open-offer.json
batch_id=$(uuidgen)
dops take-settlement-open-offer test-config/alice-settlement-preferences.json issuer test $batch_id 1 ref
dops accept-settlement test-config/alice-settlement-preferences.json issuer,alice $batch_id
dops accept-settlement test-config/custodian-settlement-preferences.json issuer,alice $batch_id
dops execute-settlement test-config/execute-settlement.json issuer,alice $batch_id

npm test
exit_code=$?

kill -SIGTERM -- $sandbox_pg_id
kill -SIGTERM -- $spring_pg_id
kill -SIGTERM -- $scribe_pg_id
cd ${test_dir}
docker compose down
exit $exit_code
