# Operational Scripts for Wallet Applications

This folder contains a set of Daml Scripts and a command line tool to invoke them. The scripts are designed for various
operational activites such as party setup, creation of factory contracts, account creation and settlement.

## Installation

The entrypoint for using the scripts is the `dops` CLI. It uses the `daml` assistant to run the scripts so make sure to
install the Daml SDK first. To install `dops`, run the command below from the base of this repository:

```bash
make install-operations
```

You will also need to add `dops` to your `PATH`, for example:

```bash
echo 'export DOPS_HOME=~/.dops' >> ~/.bashrc
echo 'export PATH=$PATH:$DOPS_HOME/bin' >> ~/.bashrc
source ~/.bashrc
```

## Configuration

Whenever you run `dops` you need to specify how to connect to the participant node. This must be done by exporting these
environment variables:

| Variable name  | Description | Default value |
| ------------- | ------------- | ------------- |
| LEDGER_HOST | Participant node host | N/A |
| LEDGER_PORT | Participant node host port | N/A |
| LEDGER_PLAINTEXT | If set to `true` then a plain text connection will be used to connect to the participant, otherwise TLS will be used | `false` |
| LEDGER_AUTH_ENABLED | If set to `true` then `dops` will fetch a token from the configured OAuth token endpoint and use it for authentication with the participant | `true` |
| ACCESS_TOKEN_URL | OAuth token endpoint (required if `LEDGER_AUTH_ENABLED` is `true`) | N/A |
| ACCESS_TOKEN_CLIENT_ID | OAuth client ID (required if `LEDGER_AUTH_ENABLED` is `true`) | N/A |
| ACCESS_TOKEN_CLIENT_SECRET | OAuth client secret (required if `LEDGER_AUTH_ENABLED` is `true`) | N/A |
| ACCESS_TOKEN_AUDIENCE | OAuth audience (required if `LEDGER_AUTH_ENABLED` is `true`) | N/A |

Note: only `LEDGER_HOST` and `LEDGER_PORT` are mandatory, but you will most likely need to set the other variables.

If authentication is enabled using the above variables, then the access tokens are cached by saving them to file(s)
under the `.dops` directory. The file name is based on the client ID. If you switch between different client IDs then
multiple files will be created. `dops` will automatically fetch a fresh token if the cached token is about to expire.

## Basic usage

Before running any `dops` commands, the required packages must be uploaded to the ledger. `dops` includes all of its
necessary Daml packages. You can upload all of them to your participant by running:

```bash
dops upload-dar
```

Note: for a multi-participant setup, this step must be repeated for the other participants.

Most `dops` commands requrie an input JSON file. For example, to allocate parties to the participant, a JSON file such
as this needs to be created:

```json
{
  "partySettings": [
    {
      "label": "alice",
      "displayName": "Alice",
      "partyIdHint": "alice"
    },
    {
      "label": "bob",
      "displayName": "Bob",
      "partyIdHint": "bob"
    }
  ]
}
```

We would then allocate them by running:

```bash
dops allocate-parties <path to JSON file>
```

The `dops` tool will automatically create a directory which it uses to cache party IDs. The cached identifiers are
stored with a human-readable label. As such, the above command will generate a file in the current directory at
`.dops/parties.json`. You can then refer to the parties by their labels, rather than their party IDs in other JSON
files.

Contract IDs are also cached. For example, in order to setup an `Account` for Bob with Alice as custodian, we need to
first create a `Holding` factory for the assets in the `Account`. The input file would look like this for creating a
factory for `Fungible` `Holding`s, provided by Alice and visible to Bob:

```json
{
  "holdingFactorySettings": [
    {
      "label": "defaultFungibleV1",
      "holdingType": "Fungible",
      "provider": "alice",
      "observers": [
        {
          "context": "creation",
          "parties": ["bob"]
        }
      ]
    }
  ]
}
```

and we can create the holding factory by running:

```bash
dops create-holding-factories <path to JSON file>
```

The value of `provider` and the observer parties above must be equal to the labels defined in the parties JSON file.

We also need to create the `Account` factory to be able to create the `Account` instance. Similiar to above, another
JSON file is needed:

```json
{
  "accountFactorySettings": [
    {
      "label": "defaultV1",
      "provider": "alice",
      "observers": [
        {
          "context": "creation",
          "parties": ["Bob"]
        }
      ]
    }
  ]
}
```

which can be used to create the `Account` factory by running:

```bash
dops create-account-factories <path to JSON file>
```

