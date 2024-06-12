#!/usr/bin/env bash

# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eu

db_name=wallet_views

set +e
psql -h localhost -p 5432 -U postgres -c "drop database $db_name"
set -e
psql -h localhost -p 5432 -U postgres -c "create database $db_name"

# The below command is a workaround due to the fact that when running the script multiple times, flyway (used by scribe)
# may complain about conflicts with the previous versions of the schema
set +e
psql -h localhost -p 5432 -U postgres -c "drop schema public" $db_name
set -e
psql -h localhost -p 5432 -U postgres -c "create schema public" $db_name

nohup $SCRIBE_LOCATION pipeline ledger postgres-document \
  --pipeline-filter-parties $(./party-id-from-label.sh WalletOperator) \
  --target-postgres-database $db_name \
  --health-port 8081 > scribe.log 2>&1 &
scribe_pid=$!
scribe_pg_id=$(ps --pid $scribe_pid -o "pgid" --no-headers)
echo $scribe_pg_id > scribe.pgid

sleep 30s
psql \
  -h localhost \
  -p 5432 \
  -U postgres \
  -d $db_name \
  -f wallet-views/java/src/main/resources/db/functions.sql
