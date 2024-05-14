#!/usr/bin/env bash

set -eu

db_name=pqs

set +e
psql -h localhost -p 5432 -U postgres -c "drop database $db_name"
set -e
psql -h localhost -p 5432 -U postgres -c "create database $db_name"

./scribe.jar pipeline ledger postgres-document \
  --pipeline-filter-parties $(./party-id-from-label.sh WalletOperator) \
  --target-postgres-database $db_name \
  --health-port 8081