The contract IDs of the factories will be saved with their labels under the `.dops` directory. Finally, we can use them
to create the `Account`s. The tool supports both a propose-accept worklow and also a unilateral method to do this. For
simplicity, this is example will show the unilateral way. It assumes we are able to act as both the custodian and owner
in a single command. This can be useful for testing on a single participant. For example, to create one `Account` for
Bob, use this JSON file:

```json
{
  "readAs": [],
  "accountFactory": "defaultV1",
  "accountSettings": [
    {
      "owner": "bob",
      "custodian": "alice",
      "id": "001",
      "description": "Bob's account",
      "incomingControllers": [],
      "outgoingControllers": ["bob"],
      "holdingFactory": "defaultFungibleV1",
      "observers": []
    }
  ]
}
```

and create the contract using:

```bash
dops create-accounts-unilateral <path to JSON file>
```

The values of `accountFactory` and `holdingFactory` above must be equal to the labels that were defined in the input
JSON files for the factories.

## Command specifications

Please note: the example JSON snippets use comments for explanation but only standard JSON files (without comments) are
accepted by `dops`.

### Party and Package Setup
#### Upload Daml Packages

This command will upload the required Daml Finance interfaces, (default) implementations as well as all of the
packages defined in this repository.

##### Input File Format

N/A. No input file is needed.

##### Command

```bash
dops upload-dar
```

---
#### Allocate parties

Allocate parties on the participant node.

##### Input File Format

```js
{
  "partySettings": [ // One or more parties to allocate
    {
      "label": "alice", // Label of the party which can referenced in other input files
      "displayName": "Alice", // Party display name
      "partyIdHint": "alice" // Hint to determine party ID - optional - uses randomly generated party ID if not provided
    }
  ]
}
```

##### Command

```bash
dops allocate-parties <path to JSON file>
```

---
#### Create users

Create users on the participant node using the User Management Service.

##### Input File Format

```js
{
  "users": [ // One or more users to create
    {
      "userId": "abc123...", // Unique user ID
      "primaryParty": "alice", // Label of primary party - optional
      "actAs": ["alice"], // Zero or more labels of the parties which the user can act as
      "readAs": ["investor"] // Zero or more labels of the parties which the user can read as
    }
  ]
}
```

##### Command

```bash
dops create-users <path to JSON file>
```

---
### Factory and RouteProvider Setup
#### Create Account Factories

Create factory contracts for creating `Account`s. The only factory implementation currently supported is the default
provided in the Daml Finance library.

##### Input File Format

```js
{
  "accountFactorySettings": [ // One or more factories to create
    {
      "label": "label1",
      "provider": "alice", // Label of the factory provider party
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-account-factories <path to JSON file>
```

---
#### Create Account OpenOffer Factories

Create factory contracts for creating `Account` `OpenOffer`s. Please refer to the factory interfaces and templates which
are defined [here](/models/account-onboarding).

##### Input File Format

```js
{
  "accountOpenOfferFactorySettings": [ // One or more factories to create
    {
      "label": "label1",
      "provider": "alice", // Label of the factory provider party
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-account-open-offer-factories <path to JSON file>
```

---
#### Create Holding Factories

Create factory contracts for creating `Holding`s.

##### Input File Format

```js
{
  "holdingFactorySettings": [ // One or more factories to create
    {
      "label": "label1",
      "holdingType": "Fungible", // One of: "Fungible", "NonFungible" or "NonTransferable"
      "provider": "alice", // Label of the factory provider party
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ],
      "holdingTrackers": ["WalletOperator"] // Optional labels of one or more tracking parties of Holdings created using
      // this factory. If provided, then the implementation used is from the `trackable-holding` folder in this
      // repository. Otherwise, the default implementation from Daml Finance is used.
    }
  ]
}
```

##### Command

```bash
dops create-holding-factories <path to JSON file>
```

---
#### Create Settlement Factories

Create factory contracts for instructing `Batch` settlements.

##### Input File Format

```js
{
  "settlementFactorySettings": [ // One or more factories to create
    {
      "label": "label1",
      "provider": "alice", // Label of the factory provider party
      "observers": ["bob"], // Zero or more labels of the observers of the factory
      "settlementTrackers": ["WalletOperator"] // Optional labels of one or more tracking parties of settlements
      // instructed using this factory. If provided, then the implementation used is from the `trackable-settlement`
      // folder in this repository. Otherwise, the default implementation from Daml Finance is used.
    }
  ]
}
```

##### Command

