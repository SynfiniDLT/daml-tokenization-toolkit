# daml-mint

Daml workflows for tokens whose supply is unilaterally controlled by an issuer.

## Build process

The build process relies on bash scripts and a Makefile so will not work on Windows systems.

To compile the main daml code into a DAR file, run the command below. This will download the dependencies on the Daml
Finance library and then build the DAR file. The generated DAR is stored under the `.build` directory.

```bash
make build
```

The unit tests can be executed using:

```bash
make test
```

You can run a demo on your local machine (runs a local Canton sandbox) by executing:

```bash
make start-demo-local
```

This starts the Daml Navigator and the ledger is pre-populated with parties and contracts.

## Java

The `java-example` directory contains a basic sample of how to use the Daml gRPC java bindings to perform
minting/burning processes.

The java code can be compiled using:

```bash
make build-java
```

To execute it you need to provide the ledger host, port, party ID of the minter/burner. For example, to run it on the
local Canton sandbox, you can run the below command. Note, you may need to change the party ID of the minter burner.

```bash
cd java-example
mvn exec:java \
  -Dexec.mainClass="com.synfini.mint.Application" \
  -Dexec.args="localhost 6865 CoinMinterBurner::1220fb19f16f892f6b690decfecc133d4e273b3e026e4bc4f9faaf97f9a8a4a9ce16"
```
