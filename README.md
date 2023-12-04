# Daml Tokenization Library

Suite of tools for tokenization of assets using Daml/Canton.

## Getting started

### Prerequisites

Please install the following first:

- Daml SDK (https://docs.daml.com/getting-started/installation.html#installing-the-sdk)
- Maven (https://maven.apache.org/install.html)
- sbt (https://www.scala-sbt.org/download.html)
- npm (https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- Docker (https://docs.docker.com/get-docker/)

Then, clone this repo **including the submodules** which are needed for building:

```bash
git clone https://github.com/SynfiniDLT/daml-tokenization-lib --recurse-submodules
```

Before running any of the below commands, you need to install Custom Views first. This is a library that is being used
to continuosly stream events and contracts from the ledger and store them in a queryable database. In future, this will
most likely be replaced with the Daml Participant Query Store feature. To install Custom Views run:

```bash
make install-custom-views
```

### Start the demo on local sandbox

1. Start a local postgres DB by running: `cd wallet-views/java && docker compose up -d db && cd ../..`
1. Run: `./launch-local-demo.sh`.
1. Start the UI using `make start-wallet-ui`

To stop the demo, press control-C and then run `./kill-local-demo-processes.sh`.

## Build process

Build has been tested with Java version 17, Maven 3.6.3 and npm 8.19.

All DAR files are saved as part of the build under: `.build`.

To build wallet backend:

```bash
make build-wallet-views
```

To test the wallet backend:

```bash
make test-wallet-views
```

To test the wallet backend client library:

```bash
make test-wallet-views-client
```

For front end:

```bash
make build-wallet-ui
```

To clean the build state:

```bash
make clean
```

## dops CLI

The `dops` ("Daml Ops") CLI can be used for various operations on the ledger, such party allocation, creation of users
and Daml Finance account setup.

To install it, run:

```
make build-onboarding
echo "export DOPS_HOME=~/.dops" >> ~/.bashrc
echo "export PATH=\$PATH:${DOPS_HOME}/bin" >> ~/.bashrc
```

TODO: add more documentation on the CLI tool.
