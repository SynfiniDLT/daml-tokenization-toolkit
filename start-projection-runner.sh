#!/bin/bash

# sleep for 30s to wait for server fully started
sleep 30s

ENV=$DEPLOYMENT_GROUP_NAME
echo "ENV = ${ENV}"

if [ "$ENV" == "dev" ]
then
    projection_url="http://localhost:8091/wallet-views/v1/projection/start"
    token_url="https://asx-dev.au.auth0.com/oauth/token"
    secret_name="Dev_Auth0_dlt02_wallet_operator"
    party_wallet_operator="WalletServiceProvider_Wallet_Operator_v1::12205d4208edf13d0cfc27a8f0cf05ff3cb18d8b437ab70c36c8d7a12e51a06b781d"
fi

token_secret_val=$(
    aws secretsmanager get-secret-value \
    --secret-id ${secret_name} | jq -r '.SecretString'
)
client_id=$(echo $token_secret_val | jq -r '.client_id')
client_secret=$(echo $token_secret_val | jq -r '.client_secret')
audience=$(echo $token_secret_val | jq -r '.audience')
# echo "token_secret_val=${token_secret_val}"
# echo "client_id=${client_id}"
# echo "client_secret=${client_secret}"
# echo "audience=${audience}"

cmd="
    curl -so /dev/null -w \"%{http_code}\" \
        --location \"${projection_url}\" \
        --header \"Content-Type: application/json\" \
        --data '{
          \"readAs\": \"${party_wallet_operator}\",
          \"tokenUrl\": \"${token_url}\",
          \"clientId\": \"${client_id}\",
          \"clientSecret\": \"${client_secret}\",
          \"audience\": \"${audience}\"
        }'
"
# echo ${cmd}
response_code=$(eval "${cmd}")
echo "Response Code of cURL command to start ProjectionRunner = ${response_code}"

if [ ${response_code} == "200" ]
then
    echo "Projection Runner started successfully!"
else
    echo "ERROR while starting Projection Runner!"
    exit 1
fi