```bash
dops create-settlement-factories <path to JSON file>
```

---
#### Create Settlement OneTimeOffer Factories

Create factory contracts for creating settlement `OneTimeOffer`s. Please refer to the factory interfaces and templates which
are defined [here](/models/settlement).

##### Input File Format

```js
{
  "settlementOneTimeOfferFactorySettings": [ // One or more factories to create
    {
      "label": "label1",
      "provider": "alice", // Label of the factory provider party
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-settlement-one-time-offer-factories <path to JSON file>
```

---
#### Create Settlement OpenOffer Factories

Create factory contracts for creating settlement `OpenOffer`s. Please refer to the factory interfaces and templates which
are defined [here](/models/settlement).

##### Input File Format

```js
{
  "settlementOpenOfferFactorySettings": [ // One or more factories to create
    {
      "label": "label1",
      "provider": "alice", // Label of the factory provider party
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-settlement-open-offer-factories <path to JSON file>
```

---
#### Create Instrument Factories

Create factory contracts for creating `Instrument`s. Please refer to the factory interfaces and templates which
are defined [here](/models/issuer-onboarding).

##### Input File Format

```js
{
  "instrumentFactorySettings": [ // One or more factories to create
    {
      "label": "label1",
      "provider": "alice", // Label of the factory provider party
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ],
      "instrumentType": "Token" // Currently this must be set to "Token". Only the token instrument type is supported
        // but other instrument types may be added in future e.g. bonds, options etc.
    }
  ]
}
```

##### Command

```bash
dops create-instrument-factories <path to JSON file>
```

---
#### Create Instrument Metadata Factories

Create factory contracts for creating `Metadata`s. Please refer to the factory interfaces and templates which
are defined [here](/models/instrument-metadata).

##### Input File Format

```js
{
  "instrumentMetadataFactorySettings": [ // One or more factories to create
    {
      "label": "label1",
      "provider": "alice", // Label of the factory provider party
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-instrument-metadata-factories <path to JSON file>
```

---
#### Create Instrument Metadata Publisher Factories

Create factory contracts for creating `Publisher`s of `Metadata`. Please refer to the factory interfaces and templates
which are defined [here](/models/issuer-onboarding).

##### Input File Format

```js
{
  "instrumentMetadataPublisherFactorySettings": [ // One or more factories to create
    {
      "label": "label1",
      "provider": "alice", // Label of the factory provider party
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-instrument-metadata-factories <path to JSON file>
```

---
#### Create Issuer Factories

Create factory contracts for creating `Issuers`s. Please refer to the factory interfaces and templates which are defined
[here](/models/issuer-onboarding).

##### Input File Format

```js
{
  "issuerFactorySettings": [ // One or more factories to create
    {
      "label": "label1",
      "provider": "alice", // Label of the factory provider party
      "instrumentType": "Token", // Type of instrument the issuer factory is for. "Token" is the only type that is
        // currently supported
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-issuer-factories <path to JSON file>
```

---
#### Create MinterBurner Factories

Create factory contracts for creating `MinterBurner`s. Please refer to the factory interfaces and templates which are
defined [here](/models/issuer-onboarding).

##### Input File Format

```js
{
  "minterBurnerFactorySettings": [ // One or more factories to create
    {
      "label": "label1",
      "provider": "alice", // Label of the factory provider party
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-minter-burner-factories <path to JSON file>
```

---
#### Create Route Providers

Create `RouteProvider` instances. The only type of `RouteProvider` supported is `SingleCustodian` from the Daml Finance
library.

##### Input File Format

```js
{
  "routeProviderSettings": [ // One or more RouteProviders to create
    {
      "label": "label1",
      "provider": "alice", // Label of the factory provider party
      "observers": ["bob"], // Zero or more labels of the observers of the RouteProvider
      "singleCustodian": "charlie" // Label of the single custodian party through which paths will be routed
    }
  ]
}
```

##### Command

```bash
dops create-route-providers <path to JSON file>
```

---
### Account Setup
#### Create Accounts Unilaterally

Create `Account` contracts using a single command submission, acting as both custodian and owner.

