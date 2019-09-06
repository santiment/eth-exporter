const assert = require("assert")
const { ETHExporter } = require("..")
const erc20Abi = require('./erc20_abi.json')

const transferEvent = {
  "address": "0xdac17f958d2ee523a2206206994597c13d831ec7",
  "blockHash": "0xe8946b8f7ac5557d84bd0cdb3b600803a2132c2965e89ff0c225941376315cfb",
  "blockNumber": 8425160,
  "data": "0x000000000000000000000000000000000000000000000000000000000c93fbb1",
  "logIndex": "0xbb",
  "removed": false,
  "timestamp": 12341234,
  "topics": [
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    "0x000000000000000000000000a8ae6549c66c59aa55d50377948dfbe362d56b03",
    "0x00000000000000000000000010b6b56d69a0a188bf5815bfd87b898d81b8d357"
  ],
  "transactionHash": "0x283b610fed01250332ae15cea1551e63bb42f010e29b410443ae283fe0dbd49d",
  "transactionIndex": "0x56",
  "transactionLogIndex": "0x0",
  "type": "mined",
  "primaryKey": 1
}


describe('decodeEvent', function () {
  it("decodes a transfer event properly", function () {
    exporter = new ETHExporter("test-exporter")

    decodedEvent = exporter.decodeEvent(erc20Abi, transferEvent)

    assert.equal(
      decodedEvent["decoded"],
      JSON.stringify({
        "0": "0xa8aE6549c66C59aa55D50377948dFBE362d56B03",
        "1": "0x10B6B56d69A0A188bf5815BfD87B898D81b8D357",
        "2": "211024817",
        "__length__": 3,
        "from": "0xa8aE6549c66C59aa55D50377948dFBE362d56B03",
        "to": "0x10B6B56d69A0A188bf5815BfD87B898D81b8D357",
        "value": "211024817"
      })
    )

    assert.equal(
      decodedEvent["name"],
      "Transfer"
    )
  })
})