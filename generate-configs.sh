#!/usr/bin/env bash

echo "Installing aws cli"
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm awscliv2.zip \
    && rm -R aws
echo "Done."


echo "Installing docker-compose"
sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose version
echo "Done."


echo "Generating config file for environment: $DEPLOYMENT_GROUP_NAME"

rm -f application.properties
touch application.properties

if [ "$DEPLOYMENT_GROUP_NAME" == "dev" ]
then

    WALLET_API_CLIENT_ID=`aws ssm get-parameter --name /dlt/auth0/wallet-api-app-client-id --region ap-southeast-2 | jq -r '.Parameter.Value'`
    WALLET_API_CLIENT_SECRET=`aws ssm get-parameter --name /dlt/auth0/wallet-api-app-client-secret --region ap-southeast-2 --with-decryption | jq -r '.Parameter.Value'`

    echo "wallet-api-app-client-id=$WALLET_API_CLIENT_ID" >> application.properties
    echo "wallet-api-app-client-secret=$WALLET_API_CLIENT_SECRET" >> application.properties

fi

echo "Done."