# Daml Tokenization Library

Suite of tools for tokenization of assets using Daml/Canton.

## Start the demo on local sandbox

1. Start the sandbox by running `daml sandbox` (from the root of this repository) and wait until it displays a message saying it is ready.
1. Similarly, from another terminal, start the Daml JSON API: `daml json-api --http-port 7575 --ledger-host localhost --ledger-port 6865`
1. From another terminal, start a local postgres DB by running: `cd wallet-views/java && docker compose up -d db && cd ../..`
1. Finally run: `./launch-demo-local.sh`

## Build process

The build process relies on bash scripts and a Makefile so will not work on Windows systems.

TODO add more detail on the build process