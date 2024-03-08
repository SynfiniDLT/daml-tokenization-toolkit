# Operational Scripts for Daml Finance and Wallet Applications

This folder contains a set of Daml Scripts and a command line tool to invoke them. The scripts are designed for various
operational activites such as party setup, creation of factory contracts and account creation.

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
| LEDGER_AUTH_ENABLED | If set to `true` then the `dops` will fetch a token from the configured OAuth token endpoint and use it for authentication with the participant | `true` |
| ACCESS_TOKEN_URL | OAuth token endpoint (required if `LEDGER_AUTH_ENABLED` is `true`) | N/A |
| ACCESS_TOKEN_CLIENT_ID | OAuth client ID (required if `LEDGER_AUTH_ENABLED` is `true`) | N/A |
| ACCESS_TOKEN_CLIENT_SECRET | OAuth client secret (required if `LEDGER_AUTH_ENABLED` is `true`) | N/A |
| ACCESS_TOKEN_AUDIENCE | OAuth audience (required if `LEDGER_AUTH_ENABLED` is `true`) | N/A |

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

##### Input file format

N/A. No input file is needed.

##### Command

```bash
dops upload-dar
```

---
#### Allocate parties

Allocate parties on the participant node.

##### Input file format

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

##### Input file format

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

##### Input file format

```js
{
  "accountFactorySettings": [ // One or more Account factories to create
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

Create factory contracts for creating `Account` `OpenOffer`s. The factory interfaces and templates are defined in the
`account-onboarding` folder at the base of this repository.

##### Input file format

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

##### Input file format

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
      // repository. Otherwise, the default implementation from Daml Finance is used. Currently this field is only
      // supported for the Fungible holding type.
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

##### Input file format

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

Create factory contracts for creating settlement `OneTimeOffer`s. The factory interfaces and templates are defined in
the `settlement` folder at the base of this repository.

##### Input file format

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

Create factory contracts for creating settlement `OpenOffer`s. The factory interfaces and templates are defined in the
`settlement` folder at the base of this repository.

##### Input file format

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

Create factory contracts for creating `Instrument`s.

##### Input file format

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
      "instrumentType": "Pba" // One of: "Token" or "Pba". "Token" will use the default Token factory implementation
        // from Daml Finance. "Pba" will use the PartyBoundAttributes instrument from this repository.
    }
  ]
}
```

##### Command

```bash
dops create-instrument-factories <path to JSON file>
```

---
#### Create Issuer Factories

Create factory contracts for creating `Issuers`s. The factory interfaces and templates are defined in the
`issuer-onboarding` folder at the base of this repository.

##### Input file format

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

Create factory contracts for creating `MinterBurner`s. The factory interfaces and templates are defined in the
`issuer-onboarding` folder at the base of this repository.

##### Input file format

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

##### Input file format

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

##### Input file format

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

As a custodian, create `OpenOffer` contracts to allow parties to create accounts. For more information on the interfaces
and templates used in this section refer to the `account-onboarding` folder at the base of this repository.

##### Input file format

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

As an account owner, take up an `Account` `OpenOffer` to create an `Account`. For more information on the interfaces
and templates used in this section refer to the `account-onboarding` folder at the base of this repository.

##### Input file format

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
### Party/soul-bound Tokens

For more information on the interfaces and templates used in this section refer to the `pbt` folder at the base of this
repository.

#### Create PartyBoundAttributes Unilaterally

As an issuer of `PartyBoundAttributes` (PBA), unilaterally create the instrument and corresponding `Holding`. As this
is a unilateral workflow, it is only practical for testing scenarios where the issuer, depository, custodian and owner
all exist on one node.

