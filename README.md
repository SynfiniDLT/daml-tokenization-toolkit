# Daml Tokenization Library

Suite of tools for tokenization of assets using Daml/Canton.

## Getting started

Firstly, clone this repo **including the submodules** which are needed for building:

```bash
git clone https://github.com/SynfiniDLT/daml-tokenization-lib --recurse-submodules
```

Before running any of the below commands, you need to install Custom Views first. This is a library that is being used
to continuosly stream events and contracts from the ledger and store them in a queryable database. In future, this will
most likely be replaced with the Daml Participant Query Store feature. To install Custom Views, run:

```bash
make install-custom-views
```

## Start the demo on local sandbox

1. Start the sandbox by running `daml sandbox` (from the root of this repository) and wait until it displays a message saying it is ready.
1. Similarly, from another terminal, start the Daml JSON API: `daml json-api --http-port 7575 --ledger-host localhost --ledger-port 6865`
1. From another terminal, start a local postgres DB by running: `cd wallet-views/java && docker compose up -d db && cd ../..`
1. Finally run: `./launch-demo-local.sh`

## Build process

The build process relies on bash scripts and a Makefile so will not work on Windows systems.

TODO add more detail on the build process