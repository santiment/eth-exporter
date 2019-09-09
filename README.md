# ETH Data Exporter

This package defines an easy to use class for exporting data from the ETH blockchain to the Santiment Data Pipeline.

## Usage

There is a [Yeoman](https://yeoman.io) generator for new exporters, so using that is the easiest. Make sure you have `docker` and `docker-compose` installed first and then run:

```
$ npm install -g yo
$ npm install -g https://github.com/santiment/generator-eth-exporter
```

Then create a folder for the new exporter and initialize the skeleton:

```
$ mkdir my-exporter && cd my-exporter
$ yo eth-exporter
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

The pipeline uses (ClickHouse)[https://clickhouse.yandex] as an analytics DB. This is a very fast columnar DB, which allows to use SQL to query the data. In order to connect to the DB run:

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
const { ETHExporter } = require('eth-exporter')
const contractAbi = require('./abi.json')

const exporter = new ETHExporter("contract-events")

exporter.extractEventsWithAbi(contractAbi)

```

This is going to extract all the events defined in the ABI from all contracts deployed on Ethereum.

The function `extractEventsWithAbi` accepts the following parameters:

* abi - ABI to use to decode the events
* topics - a list of topics to filter the events. See (https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#getpastlogs)[getPastLogs] docs for details. If `null` is passed, all the events in the ABI will be decoded.
* addresses - a list of addresses to filter the events on. See (https://web3js.readthedocs.io/en/v1.2.1/web3-eth.html#getpastlogs)[getPastLogs] docs for details. If `null` is passes, the events from all addresses will be decoded.
* eventHandler - an optional function, which will get all the decoded events and should return the event that needs to be stored in the DB. Can be used to additional processing of the extracted events. If the function returns `null`, the decoded events won't be saved in the DB.