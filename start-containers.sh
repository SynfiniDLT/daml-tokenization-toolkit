#!/usr/bin/env bash

cd /home/ec2-user/alfred/synfini-wallet-app-deploy
echo $PWD

aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com

docker-compose up -d