#!/usr/bin/env bash

set -eu

tokenization_lib_home=$(pwd)
config_dir=${tokenization_lib_home}/demo-config

function create_identity_token() {
  owner=$1
  name=$2
  set +u
  settle=$3
  set -u

  sbt_offer_id=$(uuidgen)
  python3 create-synfini-id-offer.py \
    --issuer SbtIssuer \
    --depository SbtDepository \
    --custodian SynfiniValidator \
    --issuer-contract SbtIssuer.V1 \
    --publisher-contract SbtIssuer.V1 \
    --offer-id $sbt_offer_id \
    --owner "$owner" \
    --name "$name" \
    --observers WalletOperator \
    --settlement-one-time-offer-factory V1 \
    --settlement-factory V1 \
    --route-provider validatorCustodianV1 \
    --read-as SynfiniPublic

  dops \
    accept-settlement-one-time-offer \
    "${config_dir}/settlement/${owner}-settings.json" \
    SbtIssuer \
    $sbt_offer_id \
    1 \
    SBT

  if [ "$settle" = "settle" ]; then
    dops accept-settlement "${config_dir}/settlement/${owner}-settings.json" "SbtIssuer,$owner" $sbt_offer_id
    dops accept-settlement ${config_dir}/settlement/SbtIssuer-settings.json "SbtIssuer,$owner" $sbt_offer_id
    dops execute-settlement ${config_dir}/settlement/SbtIssuer-settings.json "SbtIssuer,$owner" $sbt_offer_id
  fi
}

make compile-wallet-views
make install-operations
export DOPS_HOME=~/.dops
export PATH=$PATH:$DOPS_HOME/bin

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
dops allocate-parties ${config_dir}/parties/parties.json
read_as=$(./party-id-from-label.sh WalletOperator)
dops create-users ${config_dir}/users/users.json

./start-pqs.sh

cd ${tokenization_lib_home}/wallet-views/java
nohup mvn -Dmaven.test.skip=true spring-boot:run \
  -Dspring-boot.run.jvmArguments="-Dprojection.flyway.migrate-on-start=true" \
  -Dspring-boot.run.arguments=" \
    --spring.datasource.url=jdbc:postgresql://localhost:5432/wallet_views \
    --walletviews.ledger-host=${LEDGER_HOST} \
    --walletviews.ledger-port=${LEDGER_PORT} \
    --walletviews.ledger-plaintext=true" > springboot.log 2>&1 &
spring_pid=$!
spring_pg_id=$(ps --pid $spring_pid -o "pgid" --no-headers)
echo $spring_pg_id > $tokenization_lib_home/spring.pgid
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
dops create-instruments ${config_dir}/stablecoin/instrument.json
dops create-minter-burners ${config_dir}/stablecoin/minter-burner.json
dops create-settlement-open-offers ${config_dir}/stablecoin/on-ramp-offer.json
mint_id=$(uuidgen)
dops \
  take-settlement-open-offer \
  ${config_dir}/settlement/InvestorA-settings.json \
  StableCoinIssuer \
  StableCoin@v1.OnRamp \
  $mint_id \
  100000 \
  Mint
dops accept-settlement ${config_dir}/settlement/InvestorA-settings.json StableCoinIssuer,InvestorA $mint_id
dops accept-settlement ${config_dir}/settlement/StableCoinIssuer-settings.json StableCoinIssuer,InvestorA $mint_id
dops execute-settlement ${config_dir}/settlement/StableCoinIssuer-settings.json StableCoinIssuer,InvestorA $mint_id
dops create-settlement-open-offers ${config_dir}/stablecoin/off-ramp-offer.json
burn_id=$(uuidgen)
dops \
  take-settlement-open-offer \
  ${config_dir}/settlement/InvestorA-settings.json \
  StableCoinIssuer \
  StableCoin@v1.OffRamp \
  $burn_id \
  100 \
  Burn

# SBT
dops create-minter-burners ${config_dir}/synfini-id/minter-burner.json
create_identity_token InvestorA "John Doe"
create_identity_token InvestorB "Jane Smith" settle
create_identity_token StableCoinIssuer "Acme Bank" settle
create_identity_token FundA "ABC Investments" settle
create_identity_token FundManagerA "ABC Fund Manager" settle
create_identity_token EnvironmentalTokenIssuer "ESG Certifier Corp" settle
create_identity_token ProducerA "Farmer XYZ" settle

# Fund
dops create-instruments ${config_dir}/fund/FundA-instrument.json
dops create-minter-burners ${config_dir}/fund/FundA-minter-burner.json
dops create-settlement-open-offers ${config_dir}/fund/FundA-invest-offer.json
invest_id=$(uuidgen)
dops \
  take-settlement-open-offer \
  ${config_dir}/settlement/InvestorA-settings.json \
  FundA \
  FundInvestment \
  $invest_id \
  10 \
  Buy
dops accept-settlement ${config_dir}/settlement/InvestorA-settings.json FundA,InvestorA $invest_id
dops accept-settlement ${config_dir}/settlement/FundA-settings.json FundA,InvestorA $invest_id
dops accept-settlement ${config_dir}/settlement/FundManagerA-settings.json FundA,InvestorA $invest_id
dops execute-settlement ${config_dir}/settlement/FundA-settings.json FundA,InvestorA $invest_id

# Environmental token
dops create-minter-burners ${config_dir}/environmental-token/minter-burner.json

# DvP
dops create-settlement-one-time-offers ${config_dir}/settlement/dvp-offer.json
