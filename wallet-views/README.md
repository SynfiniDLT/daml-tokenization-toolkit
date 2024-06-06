# Daml Wallet Views

This folder contains an API written in Java Spring Boot. This API provides read-only endpoints for querying the
details of a "Daml wallet", such as account details and balances. The "wallet" refers to assets held by a Daml party,
modelled using [Daml Finance](https://docs.daml.com/daml-finance/index.html). It is not restricted to any particular
type of asset. The only requirement is that the assets implement the Daml Finance interfaces.

## Components overview

### HTTP/JSON API

The API provides read-only endpoints (see below for more detail). It is not strictly a RESTful API, but it uses  HTTP
and requests/responses are in JSON format. The requests and responses are encoded using the
[Daml-lf JSON encoding](https://docs.daml.com/json-api/lf-value-specification.html), which is the same encoding used by
the [Daml JSON API](https://docs.daml.com/json-api/index.html). The API provides a significantly faster way to query
wallet information than would otherwise be possible using only the Daml gRPC or JSON APIs.

### PQS

The Spring Boot API does not send requests directly to the ledger API. Instead, it reads from a PostgreSQL database.
The database is populated using Scribe, an application provided by the Participant Query Store (PQS) product. Please refer to the [PQS documentation](https://docs.daml.com/2.8.3/query/pqs-user-guide.html) for more information. Scribe continuously streams events from the ledger and writes them to the database.

### Javascript client

A client-side library, written in Typescript, is provided which can call the API from the browser or backend application.
This is available under `typescript-client` directory. This provides a strongly-typed interface for interacting with
the API.

### Type definitions

The type definitions of API requests and responses are written as Daml datatypes under `daml/types`. Note - this is just
an internal implementation detail of the project, and this Daml code is not used directly. It is only used as a single
source of truth for the API request/response schemas. As part of the build, the
[Codegen](https://docs.daml.com/tools/codegen.html) is used to generate Java code for the API and Typescript code for
the client. The types are fully compatible with Daml Finance as Daml Finance types/interface definitions are used in
the Daml code.

## Deployment topology

### Current state

In the context of [Canton](https://docs.daml.com/canton/about.html), each participant needs to host their own instance
of the Wallet Views database and API. There is a one-to-one relationship between the database and the participant node,
as it acts as an indexed view of the state of the Daml ledger (visible to the participant) and its transaction history.

![alt text](https://github.com/SynfiniDLT/daml-tokenization-lib/blob/main/wallet-views/diagrams/high-level-architecture.jpg?raw=true)

### Future state

In future, the topology may be changed to use the Daml 3.0 application architecture: Scribe would read
from a separate participant using a party which is an observer of the wallet users' contracts. The wallet users could
still use their own participant for submitting transactions, thereby maintaining a greater level of control over their
assets, while delegating operation of PQS and API to a service provider.

## API Authentication

The API expects a ledger API user access token to be supplied with every request, even if the underlying participant
does not use authentication. The token must be provided through the HTTP header:

`Authorization: Bearer your-token`

The API does not support party-specific tokens. Internally, the API will use this token to get the user rights of the
user from the participant node's UserManagementService. If the request is rejected by the participant with the gRPC
status `UNAUTHENTICATED` or the user does not exist on the participant, then the caller will receive HTTP status 401
Unauthorized.

## API Specification

Before reading this section you should have a working knowledge of the fundamentals of the Daml Finance library (
accounts, holdings, settlement and instruments). Any request fields marked as optional below must still be included in
the JSON request body but with value set to `null` (as opposed to not including the field at all). This is a known issue
due to the usage of the `gson` library for decoding the Daml data types. The necessary conversions from JSON to Daml
types are not natively supported in the Daml java libraries at the time of writing (refer to this
[issue](https://discuss.daml.com/t/java-jsoncodec-how-to-convert-from-jsvalue-to-value/6453)).

The following endpoints are provided the API:

### List Accounts
#### HTTP Request
- URL: `/wallet-views/v1/accounts`
- Method: `POST`
- Content-Type: `application/json`
- Content:

```js
{
  "custodian": "Acme::abc123...", // Only returns accounts which use this custodian - optional
  "owner": "Alice::abc123..." // Only returns accounts owned by this party
}
```

#### Required permissions
- actAs or readAs permissions for the account owner; or
- actAs or readAs permissions for the account custodian if provided.

#### HTTP Response
- Content-Type: `application/json`
- Content:

```js
{
  "accounts": [
    {
      "cid": "abc123...", // Contract ID of the Daml Finance Account
      "view": { // Interface view of the Daml Finance Account
        "custodian": "Acme::abc123...",
        "owner": "Alice::abc123...",
        "id": {
          "unpack": "1"
        },
        "description": "...",
        "holdingFactoryCid": "...",
        "controllers": {
          "outgoing": {
            "map": [
              ["Alice::abc123...", {}],
              ["Bob::abc123...", {}]
            ]
          },
          "incoming": {
            "map": [
              ["Charlie::abc123...", {}],
            ]
          }
        }
      }
    }
  ]
}
```

Note: currently the API only supports returning active `Account`s (no archived `Account`s will be returned).

### List Account OpenOffer Contracts
This endpoint lists account `OpenOffer` contracts as defined in the `account-onboarding` folder at the base of this
repository.

#### HTTP Request
- URL: `/wallet-views/v1/account-open-offers`
- Method: `POST`
- Content-Type: `application/json`
- Content:

```js
{} // No filters are currently implemented
```

#### Required permissions
- N/A (only returns data which is visible to parties that the user has readAs or actAs rights for).

#### HTTP Response
- Content-Type: `application/json`
- Content:

```js
{
  "accountOpenOffers": [ // Zero or more open offers
    {
      "cid": "abc123...", // Contract ID of OpenOffer
      "view": { // Interface view of the OpenOffer
        "custodian": "Acme::abc123...",
        "ownerIncomingControlled": true,
        "ownerOutgoingControlled": false,
        "additionalControllers": {
          "outgoing": {
            "map": [
              ["Alice::abc123...", {}],
              ["Bob::abc123...", {}]
            ]
          },
          "incoming": {
            "map": [
              ["Charlie::abc123...", {}],
            ]
          }
        },
        "permittedOwners": { // Optional
          "map": [
            ["David::abc123...", {}],
          ]
        }, 
        "accountFactoryCid": "abc123...",
        "holdingFactoryCid": "abc123...",
        "description": "..."
      },
      "create": {
        // When the offer was created
        "offset": "...",
        "effectiveTime": "2023-01-01T04:30:23.123456Z"
      }
    }
  ]
}
```

### List account balances
#### HTTP Request
- URL: `/wallet-views/v1/balance`
- Method: `POST`
- Content-Type: `application/json`
- Content:

```js
{
  "account": { // Returns balances for this account
    "owner": "Alice::abc123...",
    "custodian": "Custodian::abc123...",
    "id": {
      "unpack": "1"
    }
  }
}
```

#### Required permissions
- actAs or readAs permissions for the account owner; or
- actAs or readAs permissions for the account custodian.

#### HTTP Response
- Content-Type: `application/json`
- Content:

```js
{
  "balances": [
    {
      "account": {
        "owner": "Alice::abc123...",
        "custodian": "Acme::abc123...",
        "id": {
          "unpack": "1"
        }
      },
      "instrument": {
        "depository": "Depository::abc123...",
        "issuer": "Issuer1::abc123...",
        "id": {
          "unpack": "Coin1"
        },
        "version": "1"
      },
      "unlocked": "999.0", // Sum of holdings which are locked
      "locked": "1.0" // Sum of holdings which are unlocked
    },
    {
      "account": {
        "owner": "Alice::abc123...",
        "custodian": "Acme::abc123...",
        "id": {
          "unpack": "1"
        }
      },
      "instrument": {
        "depository": "Depository::abc123...",
        "issuer": "Issuer2::abc123...",
        "id": {
          "unpack": "Coin2"
        },
        "version": "1"
      },
      "unlocked": "0.0", // Sum of holdings which are locked
      "locked": "1.0" // Sum of holdings which are unlocked
    }
  ]
}
```

### List Settlements
#### HTTP Request
- URL: `/wallet-views/v1/settlements`
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

#### Required permissions
- N/A (only returns data which is visible to parties that the user has readAs or actAs rights for).

#### HTTP Response
- Content-Type: `application/json`
- Content:

```js
{
  "settlements": [ // Zero or more Daml Finance `Batch` settlements
    {
      "execution": { // Ledger offset and ledger time at which the `Batch` was settled - optional
        "offset": "...",
        "effectiveTime": "1970-01-01T00:00:00Z"
      },
      "batchCid": "...", // Optional contract ID of the Batch contract (if the contract is visible to the caller)
      "batchId": {
        "unpack": "batch1"
      },
      "contextId": {
        "unpack": "context1" // Optional context ID of the Batch contract (if the contract is visible to the caller)
      },
      "description": "...", // Optional description of the Batch contract (if the contract is visible to the caller)
      "witness": { // Ledger offset and ledger time at which the caller was first informed of the settlement
        "offset": "...",
        "effectiveTime": "1970-01-01T00:00:00Z"
      },
      "requestors": {
        "map": [
          [
            "Alice::abc123...",
            {}
          ]
        ]
      },
      "settlers": {
        "map": [
          [
            "Bob::abc123...",
            {}
          ]
        ]
      },
      "steps": [ // List of 1 or more steps in the Batch (only those for which the caller can see the Instruction contract)
        {
          "instructionId": {
            "unpack": "0"
          },
          "instructionCid": "...", // Contract ID of the most recently active instruction contract for this instruction ID in the Batch
          "allocation": {
            // One of:
            "tag": "Unallocated",
            "value": {}
            // ... or ...
            "tag": "Pledge",
            "value": "abc123...", // Contract Id of pledged holding
            // ... or ...
            "tag": "CreditReceiver",
            "value": {},
            // ... or ...
            "tag": "SettleOffledger",
            "value": {},
            // ... or ...
            "tag": "PassThroughFrom",
            "value": {
              "_1": { // AccountKey
                "owner": "Alice::abc123...",
                "custodian": "Acme::abc123...",
                "id": {
                  "unpack": "1"
                }
              },
              "_2": { // InstructionKey
                "requestors": {
                  "map": [
                    [
                      "Alice::abc123...",
                      {}
                    ]
                  ]
                },
                "batchId": {
                  "unpack": "batch1"
                },
                "id": {
                  "unpack": "1"
                }
              }
            }
          },
          "approval": {
            // One of:
            "tag": "Unapproved",
            "value": {}
            // ... or ...
            "tag": "TakeDelivery",
            "value": { // AccountKey
              "owner": "Alice::abc123...",
              "custodian": "Acme::abc123...",
              "id": {
                "unpack": "1"
              }
            },
            // ... or ...
            "tag": "DebitSender",
            "value": {},
            // ... or ...
            "tag": "SettleOffledgerAcknowledge",
            "value": {},
            // ... or ...
            "tag": "PassThroughTo",
            "value": {
              "_1": { // AccountKey
                "owner": "Alice::abc123...",
                "custodian": "Acme::abc123...",
                "id": {
                  "unpack": "1"
                }
              },
              "_2": { // InstructionKey
                "requestors": {
                  "map": [
                    [
                      "Alice::abc123...",
                      {}
                    ]
                  ]
                },
                "batchId": {
                  "unpack": "batch1"
                },
                "id": {
                  "unpack": "1"
                }
              }
            }
          },
          "routedStep": {
            "sender": "Charlie::abc123...",
            "receiver": "David::abc123...",
            "custodian": "Custodian::abc123...",
            "quantity": {
              "unit": {
                "depository": "Custodian::abc123...",
                "issuer": "Issuer::abc123...",
                "id": {
                  "unpack": "1"
                },
                "version": "Coin1"
              },
              "amount": "100.0"
            }
          }
        }
      ]
    }
  ]
}
```

The response will include all `Batch`es and `Instruction`es visible to the API caller.

You can use the ledger offset of the last transaction in the list to call the endpoint again, using this value for the
`before` field.

The API response is currently missing an attribute showing if/when the `Batch` was cancelled. This should be added in
future.

The API assumes that the batch key is a unique identifier for each `Batch`, where the batch key is defined as the
combination of batch ID and the set of requesting parties. This applies even for `Batch`es which are already archived
on the ledger. The `Batch`es and `Instruction`es are grouped together by the batch key. This requires the requesting
parties to use a trusted supplier of unique identifiers from off the ledger.

### List Holding Contracts
This endpoint is useful if you need to get specific `Holding` contracts and use them within workflows, such as transfers
or DvP.

#### HTTP Request
- URL: `/wallet-views/v1/holdings`
- Method: `POST`
- Content-Type: `application/json`
- Content:

```js
{
  "account": {
    "owner": "Alice::abc123...",
    "custodian": "Custodian::abc123...",
    "id": {
      "unpack": "1"
    }
  },
  "instrument": {
    "depository": "Depository::abc123...",
    "issuer": "Issuer1::abc123...",
    "id": {
      "unpack": "Coin1"
    },
    "version": "1"
  }
}
```

#### Required permissions
- N/A (only returns data which is visible to parties that the user has readAs or actAs rights for).

#### HTTP Response
- Content-Type: `application/json`
- Content:

```js
{
  "result": [ // Zero or more Holdings
    {
      "cid": "abc123...", // Contract ID of the Holding
      "view": { // Interface view of the Daml Finance Holding (Base interface)
        "account": {
          "custodian": "Acme::abc123...",
          "owner": "Alice::abc123...",
          "id": {
           "unpack": "1"
          }
        },
        "instrument": {
          "depository": "Depository::abc123...",
          "issuer": "Issuer1::abc123...",
          "id": {
            "unpack": "Coin1"
          },
          "version": "1"
        },
        "amount": "999.0",
        "lock": { // Optional
          "lockers": {
            "map": [
              ["Alice::abc123...", {}],
              ["Bob::abc123...", {}]
            ]
          },
          "lockType": "Semaphore" // "Semaphore" or "Reentrant"
        }
      },
      "create": {
        // When the Holding contract was created - optional (present if contract was created after the projection runner
        // first started)
        "offset": "...",
        "effectiveTime": "2023-01-01T04:30:23.123456Z"
      }
    }
  ]
}
```

Note: only active contracts are returned.

### List Instruments

#### HTTP Request
- URL: `/wallet-views/v1/instruments`
- Method: `POST`
- Content-Type: `application/json`
- Content:

```js
{
  "depository": "Depository1::abc123...", // Instrument depository - optional
  "issuer": "Issuer::abc123...", // Instrument issuer
  "id": { // Instrument ID - optional
    "unpack": "Coin1"
  },
  "version": "1" // Instrument version - optional
}
```

#### Required permissions
- N/A (only returns data which is visible to parties that the user has readAs or actAs rights for).

#### HTTP Response
- Content-Type: `application/json`
- Content:

```js
{
  "result": [ // Zero or more Instruments
    {
      "cid": "abc123...", // Contract ID of the Instrument
      "tokenView": { // Interface view of the Instrument if it is a Token Instrument
        "instrument": {
          "depository": "Depository::abc123...",
          "issuer": "Issuer1::abc123...",
          "id": {
            "unpack": "Coin1"
          },
          "version": "1"
        },
        "description": "...",
        "validAsOf": "2023-01-01T04:30:23.123456Z"
      },
      "pbaView": {
        // Interface view of the Instrument if it is a PartyBoundAttributes Instrument (defined in `pbt` folder in the
        // base of this repository)
        "instrument": {
          "depository": "Depository::abc123...",
          "issuer": "Issuer1::abc123...",
          "id": {
            "unpack": "Coin1"
          },
          "version": "1"
        },
        "description": "...",
        "validAsOf": "2023-01-01T04:30:23.123456Z",
        "owner": "Alice::abc123...",
        "attributes": [
          ["k1", "v1"],
          ["k2", "v2"]
        ]
      }
    }
  ]
}
```

### List Issuers
List `Issuer` contracts as defined in the `issuer-onboarding` folder at the base of this repository.

#### HTTP Request
- URL: `/wallet-views/v1/issuers`
- Method: `POST`
- Content-Type: `application/json`
- Content:

```js
{
  "depository": "Depository1::abc123...", // Optional
  "issuer": "Issuer::abc123...", // Optional
}
```

#### Required permissions
- N/A (only returns data which is visible to parties that the user has readAs or actAs rights for).

#### HTTP Response
- Content-Type: `application/json`
- Content:

```js
{
  "result": [ // Zero or more Issuers
    {
      "token": { // Details of Token issuer (optional as other issuer types may be added in future e.g. Bond Issuer)
        "cid": "abc123...", // Contract ID of the Token Issuer
        "view": {
          "depository": "Depository1::abc123...",
          "issuer": "Issuer::abc123...",
          "instrumentFactoryCid": "abc123..."
        }
      }
    }
  ]
}
```

## Building and running

Building/running/testing is only supported on Linux.

### Prerequisites

Please install the following first:

- Daml SDK (https://docs.daml.com/getting-started/installation.html#installing-the-sdk)
- Maven (https://maven.apache.org/install.html)
- sbt (https://www.scala-sbt.org/download.html)
- PostgreSql (https://www.postgresql.org/download)
- Docker (https://docs.docker.com/get-docker/)
- npm (https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

### Build

Install the custom views library by running:

```
make install-custom-views
```

from the base of this repository.

Then the API and projection runner can be compiled using:

```
make compile-wallet-views
```

The above command will download and build all required dependencies. Do not try to compile without using `make` as these
dependencies may not be updated.

To build an executable JAR:

```
make build-wallet-views
```

The TypeScript client can be built using:

```
make build-wallet-views-ts-client
```

### Run Scribe

#### 1. Upload required Daml packages

In order to run Scribe you need to upload the required DAR files to the ledger first. You can either use the
`dops` CLI tool (refer to `operations` folder in the base of this repository) as follows:

```bash
# Make sure to export required environment variables to connect to your participant before running `dops` (see
# the documentation for more detail)
dops upload-dar
```

or you can directly upload the DAR file found at `.build/synfini-wallet-views-types.dar` using the `daml` assistant
or ledger API. This DAR file is automatically built by `make compile-wallet-views` or `make build-wallet-views`.

#### 2. (Optional) Allocate parties for streaming data

You may want to allocate one or more parties on the participant which will be used to stream all required contracts from
the ledger. This party or parties will need to be a stakeholder on the desired contracts. Filtering data by party this
way can be useful to reduce the amount of data stored in the DB. If, in the future we migrate to a Daml 3.0 architecture,
then this streaming party/parties can be allocated on a separate participant. Alternatively, you can stream data for
all parties on your participant.

#### 3. Setup a Postgres database

Create a Postgres database. Currently only Postgres version 16 has been tested.

#### 4. Setup the utility functions

There are several utility PSQL functions that are used by the API. You need to deploy these by executing the provided
file `wallet-views/java/src/main/resources/db/functions.sql`.

#### 5. Start scribe

The Scribe process (long-running) must be started. The following positional arguments must be provided:

```bash
./scribe.jar pipeline ledger postgres-document
```

Note: the data source must be set to `TransactionStream` (the default). You may need to add other CLI options to connect
to your participant and database. Please consult the PQS manual for more information. You will need to set the
`--pipeline-filter-parties` option if you allocated specific parties for streaming data.

### Run the application

Create an `application.properties` file by copying the example from `src/main/resources/application.properties`. The
following properties can be modified as required but the others should not be altered:

| Property | Description |
| ------------- | ------------- |
| `spring.datasource.url` | JDBC URL of the Postgres database |
| `spring.datasource.username` | Username used to write the data from the ledger into Postgres database. Also used to create the database schema if required. |
| `spring.datasource.password` | Password of the above Postgres user |
| `walletviews.ledger-host` | Host of the participant node's gRPC API |
| `walletviews.ledger-port` | Port of the participant node's gRPC API |
| `walletviews.ledger-plaintext` | Use `true` for plaintext connections to the participant node's gRPC API, otherwise TLS will be used |
| `walletviews.max-transactions-response-size` | Maximum number of batch settlements the API will return in a single response when no limit is provided in the request |

Next, run `make build-wallet-views`. This will generate a JAR file under the `wallet-views/java/target` directory. You
can launch the API by running

```
java \
  -jar wallet-views/java/target/wallet-views-<version>.jar \
  --spring.config.name=application \
  --spring.config.location=file:<directory containing application.properties>
```

This will start the API on port 8080 running over a plaintext connection. TLS support is not currently implemented.

## Running the tests

### API tests

To run functional test cases on the API, make sure you export an the `SCRIBE_LOCATION` environment variable to point
to where you have installed the Scribe JAR file. Then run the below command:

```
make test-wallet-views
```

This will:

- Start a local Daml sandbox on an available port.
- Run Scribe to stream events from the sandbox into a Postgres instance managed by [Test Containers](https://www.testcontainers.org/).
- Test that the API correctly returns data based on what commands have been submitted to the ledger API.
- Tear down the sandbox and wallet views application at the end of the test suite.

Note: in future the JAR file should be replaced by a containerized version of Scribe.

To run specific test cases for the wallet backend, you need to export an enviroment variable for this:

```bash
export TEST_WALLET_VIEWS_ARGS="-Dtest=IntegrationTest#yourTestMethod"
make test-wallet-views
```

The test cases have configurable timeouts for waiting for the sandbox and scribe components to start. They can be set as
follows:

```bash
export TEST_WALLET_VIEWS_ARGS="-Dwalletviews.test.sandbox-start-timeout-seconds=60 -Dwalletviews.test.scribe-start-timeout-seconds=30"
make test-wallet-views
```

### TypeScript client tests

There is a set of integration tests for the TypeScript client. They can be run using:

```
make test-wallet-views-ts-client
```

This will:

- Start a local Daml sandbox on an available port.
- Run PQS (Scribe) to write events from the sandbox into a Postgres instance created using `docker compose` on
an available port. The compose file can be found under `wallet-views/java`.
- Perform basic tests to make sure the TypeScript client can retrieve data from the API.
- Tear down the sandbox and wallet views application at the end of the test suite.
- Stop the Postgres docker container.