##### Input File Format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "accountFactory": "label1", // Label of account factory used to create the Account instance
  "accountSettings": [ // One or more accounts to create
    {
      "owner": "bob", // Label of the owner party
      "custodian": "alice", // Label of the custodian party
      "id": "abc123...", // Account ID
      "description": "Bob's account", // Account description
      "incomingControllers": ["bob"], // Zero or more labels of the incoming controller parties of the account
      "outgoingControllers": ["bob"], // One or more labels of the outgoing controller parties of the account
      "holdingFactory": "label1", // Label of the Holding Factory for the account
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-accounts-unilateral <path to JSON file>
```

---
#### Create Account OpenOffers

As a custodian, create `OpenOffer` contracts to allow parties to create accounts. Please refer to the interfaces and
templates which are defined [here](/models/account-onboarding).

##### Input File Format

```js
{
  "offerSettings": [ // One or more offers to create
    {
      "label": "label1",
      "custodian": "alice", // Label of the custodian party which will create the offer
      "additionalIncomingControllers": ["charlie"], // Zero or more labels of additional incoming controller parties
      "additionalOutgoingControllers": ["charlie"], // Zero or more labels of additional outgoing controller parties
      "ownerIncomingControlled": false,
      "ownerOutgoingControlled": true,
      "accountFactory": "label1", // Label of the factory used to create Account instances
      "holdingFactory": "label1", // Label of the Holding factory on the Accounts
      "description": "abc123...",
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ],
      "accountOpenOfferFactory": "label1" // Label of the factory used to create the offer
    }
  ]
}
```

##### Command

```bash
dops create-account-open-offers <path to JSON file>
```

---
#### Take Account OpenOffers

As an account owner, take up an `Account` `OpenOffer` to create an `Account`. Please refer to the interfaces and
templates which are defined [here](/models/account-onboarding).

##### Input File Format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "accountSettings": [ // One or more accounts to create
    {
      "offer": "label1", // Label of the account open offer to take
      "owner": "bob", // Label of the party who will take the offer to become the owner of the account
      "id": "abc123...", // Account ID
      "description": "abc123...",
      "observers": [ // Zero or more sets of observers
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops take-account-open-offers <path to JSON file>
```

---
### Settlement
#### Create OpenOffers for Settlement

Create settlement `OpenOffer`s. Please refer to the interfaces and templates which are defined
[here](/models/settlement).

A party involved in the proposed settlement is captured using the following JSON structure:

```js
 // Either:
{"party": "alice"}, // Label of the party
// ... or ...
{"taker": {}} // A party which will be set to the taker party when the `Accept` choice is exercised. The
// empty JSON `{}` is required
```

We refer to the above format as a "settlement party" in the documentation below.

##### Input File Format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "settlementOpenOfferSettings": [
    {
      "offerId": "abc123...", // Offer ID
      "offerers": ["alice"], // Labels of one or more parties which authorise the offer creation
      "offerDescription": "abc123...",
      "settlementInstructors": [ // One or more settlement parties who will authorise the settlement instruction
        {"party": "alice"},
        {"taker": {}}
      ],
      "settlers": [{"party": "alice"}], // One or more settlement parties who will have authorisation to settle
      "permittedTakers": ["bob"] // Labels of one or more parties that are permitted to the take the offer
        // (if not provided any contract stakeholder can take the offer) - optional
      "steps": [
        // One or more settlement steps, each of which define a movement of a quantity of an asset between two parties
        {
          "sender": {"party": "bob"}, // Sender settlement party
          "receiver": {"taker": {}}, // Receiver settlement party
          "instrumentDepository": "charlie", // Label of the depository party of the asset
          "instrumentIssuer": "david", // Label of the issuer party of the asset
          "instrumentId": "abc123...",
          "instrumentVersion": "abc123..",
          "amount": 1
        }
      ],
      "minQuantity": 99.99999, // Minimum quantity that can be specified by the taker - optional
      "maxQuantity": 99.99999, // Maximum quantity that can be specified by the taker - optional
      "increment": 0.000001, // Quantity specified by the taker must be a multiple of this value if provided - optional 
      "settlementOpenOfferFactory": "label1", // Label of the settlement OpenOffer factory
      "routeProvider": "label1", // Label of the RouteProvider used to route the steps through custodian(s)
      "settlementFactory": "label1", // Label of the settlement factory
      "observers" : [ // Zero or more sets of observers of the OpenOffer
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["charlie"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-settlement-open-offers <path to JSON file>
```

---
#### Take an OpenOffer for Settlement

Take a settlement `OpenOffer` to generate the settlement instructions. This command will do a scan of the Active
Contract Set to find an `OpenOffer` with matching `offerId` and `offerers`.

##### Input File Format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "takeOpenOfferSettings": {
    "taker": "bob", // Label of the party to take the offer
  }
}
```

##### Command

The second argument is a comma-delimited list of the labels of the parties which authorised offer. The third argument is
the offer ID and the fourth argument is the batch ID of the settlement instructions that will be generated. The batch
ID should be a unique, randomly generated value. The final two arguments are the unit quantity specified and transaction
reference chosen by the taker.

```bash
dops take-settlement-open-offer <path to JSON file> <offerer1>,<offerer2>...<offererN> <offer ID> <Batch ID> <quantity> <reference>
```

For example, for an offer authorised by parties labeled "alice" and "bob", having ID "offer1":

```bash
dops take-settlement-open-offer take-offer.json alice,bob offer1 abc123 10 lorem
```

Note: the reference value cannot contain whitespace characters due to a bug in the implementation.

---
#### Create OneTimeOffers for Settlement

Create settlement `OneTimeOffer`s. Please refer to the interfaces and templates which are defined
[here](/models/settlement).

##### Input File Format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "settlementOneTimeOfferSettings": [
    {
      "offerId": "abc123...", // Offer ID (this must be a unique value)
      "offerers": ["alice"], // Labels of one or more parties which authorise the offer creation
      "offerDescription": "abc123...",
      "settlementInstructors": [ // Labels of one or more parties who will authorise the settlement instruction
        "alice",
        "bob"
      ],
      "settlers": ["alice"], // Labels of one or more parties who will have authorisation to settle
      "steps": [
        // One or more settlement steps, each of which define a movement of a quantity of an asset between two parties
        {
          "sender": "bob", // Label of the sender party
          "receiver": "alice", // Label of the receiving party
          "instrumentDepository": "charlie", // Label of the depository party of the asset
          "instrumentIssuer": "david", // Label of the issuer party of the asset
          "instrumentId": "abc123...",
          "instrumentVersion": "abc123..",
          "amount": 1
        }
      ],
      "minQuantity": 99.99999, // Minimum quantity that can be specified by the taker - optional
      "maxQuantity": 99.99999, // Maximum quantity that can be specified by the taker - optional
      "increment": 0.000001, // Quantity specified by the taker must be a multiple of this value if provided - optional 
      "settlementOneTimeOfferFactory": "label1", // Label of the settlement OneTimeOffer factory
      "routeProvider": "label1", // Label of the RouteProvider used to route the steps through custodian(s)
      "settlementFactory": "label1", // Label of the settlement factory
      "observers" : [ // Zero or more sets of observers of the OpenOffer
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["charlie"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-settlement-one-time-offers <path to JSON file>
```

---
#### Accept a OneTimeOffer for Settlement

Accept a settlement `OneTimeOffer` and generate the settlement instructions. This command will do a scan of the Active
Contract Set to find a `OneTimeOffer` with matching `offerId` and `offerers`.

##### Input File Format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "acceptOneTimeOfferSettings": {
    "acceptor": "bob", // Label of the party which will accept the offer
  }
}
```

##### Command

The second argument is a comma-delimited list of the labels of the parties which authorised offer. The third argument is
the offer ID. The final two arguments are the unit quantity specified and transaction reference chosen by the taker.

```bash
dops accept-settlement-one-time-offer <path to JSON file> <offerer1>,<offerer2>...<offererN> <offer ID> <quantity> <reference>
```

For example, for an offer authorised by parties labeled "alice" and "bob", having ID "offer1":

```bash
dops accept-settlement-one-time-offer accept-offer.json alice,bob offer1 10 lorem
```

Note: the reference value cannot contain whitespace characters due to a bug in the implementation.

---
#### Accept Settlement Instructions

Accept pending settlement `Instruction`s in a `Batch` by allocating and/or approving them.

##### Input File Format

The input file specifies the settlement preferences of the accepting party e.g. their preferred account(s) to take
delivery.

```js
{
  "acceptSettlementSettings": {
    "acceptor": "bob", // Label of the accepting party
    "settlementPreferences": [
      // One or more preferences. Given an `Instruction` contract, the settlement preferences are evaluated from the
      // first to last element in this array, until a matching prefence is found for the `Instruction` or otherwise
      // no allocation or approval is applied
      {
        "custodian": "alice", // Label of the custodian party. Only matches `Instruction`s which use this custodian
        "depository": "bob", // Label of the depository party - optional. If provided, only matches `Instruction`s
          // which use an instrument at this depository
        "issuer": "charlie", // Label of the issuer party - optional. If provided, only matches `Instruction`s which use
          // an instrument issued by this issuer
        "accountId": "abc123..." // If the `Instruction` matches this preference, then this account will be used to
          // take delivery, pledge Holdings from or pass assets to/from in the case of a pass-through chain. Optional.
        "minterBurner": true // Optional boolean flag (defaults to `false` if not provided). If `true` and the `issuer`
          // is the `acceptor`, then on a matching `Instruction` it will use the issuer's `MinterBurner` contract to
          // allocate and/or approve the `Instruction`
        "settleOffLedger": true // Optional boolean flag (defaults to `false` if not provided). If `true` then it will
          // use the settle off-ledger allocation and/or approval.
      }
    ]
  }
}
```

##### Command

The second argument is a comma-delimited list of the labels of the parties which instructed the settlement. The third
argument is the Batch ID. This command will do a scan of the Active Contract Set to find `Instruction`s with matching
Batch ID and instructors.

```bash
dops accept-settlement <path to JSON file> <instructor1>,<instructor2>...<instructorN> <Batch ID>
```

For example, for a settlement instructed by parties labeled "alice" and "bob", having Batch ID "abc123":

```bash
dops accept-settlement preferences.json alice,bob abc123
```

---
#### Execute a Batch Settlement

Execute (settle) a `Batch`.

##### Input File Format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "settleSettings": {
    "settler": "alice" // Label of the party which will settle the `Batch`
  }
}
```

##### Command

The second argument is a comma-delimited list of the labels of the parties which instructed the settlement. The third
argument is the Batch ID.

```bash
dops execute-settlement <path to JSON file> <instructor1>,<instructor2>...<instructorN> <Batch ID>
```

For example, for a settlement instructed by parties labeled "alice" and "bob", having Batch ID "abc123":

```bash
dops execute-settlement preferences.json alice,bob abc123
```

---

### Issuer Setup

Refer to this [folder](/models/issuer-onboarding) for more information on the interfaces and templates used in this
section.

#### Create Issuer Contracts

Acting as a depository, create `Issuer` contracts to allow issuers to create new instruments and associated metadata.

##### Input File Format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "issuerSettings": [ // One or more `Issuer`s to create
    {
      "issuer": "alice", // Label of the issuer party
      "depository": "bob", // Label of the depository party
      "instruments": [ // Configuration of one or more instrument types the issuer will be authorised to create
        {
          "label": "label1", // Label which can be used to refer to this `Issuer` contract in other files
          "issuerFactory" : "label1",  // Label of the factory to use to create the `Issuer`
          "instrumentFactory" : "label1", // Label of the instrument factory of the `Issuer`
          "instrumentType": "Token" // Type of instrument the issuer factory is for. "Token" is the only type that is
            // currently supported
        }
      ],
      "publisher": { // Optional settings, which if provided, allow the issuer to publish metadata for their instruments
        "label": "label1", // Label which can be used to refer to this `Publisher` contract in other files
        "publisherFactory": "label1", // Label of the factory to use to create the `Publisher`
        "metadataFactory": "label1" // Label of the factory that the issuer will be able to use to create `Metadata`
      },
      "observers" : [ // Zero or more sets of observers of the `Issuer`(and `Publisher` if the issuer is provided one)
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["charlie"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-issuers <path to JSON file>
```

---

#### Create MinterBurner Contracts

Acting as a custodian, create `MinterBurner` contracts to allow issuers to mint/burn `Holding`s.

##### Input File Format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "minterBurnerSettings": [ // One or more `MinterBurner`s to create
    {
      "minterBurnerFactory": "label1", // Label of the factory to create the `MinterBurner`
      "custodian": "alice", // Label of the custodian party
      "depository": "bob", // Label of the depository party
      "issuer": "charlie", // Label of the issuer party
      "observers" : [ // Zero or more sets of observers of the `MinterBurner`
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["david"] // One or more labels of the observer parties
        }
      ]
    }
  ]
}
```

##### Command

```bash
dops create-minter-burners <path to JSON file>
```

## Additional Daml Script Options

It is possible to pass additional options to the `daml` assistant which is used by `dops`. This can be passed in after
the `dops` arguments. For example:

```bash
dops execute-settlement preferences.json alice,bob abc123 --application-id MyApp
```

The only parameters that cannot be added are ledger host and port, the `--tls` flag  and `--access-token-file`.

## Importing Other Party or Contract IDs

Currently, there are no commands to allow for storing additional party or contract IDs in the `dops` cache. An example
usecase would be to reference a party on a participant which belongs to a different organisation that you want to do a
workflow with. The workaround for this is to manually edit the JSON files under the `.dops` directory.
