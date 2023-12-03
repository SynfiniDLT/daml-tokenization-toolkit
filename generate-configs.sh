#!/bin/bash

aws s3 cp s3://dlts-artifacts/synfini-wallet-app/canton-dev-dlt02/application.properties /opt/app/config

aws s3 cp s3://dlts-artifacts/synfini-wallet-app/canton-dev-dlt02/.env /opt/app/config

echo "config files downloaded"

