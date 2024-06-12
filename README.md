# Daml Tokenization Solution

    Copyright (c) 2024, ASX Operations Pty Ltd. All rights reserved.
    SPDX-License-Identifier: Apache-2.0

A solution that demonstrates
1. Tokenization of assets using Daml/Canton.
1. Asset settlement on Canton network.
1. Wallet to support the asset tokenization.

## High-level solution design

This diagram shows the overall intended deployment structure of the wallet. Each participant is expected to host their
own instance of the wallet API and wallet UI. The wallet API is read-only, therefore UI users must use the JSON API to
issue any commands which update ledger state. In future this could be migrated to the Daml 3.0 application architecture
in which the wallet application service provider would host the read-only wallet API on its participant, while users
would submit commands through their own participants.

![alt text](./img/solution_overview.jpg)

It is important to note that this solution is designed to work in congunction with other applications. For example,
there may be another application which implements a customized token with bespoke lifecycling or other functions, but
users could still authorise and complete the settlement processes through the wallet user interface. Due to the fact
that this application makes use of the Daml Finance interfaces (rather than specific implementations), the settlement
instructions can be initiated by a variety of other applications but responded to by users via this solution.

## Components

The project contains a number of components:

| Folder | Content | Dependency |
| ------------- | ------------- | ------------- |
| [models](./models) | Daml templates used in this project | Daml Finance |
| [demo-config](./demo-config) | Configurations files for the initial smart contract setup. The file contains data required to onboard users to the ledger | Daml Finance, Daml templates defined in this project, operations scripts |
| [operations](./operations) | Scripts that support party and contract setup, instruction and execution of settlements | Daml Finance, Daml templates defined in this project |
| [wallet-views](./wallet-views) | API for the UI | Daml Finance, Daml templates from [models](./models) |
| [wallet-ui](./wallet-ui) | UI app | Daml Finance, Daml templates from [models](./models) |

## Prerequisites

Please follow these prerequisite steps before running any of the build/run/test steps.

Install the following first:

