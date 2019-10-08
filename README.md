# ETH Data Exporter

This package defines an easy to use API for exporting data from the ETH blockchain into an analytics DB. It makes all the data queriable with SQL in real-time. There is a project generator, which includes an exporter, a DB hooked to it and a simple REST API on top of it.

## Usage

There is a [Yeoman](https://yeoman.io) generator for new exporters, so using that is the easiest. Make sure you have `docker` and `docker-compose` installed first and then run:

```
$ npm install -g yo
$ npm install -g @santiment-network/generator-eth-exporter
```

Then create a folder for the new exporter and initialize the skeleton:

```
$ mkdir my-exporter && cd my-exporter
$ yo @santiment-network/eth-exporter
```

Running the exporter is done with

```
$ docker-compose up --build
```

If you want to cleanup the current state and run from the beginning run

```
$ docker-compose rm
```

## Connect to the analytics DB

The pipeline uses [ClickHouse](https://clickhouse.yandex) as an analytics DB. This is a very fast columnar DB, which allows to use SQL to query the data. In order to connect to the DB run:

```
$ docker-compose exec clickhouse clickhouse-client 
```

## Running the tests

To run the tests run

```
$ docker-compose run --no-deps --rm exporter npm test
```

## API

The main way to use the extractor is to extract all the events defined into an ABI. You can do it like this:

```js
const { ETHExporter } = require('@santiment-network/eth-exporter')
const contractAbi = require('./abi.json')

const exporter = new ETHExporter("contract-events")

exporter.extractEventsWithAbi(contractAbi)

```

This is going to extract all the events defined in the ABI from all contracts deployed on Ethereum.

The function `extractEventsWithAbi` accepts the following parameters:

* `abi` - ABI to use to decode the events
* `topics` - a list of topics to filter the events. See [getPastLogs](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#getpastlogs) docs for details. If `null` is passed, all the events in the ABI will be decoded.
* `addresses` - a list of addresses to filter the events on. See [getPastLogs](https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#getpastlogs) docs for details. If `null` is passes, the events from all addresses will be decoded.
* `eventHandler` - an optional function, which will get all the decoded events and should return the event that needs to be stored in the DB. Can be used to additional processing of the extracted events. If the function returns `null`, the decoded events won't be saved in the DB.

## Config

The script accepts configuration via environment variables. This is very convenient, when you run it through docker. The recognized variables are:

* `KAFKA_URL` - A URL to the kafka cluster the data will be dumped to
* `ZOOKEEPER_URL` - A URL to the zookeeper cluster. It is used for storing the current state of the export
* `ETHEREUM_NODE_URL` - A URL to an ethereum full node, which will be used for making JSON-RPC calls
* `KAFKA_TOPIC` - The topic in kafka, which will be used for dumping the data
* `START_BLOCK` - The block from which to start the data extraction
* `CONFIRMATIONS` - Number of confirmation to waits until dumping the data. This is needed so that you don't need to handle chain reorganizations
* `BLOCK_INTERVAL` - Number of blocks to query at once when fetching the data. Decrease this if you start getting errors that messages size of the kafka message is too big
