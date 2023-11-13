#!/usr/bin/env bash

set -eu

now_seconds=$(date +%s)
if [ ! -f $DOPS_ACCESS_TOKEN_EXPIRY_FILE ]; then
  expiry=0
else
  expiry=$(cat $DOPS_ACCESS_TOKEN_EXPIRY_FILE)
fi

if [ $(($expiry - $now_seconds)) -lt 1800 ]; then
  echo "Fetching fresh token from ${ACCESS_TOKEN_URL}"
  token_response=$(
    curl \
      --request POST \
      --url ${ACCESS_TOKEN_URL} \
      --fail \
      --header 'content-type: application/x-www-form-urlencoded' \
      --data grant_type=client_credentials \
      --data client_id=${ACCESS_TOKEN_CLIENT_ID} \
      --data client_secret=${ACCESS_TOKEN_CLIENT_SECRET} \
      --data audience=${ACCESS_TOKEN_AUDIENCE}
  )
  echo $token_response | jq -r '.access_token' > $DOPS_ACCESS_TOKEN_FILE
  expires_in=$(echo $token_response | jq -r '.expires_in')
  expiry=$(($now_seconds + $expires_in))
  echo $expiry > $DOPS_ACCESS_TOKEN_EXPIRY_FILE
fi