- Daml SDK (https://docs.daml.com/getting-started/installation.html#installing-the-sdk)
- Maven (https://maven.apache.org/install.html)
- npm (https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- Docker (https://docs.docker.com/get-docker/)
- jq (https://jqlang.github.io/jq/)
- Python 3 (https://www.python.org) (only needed for running the demo)
- Participant Query Store (https://docs.daml.com/2.8.3/query/pqs-user-guide.html) (See the instructions below)

Download the Scribe component (JAR file) of PQS. You will need
a Daml Enterprise license in order to access this. Save it to your machine and export the absolute path to the file
in your terminal envionment using the variable `SCRIBE_LOCATION`. Using a component which requires an enterprise
license is somewhat of a limitation but there are few alternatives other than writing a custom component for this
purpose. For reference, the previous version of this project was implemented without need for the enterprise license
using the (now deprecated) Custom Views library, and can be found
[here](https://github.com/SynfiniDLT/daml-tokenization-toolkit/releases/tag/v0.2.0).

Build has been tested with Java version 17, Maven 3.6.3, npm 8.19 and PQS 2.8.0.

## Asset and party configuration of the demo

This repository comes with a demo which demonstrates how the wallet can be used by investors, issuers and other parties.

### Asset/Account support

1. The demo onboards multiple issuers: a stable coin issuer, a fund issuer, an ESG asset issuer and a "Soul-bound token"
issuer.
1. The demo supports investors to create multiple accounts through offer contracts created by the custodian.
1. The demo supports DvP settlements amongst asset issuer, investor and other parties.

### UI User profile

There are two ways to run the run the UI based on the below user profiles.

| UI user profile  | Description  |
| ------------- | -------------  |
| Issuer | Issuer can create instruments and offers, mint assets and enter into a settlement with other parties. Issuer can access and use the issuer wallet. | 
| Investor | Investor can accept offers and enter into settlement with other parties. Investor can access and use the investor wallet. | 

### Party configuration

Each user on the ledger needs to use one or many parties to communicate with the ledger to complete the required workflow. 

| UI user profile | Primary Party | Description | 
| ------------- | ------------- | -------------  |
| Issuer | StableCoinIssuer | The party manages stablecoin issuing | 
| Issuer | StableCoinDepository | Depository for the stablecoin instrument |
| Issuer | SbtIssuer | The party manages party/soul-bound token issuing | 
| Issuer | SbtDepository | Depository for the party/soul-bound token instrument | 
| Issuer | FundA | The party manages the fund issuing |
| N/A (UI login not required) | FundDepository | Depository for the fund instrument |
| Investor | FundManagerA | The party which takes the commission in fund settlement workflow |
| Issuer | EnvironmentalTokenIssuer | The party manages issuance of environmental tokens |
| N/A (UI login not required) | EnvironmentalTokenDepository | Depository for the environmental token instruments |
| Investor | ProducerA | Producer of environmentally-friendly products/projects, who can be awarded points by the EnvironmentalTokenIssuer |
| N/A (UI login not required) | SynfiniValidator | This party witnesses and validates the movements of assets (act as custodian in Daml Finance). They delegate responsibility for minting/burning `Holding`s to the asset issuers |
| Investor | InvestorA | Investor party |
| Investor | InvestorB | Investor party |

## Quick start

You can use the instructions in this section to launch the demo on your local machine on a single participant node
(Daml sandbox).

### Setting up Auth0 Authentication for the React App (Wallet-ui)

This will guide you through the steps to set up Auth0 authentication in your React app as a Single Page Application (SPA). In this application, we leverage Auth0's Universal Login to streamline the authentication and token generation process.   
This authentication service provides a seamless and secure user experience by centralizing login functionality, allowing users to access their blockchain wallet through a unified and authenticated session managed by Auth0.  
The solution currently only supports Auth0, however it could be modified to support other authentication and authorization platform providers if needed.

#### Step 1: Create an Auth0 Account

1. Go to Auth0 and sign up for a free account.
1. Once logged in, go to the Dashboard.
1. Click on the "Create Application" button.
1. Choose "Single Page Web Applications" as the application type.
1. Configure your application settings, including the Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins. Typically, for development, you can set these to http://localhost:3000.
1. Save the changes.

#### Step 2: Edit the .env file at the wallet-ui folder with the following: 

```bash
REACT_APP_AUTH0_DOMAIN=your-auth0-domain
REACT_APP_AUTH0_CLIENT_ID=your-auth0-client-id
```
Replace your-auth0-domain and your-auth0-client-id with the values from your Auth0 application settings.

#### Step 3: Create an Auth0 API Resource (Audience)

1. In your Auth0 Dashboard, navigate to the APIs section.
1. Click on the "Create API" button.

1. Fill in the required information:

	Name: Choose a name for your API.
	Identifier (Audience): This is a unique identifier for your API. It can be a URL, such as https://your-api.com.
	Signing Algorithm: RS256 is commonly used.
	Click on the "Create" button to create your API.

	Once the API is created, you'll see the details on the API settings page.

	Take note of the "Identifier" (Audience). This value will be used in your React app to specify the audience when making authentication requests.


1. Update your React app's .env file to include the API Identifier:
```bash
REACT_APP_AUTH0_AUDIENCE=your-api-identifier
```
Replace your-api-identifier with the audience identifier you obtained from the Auth0 Dashboard.

#### Step 4: Edit the users.json File for Ledger Identification

In the demo-config/users folder, there is a users.json file to store user information for ledger identification. The
users.json file has an array of user objects, each containing the userId from Auth0 and the corresponding primaryParty
for ledger identification. Replace the user IDs with the actual user IDs from Auth0. Unfortunately this process has not
yet been automated so manual editing is required. Ensure that the userId in each object corresponds to the sub (subject)
field in the Auth0 user profile. The primaryParty field is the default party used to issue commands to the ledger. If
logged into the UI, the user will act as this party. There is no need to edit this field.

Whenever a user logs in, the UI retrieves the user from the participant node which has a user ID matching the Auth0
subject. This allows it to find the user's corresponding primaryParty.

### Start the demo on local sandbox

1. Start a local postgres DB by running: `cd wallet-views/java && docker compose up -d db && cd ../..`
1. Run: `./launch-local-demo-processes.sh`.
1. Start the UI using `./run-local-demo-ui.sh`

If the following error occurs
```
  opensslErrorStack: [ 'error:03000086:digital envelope routines::initialization error' ],
  library: 'digital envelope routines',
  reason: 'unsupported',
  code: 'ERR_OSSL_EVP_UNSUPPORTED'

```
Set up the following node option and try again
```
export NODE_OPTIONS=--openssl-legacy-provider
```

To stop the demo, press control-C and then run `./kill-local-demo-processes.sh`.

## Build process

Please refer to each of the folders for documentation on how to build each component. Note that all the builds are
managed by the `Makefile` in the base directory.

To clean the build state:

```bash
make clean
```

## Deployment

1. Refer to [wallet views readme](./wallet-views/README.md) for deploying daml packages, projection runner and wallet API.
2. Refer to [wallet ui readme](./wallet-ui/README.md) for deploying wallet ui.

## Next steps

There are a number of tasks ahead to complete and enhance this solution. A complete list can be found within the Github
[issues](https://github.com/SynfiniDLT/daml-tokenization-toolkit/issues). Some of the highest priority tasks are listed
below:

1. Use the latest solution from DA which replaces the public party feature (i.e. use explict disclosure). This will make
it easier to share commononly used utility contracts (such as factories) without need for a public party hosted on
multiple participants. Refer to this [issue](https://github.com/SynfiniDLT/daml-tokenization-toolkit/issues/79).
1. Upgrade to the latest version of Daml Finance. Refer to this [issue](https://github.com/SynfiniDLT/daml-tokenization-toolkit/issues/68).
1. Adding additional features within the issuer wallet UI, such as a breakdown of who owns the assets they have issued.
Refer to this [issue](https://github.com/SynfiniDLT/daml-tokenization-toolkit/issues/63).
