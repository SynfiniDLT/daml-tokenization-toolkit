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

## Basic usage

Each `dops` command requries an input JSON file. For example, to allocate parties to the participant, a JSON file such
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
files. Contract IDs are also cached. For example, in order to setup an `Account` for Bob with Alice as custodian,
we need to first create a `Holding` factory for the assets in the `Account`. The input file would look like this for
creating an `Account` holding fungible assets:

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

The contract IDs of the factories will saved with their labels under the `.dops` directory. Finally, we can use them
to create the `Account`s. The tool supports both a propose-accept worklow and also a unilateral method to do this. For
simplicity, this is an example will show the unilateral way. It assumes we are able to act as both the custodian and
owner in a single command. This can be useful for testing on a single participant. For example, to create one `Account`
for Bob, use this JSON file:

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

The values of `accountFactory` and `holdingFactory` above are equal to the labels that were defined in the input JSON
files for the factories earlier.
