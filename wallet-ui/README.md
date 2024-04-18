# daml-wallet-ui

## .env variables explanation

These environment variables in the .env file defines party name and IAM url for the wallet-ui application. 

1. REACT_APP_PARTIES_SBT_INSTRUMENT_DEPOSITORY: Party ID of the depository entity for SBT (Soulbound Token). (Participant ID not included)
1. REACT_APP_PARTIES_SBT_INSTRUMENT_ISSUER: Party ID of the issuer entity for SBT (Soulbound Token).
1. REACT_APP_PARTIES_SBT_CUSTODIAN: Party ID of the custodian at which the SBTs are held.
1. REACT_APP_PARTIES_WALLET_OPERATOR: Party ID of the wallet operator.
1. REACT_APP_PARTIES_ENVIRONMENTAL_TOKEN_DEPOSITORY: Party ID of the issuer.
1. REACT_APP_PARTIES_PUBLIC: Party ID of the public party.
1. REACT_APP_MODE: specifies the operational mode of the wallet app, serving either as an investor or issuer, adapting its functionalities accordingly.
1. REACT_APP_PARTIES_PUBLIC: Party ID of the public party.
1. REACT_APP_STABLECOIN_INSTRUMENT_ID: Instrument ID of the stablecoin instrument.
1. REACT_APP_PARTY_ATTRIBUTES_INSTRUMENT_ID: Instrument ID of the SBT used to identify ecosystem members.
1. REACT_APP_PARTY_ATTRIBUTES_NAME: Name of the attribute on the metadata contracts for the REACT_APP_PARTY_ATTRIBUTES_INSTRUMENT_ID. The value of this attribute is the display name of the party.

## Project Deployment Guide

This guide provides step-by-step instructions for building and deploying the frontend applications using Docker. Please deploy the backend according to [wallet view readme](../wallet-views/README.md) before deploying frontend.


### 1. Build the Project using Makefile

To build the project, execute the following commands:

``` bash
make build-wallet-views
make build-wallet-ui
```

### 2. Build the Backend Container

Build the backend container by executing the following command. The VERSION argument is used to specify the version of the JAR file from the pom.xml.

```bash
sudo docker build --build-arg VERSION=0.0.2 -t wallet-be -f Dockerfile-backend .
```

### 3. Run Backend Container

Run the backend container in detached mode, mapping port 8091 on the host to port 8091 in the container:

```bash
sudo docker run -p 8091:8091 --name wallet-backend -d wallet-be
```

### 4. Build the Frontend Container

Build the frontend container using the following command:

```bash
sudo docker build -t wallet-fe -f Dockerfile-frontend .
```

### 5. Run Frontend Container

Run the frontend container in detached mode, mapping port 8090 on the host to port 8090 in the container:

```bash
sudo docker run -p 8090:8090 --name wallet-frontend -d wallet-fe
```

### 6. Check Container Logs

Check the logs of the backend container:

```bash
sudo docker logs -f wallet-backend
```

Check the logs of the frontend container:

```bash
sudo docker logs -f wallet-frontend
```