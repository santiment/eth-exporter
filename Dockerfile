FROM node:18.1.0-buster-slim AS builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PYTHON=/usr/bin/python3

RUN apt-get update; \
    apt-get install -y bash \
      g++ \
      ca-certificates \
      musl-dev \
      make \
      git \
      python3

WORKDIR /opt

COPY package.json package-lock.json* ./

RUN npm ci --${NODE_ENV}
RUN npm cache clean --force

FROM node:18.1.0-buster-slim

RUN apt-get update; \
    apt-get install -y openssl netcat-openbsd

WORKDIR /opt/app

ENV PATH /opt/node_modules/.bin:${PATH}

COPY . /opt/app

COPY --from=builder /opt/node_modules /opt/node_modules

EXPOSE 3000

CMD npm start