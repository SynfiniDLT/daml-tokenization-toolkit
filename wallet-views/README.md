# Daml Wallet Views

WARNING this is out of date and needs to be removed or re-written

This repository contains an API written in Java Spring Boot. This API provides read-only endpoints for querying the
details of a "Daml wallet", such as account details and balances. The "wallet" refers to assets held by a Daml party,
modelled using [Daml Finance](https://docs.daml.com/daml-finance/index.html). It is not restricted to any particular
type of asset. The only requirement is that the assets implement the Daml Finance interfaces.

## Components overview

## HTTP/JSON API

The API provides read-only endpoints (see below for more detail). It is not strictly a RESTful API, but it uses  HTTP
and requests/responses are in JSON format. The requests and responses are encoded using the
[Daml-lf JSON encoding](https://docs.daml.com/json-api/lf-value-specification.html), which is the same encoding used by
the [Daml JSON API](https://docs.daml.com/json-api/index.html). The API provides a significantly faster way to query
wallet information than would otherwise be possible using only the Daml gRPC or JSON APIs.

## Custom views projection

The Spring Boot API does not send requests directly to the ledger API. Instead, it reads from a PostgreSQL database.
The database is populated using an application written using [Custom Views](https://docs.daml.com/app-dev/custom-views/index.html)
which is also provided as part of this repository. This application continuously streams events from the ledger and
writes them to the database.

## Javascript client

A client-side library, written in Typescript, is provided which can call the API from the browser or backend application.
This is available under `typescript-client` directory. This provides a strongly-typed interface for interacting with
the API.

## Type definitions

The type definitions of API requests and responses are written as Daml datatypes under `daml/types`. Note - this is just
an internal implementation detail of the project, and this Daml code is not used directly. It is only used as a single
source of truth for the API request/response schemas. As part of the build, the
[Codegen](https://docs.daml.com/tools/codegen.html) is used to generate Java code for the API and Typescript code for
the client. The types are fully compatible with Daml Finance as Daml Finance types/interface definitions are used in
the Daml code.

# Deployment topology

In the context of [Canton](https://docs.daml.com/canton/about.html), each participant needs to host their own instance
of the Wallet Views database and API. There is a one-to-one relationship between the database and the participant node,
as it acts as an indexed view of the state of the Daml ledger (visible to the participant) and its transaction history.

![alt text](https://github.com/SynfiniDLT/daml-wallet-views/blob/main/diagrams/high-level-architecture.png?raw=true)

It is possible to drop the database and re-start the projection but this is not recommended because transactional
history will be lost, as when the projection starts from an empty database, it begins by using an Active Contract Set
snapshot, rather than utilising the Transaction Service. The projection does not remove older events from the database
i.e. an equivalent to [participant pruning](https://docs.daml.com/ops/pruning.html) for the database is not supported,
but this feature could be added.

# API Authentication

The API expects a ledger API user access token to be supplied with every request, even if the underlying participant
does not use authentication. The token must be provided through the HTTP header:

`Authorization: Bearer your-token`

The API does not support party-specific tokens. Internally, the API will use this token to get the user rights of the
user from the participant node's UserManagementService. If the request is rejected by the participant with the gRPC
status `UNAUTHENTICATED` or the user does not exist on the participant, then the caller will receive HTTP status 401
Unauthorized.

# API Specification

The following endpoints are provided the API:

## List accounts
### HTTP Request
- URL: `/v1/accounts`
- Method: `POST`
- Content-Type: `application/json`
- Content:

```js
{
  "owner": "Alice::abc123" // Returns only accounts owned by this party
}
```

Currently, only filtering by account owner is supported. Support for other filters may be added in future, such as
account custodian.

### Required permissions
- actAs or readAs permissions for the account owner party

### HTTP Response
- Content-Type: `application/json`
- Content:

```js
{
  "accounts": [
    {
      "cid": "...",
      "view": { // Interface view of the Daml Finance Account
        "custodian": "Acme::abc123",
        "owner": "Alice::abc123",
        "id": {
          "unpack": "1"
        },
        "description": "...",
        "holdingFactoryCid": "...",
        "controllers": {
          "outgoing": [
            ["Alice::abc123", {}],
            ["Bob::abc123", {}]
          ],
          "incoming": [
            ["Charlie::abc123", {}]
          ]
        }
      },
      "create": { // When the account was created - optional
        "offset": "...",
        "effectiveTime": "2023-01-01T04:30:23.123456Z"
      },
      "remove": { // When the account was removed - optional
        "offset": "...",
        "effectiveTime": "2023-05-01T04:30:23.123456Z"
      }
    }
  ]
}
```

## List account balances
### HTTP Request
- URL: `/v1/balance`
- Method: `POST`
- Content-Type: `application/json`
- Content:

```js
{
  "account": { // Returns balances for this account
    "owner": "Alice::abc123",
    "custodian": "Custodian::abc123",
    "id": {
      "unpack": "1"
    }
  }
}
```

Support for other balance filters may be added in future.

### Required permissions
- actAs or readAs permissions for the account owner; or
- actAs or readAs permissions for the account custodian.

### HTTP Response
- Content-Type: `application/json`
- Content:
```js
{
  "balances": [
    {
      "account": {
        "owner": "Alice::abc123",
        "custodian": "Acme::abc123",
        "id": {
          "unpack": "1"
        }
      },
      "instrument": {
        "depository": "Depository::abc123",
        "issuer": "Issuer1::abc123",
        "id": {
          "unpack": "Coin1"
        },
        "version": "1"
      },
      "balance": 999.0
    },
    {
      "account": {
        "owner": "Alice::abc123",
        "custodian": "Acme::abc123",
        "id": {
          "unpack": "1"
        }
      },
      "instrument": {
        "depository": "Depository::abc123",
        "issuer": "Issuer2::abc123",
        "id": {
          "unpack": "Coin2"
        },
        "version": "1"
      },
      "balance": "999.0"
    }
  ]
}
```

The balance includes `Holding`s that are locked. A breakdown of locked and unlocked balance may need to be added in
future.

The balances API uses a lazily-loaded cache. The cache stores the balance and the ledger offset at which the balance was
last calculated. Only debits/credits after this offset are needed to calculate the balance the next time the API is
called.

## List settlements
### HTTP Request
- URL: `/v1/settlements`
- Method: `POST`
- Content-Type: `application/json`
- Content:

```js
{
  "before": "0000...a", // Optional. If provided, only returns transactions that occurred before this (absolute) ledger
  // offset. If not provided, transactions are returned starting from the most recent.
  "limit": 20 // Optional. If provided, it will only return a maximum of this many transactions. If not provided, the API
  // will only return up to `walletviews.max-transactions-response-size` (application property)
}
```

### Required permissions
N/A (only returns data which is visible to parties that the user has readAs or actAs rights for).

### HTTP Response
- Content-Type: `application/json`
- Content:

```js
{
  "settlements": [ // List of 0 or more Batch settlements
    {
      "execution": {
        "offset": "...",
        "effectiveTime": "1970-01-01T00:00:00Z"
      },
      "batchCid": "...", // Optional contract ID of the Batch contract (if the contract is visible to the caller)
      "description": "...", // Optional description of the Batch contract (if the contract is visible to the caller)
      "witness": {
        "offset": "...",
        "effectiveTime": "1970-01-01T00:00:00Z"
      },
      "requestors": {
        "map": [
          [
            "Alice::abc123",
            {}
          ]
        ]
      },
      "steps": [ // List of 1 or more steps in the Batch (only those for which the caller can see the Instruction contract)
        {
          "instructionId": {
            "unpack": "0"
          },
          "allocation": {
            "tag": "Pledge",
            "value": "..." // Contract Id of pledged holding
          },
          "approval": {
            "tag": "TakeDelivery",
            "value": {
              "custodian": "Custodian::abc123",
              "owner": "David::ghi789",
              "id": {
                "unpack": "1"
              }
            }
          },
          "routedStep": {
            "sender": "Charlie::def456",
            "receiver": "David::ghi789",
            "custodian": "Custodian::abc123",
            "quantity": {
              "unit": {
                "depository": "Custodian::abc123",
                "issuer": "Issuer::def456",
                "id": {
                  "unpack": "1"
                },
                "version": "Coin1"
              },
              "amount": "100.0"
            }
          },
          "instructionCid": "..."
        }
      ],
      "batchId": {
        "unpack": "batch1"
      },
      "contextId": {
        "unpack": "context1" // Optional context ID of the Batch contract (if the contract is visible to the caller)
      }
    }
  ]
}
```

The response will include all `Batch`es and `Instruction`es visible to the API caller.

You can use the ledger offset of the last transaction in the list to call the endpoint again, using this value for the
`before` field.

The API is currently only able to return the `TakeDelivery` case of [Approval](https://github.com/digital-asset/daml-finance/blob/1a58c1df3776c918c98cd2333b1e12ed0e99df1c/src/main/daml/Daml/Finance/Interface/Settlement/Types.daml#L49-L61)
and the `Pledge` case of [Allocation](https://github.com/digital-asset/daml-finance/blob/1a58c1df3776c918c98cd2333b1e12ed0e99df1c/src/main/daml/Daml/Finance/Interface/Settlement/Types.daml#L34-L46).
Any other cases are returned as `null`.

The API assumes that the batch key is a unique identifiers for each `Batch`, where the batch key is defined as the
combination of batch ID and the set of requesting parties. This applies even for `Batch`es which are already archived
on the ledger. The `Batch`es and `Instruction`es are grouped together by the batch key. This requires the requesting
parties to use a trusted supplier of unique identifiers from off the ledger.

## List Holding contracts
This endpoint is useful if you need to get specific `Holding` contracts and use them within workflows, such as transfers
or DvP.

### HTTP Request
- URL: `/v1/holdings`
- Method: `POST`
- Content-Type: `application/json`
- Content:

```js
{
  "account": {
    "owner": "Alice::abc123",
    "custodian": "Custodian::abc123",
    "id": {
      "unpack": "1"
    }
  },
  "instrument": {
    "depository": "Depository::abc123",
    "issuer": "Issuer1::abc123",
    "id": {
      "unpack": "Coin1"
    },
    "version": "1"
  }
}
```

### Required permissions
- readAs or actAs permissions for the account owner; or
- readAs or actAs permissions for the account custodian.

### HTTP Response
- Content-Type: `application/json`
- Content:

```js
{
  "holdings": [ // Zero or more Holdings
    {
      "cid": "...",
      "view": { // Interface view of the Daml Finance Holding (Base interface)
        "account": {
          "custodian": "Acme::abc123",
          "owner": "Alice::abc123",
          "id": {
           "unpack": "1"
          }
        },
        "instrument": {
          "depository": "Depository::abc123",
          "issuer": "Issuer1::abc123",
          "id": {
            "unpack": "Coin1"
          },
          "version": "1"
        },
        "amount": "999.0",
        "lock": { // Optional
          "lockers": [
            ["Alice::abc123", {}],
            ["Bob::abc123", {}]
          ],
          "lockType": "Semaphore" // "Semaphore" or "Reentrant"
        }
      },
      "create": { // Optional. When the Holding contract was created.
        "offset": "...",
        "effectiveTime": "2023-01-01T04:30:23.123456Z"
      }
    }
  ]
}
```

Note: only active contracts are returned.

# Building and running

Building/running/testing is only supported on Linux.

## Prerequisites

Please install the following first:

- Daml SDK (https://docs.daml.com/getting-started/installation.html#installing-the-sdk)
- Maven (https://maven.apache.org/install.html)
- sbt (https://www.scala-sbt.org/download.html)
- PostgreSql (https://www.postgresql.org/download)
- Docker (https://docs.docker.com/get-docker/)
- npm (https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Build

Due to a bug in custom views, we need to clone a forked version of the repository until such time that DA release a fix
for this.

    git clone https://github.com/SynfiniDLT/custom-views
    cd custom-views
    git checkout non-root-events-assembly
    sbt 'set test in assembly := {}' clean assembly
    mvn install:install-file \
      -Dfile=target/scala-2.13/custom-views-assembly-LOCAL-SNAPSHOT.jar \
      -DgroupId=com.daml \
      -DartifactId=custom-views_2.13 \
      -Dversion=assembly-LOCAL-SNAPSHOT \
      -Dpackaging=jar \
      -DgeneratePom=true

Change directory back to the root of this repository and download the Daml Finance dependencies:

    ./get-dependencies.sh

This command builds both the API and projection runner as they are currently part of one maven project:

    mvn clean compile

## Run the projection runner

In order to run the projection you need to upload the Daml Finance DAR files to the ledger first. After running the
`get-dependencies.sh`, they can be found here:

- `.lib/daml-finance-interface-account.dar`
- `.lib/daml-finance-interface-holding.dar`
- `.lib/daml-finance-interface-settlement.dar`

Here is an example of how to run on the local Daml sandbox. You can adjust the `--ledger-host` and `--ledger-port` to
point to your participant node. Remove the `--ledger-plaintext` argument if the participant node uses TLS. Mutual TLS
is not supported. PostsgreSQL is the only supported database type.

    mvn exec:java \
      -Dexec.mainClass="com.synfini.wallet.views.projection.ProjectionRunner" \
      -Dexec.args=" \
         --ledger-host localhost \
         --ledger-port 6865 \
         --ledger-plaintext \
         --read-as Alice::abc123 \
         --db-url jdbc:postgresql://localhost/wallet_views \
         --db-user postgres \
         --db-password-file /path/to/password.txt"

The `--read-as` parameter is the party ID that will be used to stream data from the ledger. The database password needs
to be stored in a file, with the file path supplied as the `--db-password-file` option.

To run against an authenticated participant, use the following additional options, which are used to fetch access tokens
from an OAuth 2.0 access token endpoint.

- `--token-audience`: Your OAuth token audience.
- `--token-client-id`: Your OAuth client ID.
- `--token-client-secret-file`: File path to a file containing your client secret.
- `--token-url`: URL of your OAuth access token endpoint.

For more options, run with the `--help` flag.

## Run the API

The API can be configured using `src/main/resources/application.properties`.

Launch the API using the command below. This is an example for running on the local sandbox. The host/port values can
be adjusted as required. The default behaviour is to use TLS to connect to the ledger - i.e. if the default value of
`walletviews.ledger-plaintext` is `false`.

    mvn spring-boot:run \
      -Dspring-boot.run.arguments=" \
        --walletviews.ledger-host=localhost \
        --walletviews.ledger-port=6865 \
        --walletviews.ledger-plaintext=true"

# Running the tests

Testing is not yet automated as part of a build process. These are the steps for running the tests manually.

## Run the API test cases

The tests for the API (and projection runner) can be run using:

    mvn clean compile test

The above command will:

- Start a local Daml sandbox.
- Run the projection runner to project events from the sandbox into a Postgres instance managed by [Test Containers](https://www.testcontainers.org/).
- Test that the API correctly returns data based on what commands have been submitted to the ledger API.
- Tear down the sandbox at the end of the test suite.

## TypeScript client

To build the TypeScript client, run the following:

    cd daml/types
    daml build
    rm -rf ../../typescript-client/daml.js
    daml codegen js .daml/dist/synfini-wallet-views-types-0.0.1.dar -o ../../typescript-client/daml.js
    cd ../../typescript-client
    npm install
    npm run build

## Running the TypeScript test cases

These test cases test the integration between the TypeScript code and the API. This requires you to start the projection
runner, API and Daml sandbox first.

Start the sandbox:

    cd daml/typescript-integration-test
    daml sandbox

In another terminal, from the project root, start a PostgreSQL database with docker compose:

    docker compose up -d db

Drop the `wallet_views` database if it already exists:

    psql -h localhost -p 5432 -U postgres -c 'drop database wallet_views'

Create a new database named `wallet_views` in the Postgres db.

    psql -h localhost -p 5432 -U postgres -c 'create database wallet_views'

Upload the DAR and allocate the parties:

    cd daml/typescript-integration-test
    daml build
    daml ledger upload-dar .daml/dist/synfini-wallet-views-typescript-integration-test-0.0.1.dar
    daml script \
      --dar .daml/dist/synfini-wallet-views-typescript-integration-test-0.0.1.dar \
      --ledger-host localhost \
      --ledger-port 6865 \
      --output-file ../../typescript-client/allocate-parties-output.json \
      --script-name Synfini.Wallet.Api.TypeScriptIntegrationTestSetup:allocateParties

Start the projection process. Note you will need [jq](https://stedolan.github.io/jq/) to run the command below, and it should be run from the
project  root

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

After the projection process is started, run the script to create contracts for testing:

    cd daml/typescript-integration-test
    daml script \
      --dar .daml/dist/synfini-wallet-views-typescript-integration-test-0.0.1.dar \
      --ledger-host localhost \
      --ledger-port 6865 \
      --input-file ../../typescript-client/allocate-parties-output.json \
      --script-name Synfini.Wallet.Api.TypeScriptIntegrationTestSetup:createContracts

From the project root, start the API server

    mvn spring-boot:run \
      -Dspring-boot.run.arguments=" \
        --walletviews.ledger-host=localhost \
        --walletviews.ledger-port=6865 \
        --walletviews.ledger-plaintext=true"

Run the tests:

    cd typescript-client
    npm test