##### Input file format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "pbaInstrument": { // Details of the PBA instrument
    "issuer": "alice",
    "depository": "bob",
    "id": "abc123...", // Instrument ID
    "description": "abc123...",
    "custodian": "charlie" // Label of the custodian of Holdings of this instrument
  },
  "settlementFactory": "label1", // Label of the settlement factory used to instruct settlement to create the Holding
  "instrumentFactory": "label1", // Label of the instrument factory used to create the PBA instrument
  "pbas": [ // One or more PBAs to create
    {
      "owner": "david", // Label of the owner of the PBA
      "accountId": "abc123..",
      "attributes": [ // One or more key-value pairs (attributes assigned to the party)
        ["k1", "v1"]
      ],
      "validAsOf": "2023-10-03T23:15:48.569796Z",
      "version": "abc123...",
      "instrumentObservers": [ // Zero or more sets of observers of the Instrument contract
        {
          "context": "context1", // Context for this set of parties (part of the Daml Finance Disclosure interface)
          "parties": ["bob"] // One or more labels of the observer parties
        }
      ],
      "holdingObservers": [ // Zero or more sets of observers of the Holding contract
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
dops create-pbas-unilateral <path to JSON file>
```

---
### Settlement
#### Create OpenOffers for Settlement

Create settlement `OpenOffer`s. Refer to the the `settlement` folder of this respository for more information on the
`OpenOffer` interfaces and templates.

A party involved in the proposed settlement is captured using the following JSON structure:

```js
 // Either:
{"party": "alice"}, // Label of an instructor party
// ... or ...
{"taker": {}} // An instructor party which will be set to the taker party when the `Accept` choice is exercised. The
// empty JSON `{}` is required
```

We refer to the above format as a "settlement party" in the documentation below.

##### Input file format

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

##### Input file format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "takeOpenOfferSettings": {
    "offerId": "abc123...", // Offer ID
    "offerers": ["alice"], // Labels of the authorisers of the offer
    "taker": "bob", // Label of the party to take the offer
    "description": "abc123...", // Settlement description
    "quantity": 1e3
  }
}
```

##### Command

The unique identifier must be generated and provided as the second argument in the command. This will be used as the
`Batch` ID of the settlement.

```bash
dops take-settlement-open-offer <path to JSON file> <Batch ID>
```

---
#### Accept Settlement Instructions

Accept pending settlement `Instruction`s in a `Batch` by allocating and/or approving them.

##### Input file format

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
        "depository": "bob", // Label of the depository party - optional. If provided, only matches
          // `Instruction`s which use an instrument at this depository
        "issuer": "charlie", // Label of the issuer party - optional. If provided, only matches
          // `Instruction`s which use an instrument issued by this issuer
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

For example, for a settlement instructed by parties labeled "alice" and "bob", having `Batch` ID "abc123":

```bash
dops accept-settlement preferences.json alice,bob abc123
```

---
#### Execute a Batch Settlement

Execute (settle) a `Batch`.

##### Input file format

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

For example, for a settlement instructed by parties labeled "alice" and "bob", having `Batch` ID "abc123":

```bash
dops execute-settlement preferences.json alice,bob abc123
```

---

### Issuer Setup

Refer to the `issuer-onboarding` folder at the base of this repository for more information on the interfaces and
templates used in this section.

#### Create Issuer Contracts

Acting as a depository, create `Issuer` contracts to allow issuers to create new instruments.

##### Input file format

```js
{
  "readAs": ["public"], // Labels of zero or more parties to use to read contracts (can be useful for fetching the
    // factory contracts)
  "issuerSettings": [ // One or more `Issuer`s to create
    {
      "issuer": "alice", // Label of the issuer party
      "depository": "bob", // Label of the depository party
      "instrumentType": "Token", // Type of instrument the issuer factory is for. "Token" is the only type that is
        // currently supported
      "issuerFactory": "label1", // Label of the factory to use to create the `Issuer`
      "instrumentFactory": "label1", // Label of the instrument factory of the `Issuer`
      "observers" : [ // Zero or more sets of observers of the `Issuer`
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

##### Input file format

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

The only parameters that can not be added are ledger host and port, the `--tls` flag  and `--access-token-file`.

## Importing existing party or contract IDs

Currently, there are no commands to allow for storing additional party or contract IDs in the `dops` cache e.g. if for
referencing a party on another participant which belongs to a different organisation. The workaround for this is to
manually edit the JSON files under the `.dops` directory.
