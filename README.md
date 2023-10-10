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
most likely be replaced with the Daml Participant Query Store feature. To install Custom run:

```bash
make install-custom-views
```

### Start the demo on local sandbox

1. Start a local postgres DB by running: `cd wallet-views/java && docker compose up -d db && cd ../..`
1. Finally run: `./launch-local-demo.sh`

To stop the demo, press control-C and then run `./kill-local-demo-processes.sh`.

## Build process

The build process relies on bash scripts and a Makefile so will not work on Windows systems.

TODO add more detail on the build process