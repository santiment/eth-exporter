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

## Running the tests

To run the tests run

```
$ docker-compose run --no-deps --rm exporter npm test
```