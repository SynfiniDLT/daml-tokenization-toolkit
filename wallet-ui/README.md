# daml-wallet-ui
WARNING this is out of date and needs to be removed or re-written

UI for holders of Daml Finance assets

## Build and run

These are the instructions to build and run locally. More work is needed to turn this process into scripts. First,
you need to clone this repo and its submodules:

```bash
git clone --recurse-submodules https://github.com/SynfiniDLT/daml-wallet-ui
```

Then build the dependencies:

```bash
./get-dependencies.sh
./build-dependencies.sh
```

Start the local Canton sandbox and JSON API:

```bash
cd daml-wallet-views/daml/typescript-integration-test
daml start
```

Before running the next step you need to update the `parties-input.json` file to have the desired user IDs (TODO how to streamline this process?).

In another terminal, setup the DB and allocate the parties/users:

```bash
cd daml-wallet-views
docker compose up -d db
psql -h localhost -p 5432 -U postgres -c 'drop database wallet_views'
psql -h localhost -p 5432 -U postgres -c 'create database wallet_views'
cd daml/typescript-integration-test
daml build
daml ledger upload-dar .daml/dist/synfini-wallet-views-typescript-integration-test-0.0.1.dar
daml script \
  --dar .daml/dist/synfini-wallet-views-typescript-integration-test-0.0.1.dar \
  --ledger-host localhost \
  --ledger-port 6865 \
  --input-file parties-input.json \
  --output-file ../../typescript-client/allocate-parties-output.json \
  --script-name Synfini.Wallet.Api.TypeScriptIntegrationTestSetup:allocateParties
```

Start the projection runner (this assumes you have already built the daml-wallet-views maven project):

```bash
cd daml-wallet-views
mvn exec:java \
  -Dexec.mainClass="com.synfini.wallet.views.projection.ProjectionRunner" \
  -Dexec.args=" \
     --ledger-host localhost \
     --ledger-port 6865 \
     --ledger-plaintext \
     --read-as $(jq -r '.custodian' typescript-client/allocate-parties-output.json) \
     --db-url jdbc:postgresql://localhost/wallet_views \
     --db-user postgres \
     --db-password-file /dev/stdin" <<< "postgres"
```

In another terminal, create the testing contracts and start the API server:

```bash
cd daml-wallet-views/daml/typescript-integration-test
daml script \
  --dar .daml/dist/synfini-wallet-views-typescript-integration-test-0.0.1.dar \
  --ledger-host localhost \
  --ledger-port 6865 \
  --input-file ../../typescript-client/allocate-parties-output.json \
  --script-name Synfini.Wallet.Api.TypeScriptIntegrationTestSetup:createContracts
cd ../..
mvn spring-boot:run \
  -Dspring-boot.run.arguments=" \
    --walletviews.ledger-host=localhost \
    --walletviews.ledger-port=6865 \
    --walletviews.ledger-plaintext=true"
```

Finally, in another terminal you can start the UI:

```bash
npm install
npm start
```

## .env variables explanation

These environment variables in the .env file defines key entities and roles within the wallet-ui application. They assign values to terms like depository, issuer, operator, and public key, managing operations within the wallet under the Synfini platform.   

1. REACT_APP_LEDGER_INSTRUMENT_DEPOSITORY: Represents the depository entity for the specified ledger instrument SBT (Soulbound Token).
1. REACT_APP_LEDGER_INSTRUMENT_ISSUER: Denotes the issuer entity responsible for managing and issuing the specified ledger instrument SBT (Soulbound Token).
1. REACT_APP_LEDGER_WALLET_OPERATOR: Points to the operator entity responsible for managing operations within the wallet.
1. REACT_APP_LEDGER_WALLET_DEPOSITORY: Refers to the depository entity associated with the specific blockchain wallet.
1. REACT_APP_LEDGER_WALLET_PUBLIC: Represents the public-facing aspect or key for the Synfini blockchain wallet.
1. REACT_APP_MODE: specifies the operational mode of the wallet app, serving either as an investor or issuer, adapting its functionalities accordingly.