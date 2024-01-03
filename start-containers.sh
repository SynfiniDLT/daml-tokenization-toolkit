#!/bin/bash

ENV=$DEPLOYMENT_GROUP_NAME
VERSION=$(xml_grep --text_only '/project/version' pom.xml)

echo "ENV = ${ENV}"
echo "VERSION = ${VERSION}"

aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com

docker pull 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-be:${VERSION}

docker pull 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-fe:${VERSION}

docker rm -f synfini-wallet-backend 2>/dev/null || true

docker rm -f synfini-wallet-frontend 2>/dev/null || true

docker rm -f synfini-wallet-frontend-investor 2>/dev/null || true

docker rm -f synfini-wallet-frontend-issuer 2>/dev/null || true


docker run -v /opt/app/config/${ENV}/${VERSION} -p 8091:8091 --name synfini-wallet-backend --rm -d -it 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-be:${VERSION}

docker run -v /opt/app/config/${ENV}/${VERSION}/.env.investor:/wallet-ui/.env -p 8090:8090 --name synfini-wallet-frontend-investor --rm -d -it 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-fe:${VERSION}

docker run -v /opt/app/config/${ENV}/${VERSION}/.env.issuer:/wallet-ui/.env   -p 8092:8090 --name synfini-wallet-frontend-issuer   --rm -d -it 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-fe:${VERSION}
