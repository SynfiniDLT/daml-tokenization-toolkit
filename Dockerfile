FROM node

ENV NODE_OPTIONS=--openssl-legacy-provider

COPY wallet-views /wallet-views

WORKDIR /wallet-ui

COPY wallet-ui/package.json .

RUN npm install

COPY wallet-ui .

EXPOSE 3000

CMD ["sh","-c","npm start"]