const { ETHExporter } = require('..')

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
