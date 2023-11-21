

aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com

docker pull 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-be:0.0.1

docker pull 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-fe:0.0.1

docker rm -f synfini-wallet-backend

docker rm -f synfini-wallet-frontend

docker run -v /opt/app/config:/app/config -p 8091:8091 --name synfini-wallet-backend --rm -d -it 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-be:0.0.1

docker run -v /opt/app/config:/app/config -p 8091:8091 --name synfini-wallet-frontend --rm -d -it 115676289457.dkr.ecr.ap-southeast-2.amazonaws.com/synfini-wallet-fe:0.0.1
