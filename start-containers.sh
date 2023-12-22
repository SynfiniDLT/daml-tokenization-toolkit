#!/bin/bash

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <environment> <version>"
    exit 1
fi

env="$1"
version="$2"

aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com

docker pull 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-be:${version}

docker pull 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-fe:${version}

docker rm -f synfini-wallet-backend

docker rm -f synfini-wallet-frontend-investor

docker rm -f synfini-wallet-frontend-issuer


docker run -v /opt/app/config/${env}/${version} -p 8091:8091 --name synfini-wallet-backend --rm -d -it 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-be:${version}

docker run -v /opt/app/config/${env}/${version}/.env.investor:/wallet-ui/.env -p 8090:8090 --name synfini-wallet-frontend-investor --rm -d -it 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-fe:${version}

docker run -v /opt/app/config/${env}/${version}/.env.issuer:/wallet-ui/.env   -p 8092:8090 --name synfini-wallet-frontend-issuer   --rm -d -it 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-fe:${version}
