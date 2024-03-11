# daml-wallet-ui

## .env variables explanation

These environment variables in the .env file defines party name and IAM url for the wallet-ui application. 

1. REACT_APP_LEDGER_INSTRUMENT_DEPOSITORY: Party name of the depository entity for SBT (Soulbound Token). (Participant ID not included)
1. REACT_APP_LEDGER_INSTRUMENT_ISSUER: Party name of the issuer entity for SBT (Soulbound Token).
1. REACT_APP_LEDGER_WALLET_OPERATOR: Party name of the wallet operator.
1. REACT_APP_LEDGER_WALLET_DEPOSITORY: Party name of the issuer.
1. REACT_APP_LEDGER_WALLET_PUBLIC: Party name of the public party.
1. REACT_APP_MODE: specifies the operational mode of the wallet app, serving either as an investor or issuer, adapting its functionalities accordingly.

## Project Deployment Guide
This guide provides step-by-step instructions for building and deploying the frontend applications using Docker. Please deploy the backend according to [wallet view readme](../wallet-views/README.md) before deploying frontend.

### 1. Build the Frontend Container
Build the frontend container using the following command:

```bash
sudo docker build -t wallet-fe -f Dockerfile-frontend .
```

### 2. Run Frontend Container
Run the frontend container in detached mode, mapping port 8090 on the host to port 8090 in the container:

```bash
sudo docker run -p 8090:8090 --name wallet-frontend -d wallet-fe
```

### 3. Check Container Logs
Check the logs of the backend container:

```bash
sudo docker logs -f wallet-backend
```

Check the logs of the frontend container:

```bash
sudo docker logs -f wallet-frontend
```