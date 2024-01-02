#!/bin/bash

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <environment> <version>"
    exit 1
fi

env="$1"
version="$2"

s3_url_be="s3://dlts-artifacts/synfini-wallet-app/application.properties /opt/app/config"
s3_url_fe_investor="s3://dlts-artifacts/synfini-wallet-app/${env}/${version}/.env.investor /opt/app/config/${env}/${version}"
s3_url_fe_issuer="s3://dlts-artifacts/synfini-wallet-app/${env}/${version}/.env.issuer /opt/app/config/${env}/${version}"

aws s3 cp $s3_url_be
aws s3 cp $s3_url_fe_investor
aws s3 cp $s3_url_fe_issuer

echo "config files downloaded"

