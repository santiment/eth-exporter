FROM node:9.11.1-alpine AS builder

RUN apk --no-cache add \
  bash \
  g++ \
  ca-certificates \
  lz4-dev \
  musl-dev \
  cyrus-sasl-dev \
  openssl-dev \
  make \
  python \
  git

RUN apk add --no-cache --virtual .build-deps gcc zlib-dev libc-dev bsd-compat-headers py-setuptools bash

WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json

RUN npm install

FROM node:9.11.1-alpine

RUN apk --no-cache add \
  bash \
  g++ \
  ca-certificates \
  lz4-dev \
  musl-dev \
  cyrus-sasl-dev \
  openssl-dev \
  make \
  python \
  git

WORKDIR /app

COPY --from=builder /app/node_modules /app/node_modules

COPY . /app

EXPOSE 3000

CMD npm start
