# ETH Data Exporter

This package defines an easy to use class for exporting data from the ETH blockchain to the Santiment Data Pipeline.

## Usage

In order to write an exporter first install the package in your JS project:

```
$ npm add https://github.com/santiment/eth-exporter
```

Then define the extraction pipeline:

```js
const { ETHExporter } = require('eth-exporter')

const exporter = new ETHExporter("erc20-transfers")

const transferEventAbi = [{
  "indexed": true,
  "name": "from",
  "type": "address"
}, {
  "indexed": true,
  "name": "to",
  "type": "address"
}, {
  "indexed": false,
  "name": "value",
  "type": "uint256"
}]

exporter.extractEventsWithAbi(
  topics = ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
  abi = transferEventAbi,
  event => {
    return console.log(event)
  })
```

**NOTE:** The data that is returned at the end of your pipeline should be a flat JSON

See in `examples` for more examples.

## Running with docker

The easiest way to test locally is to run your pipeline with docker-compose. You can checkout the current repo the run `docker-compose up --build` to run an example pipeline, which parses all ERC20 transfer events.