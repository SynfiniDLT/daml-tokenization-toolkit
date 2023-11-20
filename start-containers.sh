#!/usr/bin/env bash

echo $PWD
cd $PWD
echo $PWD
cd /home/ec2-user/alfred/synfini-wallet-app-deploy
echo $PWD
docker-compose up -d