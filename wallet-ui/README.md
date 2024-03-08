# daml-wallet-ui

## .env variables explanation

These environment variables in the .env file defines key entities and roles within the wallet-ui application. They assign values to terms like depository, issuer, operator, and public key, managing operations within the wallet under the Synfini platform.   

1. REACT_APP_LEDGER_INSTRUMENT_DEPOSITORY: Represents the depository entity for the specified ledger instrument SBT (Soulbound Token).
1. REACT_APP_LEDGER_INSTRUMENT_ISSUER: Denotes the issuer entity responsible for managing and issuing the specified ledger instrument SBT (Soulbound Token).
1. REACT_APP_LEDGER_WALLET_OPERATOR: Points to the operator entity responsible for managing operations within the wallet.
1. REACT_APP_LEDGER_WALLET_DEPOSITORY: Refers to the depository entity associated with the specific blockchain wallet.
1. REACT_APP_LEDGER_WALLET_PUBLIC: Represents the public-facing aspect or key for the Synfini blockchain wallet.
1. REACT_APP_MODE: specifies the operational mode of the wallet app, serving either as an investor or issuer, adapting its functionalities accordingly.

## Project Deployment Guide
This guide provides step-by-step instructions for building and deploying the backend and frontend applications using Docker.


### 1. Dockerfile-backend Version Explanation
The Dockerfile-backend uses a version argument that is set in the pom.xml file located at wallet-views/java/pom.xml. This version corresponds to the version of the JAR file used in the backend container.

### 2. Build the Project using Makefile
To build the project, execute the following commands:

``` bash
make build-wallet-views
make build-wallet-ui
```

### 3. Build the Backend Container
Build the backend container by executing the following command. The VERSION argument is used to specify the version of the JAR file from the pom.xml.

```bash
sudo docker build --build-arg VERSION=0.0.2 -t wallet-be -f Dockerfile-backend .
```
### 4. Build the Frontend Container
Build the frontend container using the following command:

```bash
sudo docker build -t wallet-fe -f Dockerfile-frontend .
```

### 5. Run Backend Container
Run the backend container in detached mode, mapping port 8091 on the host to port 8091 in the container:

```bash
sudo docker run -p 8091:8091 --name wallet-backend -d wallet-be
```

### 6. Run Frontend Container
Run the frontend container in detached mode, mapping port 8090 on the host to port 8090 in the container:

```bash
sudo docker run -p 8090:8090 --name wallet-frontend -d wallet-fe
```

### 7. Check Container Logs
Check the logs of the backend container:

```bash
sudo docker logs -f wallet-backend
```

Check the logs of the frontend container:

```bash
sudo docker logs -f wallet-frontend
```