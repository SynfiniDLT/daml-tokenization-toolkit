#!/usr/bin/env bash

echo "Generating config file for environment: $1"

WALLET_API_CLIENT_ID=`aws ssm get-parameter --name /dlt/auth0/wallet-api-app-client-id --region ap-southeast-2 | jq -r '.Parameter.Value'`

WALLET_API_CLIENT_SECRET=`aws ssm get-parameter --name /dlt/auth0/wallet-api-app-client-secret --region ap-southeast-2 --with-decryption | jq -r '.Parameter.Value'`

rm -f application.properties
touch application.properties

echo "wallet-api-app-client-id=$WALLET_API_CLIENT_ID" >> application.properties
echo "wallet-api-app-client-secret=$WALLET_API_CLIENT_SECRET" >> application.properties

echo "Done."