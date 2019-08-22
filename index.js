const { Exporter } = require('san-exporter')
const Web3 = require('web3')
const _ = require('lodash')

async function getTimestamp(web3, blockNumber, blockTimestamps) {
  if (!blockTimestamps[blockNumber]) {
    blockTimestamps[blockNumber] = (await web3.eth.getBlock(blockNumber)).timestamp
  }

  return blockTimestamps[blockNumber]
}

async function processBlocks(web3, primaryKeyStart, fromBlock, toBlock, topics) {
  const blockTimestamps = {}

  const events = (await web3.eth.getPastLogs({
    fromBlock: web3.utils.numberToHex(fromBlock),
    toBlock: web3.utils.numberToHex(toBlock),
    topics: topics
  }))

  for (let i = 0; i < events.length; i++) {
    events[i].primaryKey = primaryKeyStart + i + 1
    events[i].timestamp = await getTimestamp(web3, events[i].blockNumber, blockTimestamps)
  }

  return events
}


exports.ETHExporter = class {
  constructor(exporterName) {
    this.blockInterval = parseInt(process.env.BLOCK_INTERVAL || "100");
    this.confirmations = parseInt(process.env.CONFIRMATIONS || "3");
    this.parityNode = process.env.PARITY_URL || "http://localhost:8545/";

    this.exporter = new Exporter(exporterName)

    this.kafkaTopic = process.env.KAFKA_TOPIC || exporterName.replace("-exporter", "").replace("-", "_")

    this.lastProcessedPosition = {
      blockNumber: parseInt(process.env.START_BLOCK || "-1"),
      primaryKey: parseInt(process.env.START_PRIMARY_KEY || "-1")
    }
  }

  /**
   * @param {string} value
   */
  set parityNode(value) {
    if (this._parityNode != value) {
      this._parityNode = value
      console.log(this._parityNode)
      this.web3 = new Web3(new Web3.providers.HttpProvider(this._parityNode))
    }
  }

  async initLastProcessedBlock() {
    const lastPosition = await this.exporter.getLastPosition()

    if (lastPosition) {
      this.lastProcessedPosition = lastPosition
      console.info(`Resuming export from position ${JSON.stringify(lastPosition)}`)
    } else {
      await this.exporter.savePosition(this.lastProcessedPosition)
      console.info(`Initialized exporter with initial position ${JSON.stringify(this.lastProcessedPosition)}`)
    }
  }

  async connect() {
    await this.exporter.connect()
    await this.initLastProcessedBlock()
  }

  decodeEvent(abi, event) {
    const names = abi.map(field => field.name)
    const result = exporter.web3.eth.abi.decodeLog(abi, event.data, _.slice(event.topics, 1));

    return _.pick(result, names)
  }

  /**
   * @param {function} eventHandler
   * @param {array} topics
   */
  async events(eventHandler, topics) {
    while (true) {
      const currentBlock = await this.web3.eth.getBlockNumber() - this.confirmations
      console.info(`Fetching transfer events for interval ${this.lastProcessedPosition.blockNumber}:${currentBlock}`)

      while (this.lastProcessedPosition.blockNumber < currentBlock) {
        const fromBlock = this.lastProcessedPosition.blockNumber + 1
        const toBlock = Math.min(this.lastProcessedPosition.blockNumber + this.blockInterval, currentBlock)

        const events = (await processBlocks(
          this.web3,
          this.lastProcessedPosition.primaryKey,
          fromBlock,
          toBlock,
          topics)
        ).map(eventHandler)

        console.info(`Storing and setting primary keys ${events.length} messages for blocks ${fromBlock}:${toBlock}`)
        await this.exporter.sendDataWithKey(events, "primaryKey")

        this.lastProcessedPosition.blockNumber = toBlock
        await this.exporter.savePosition(this.lastProcessedPosition)
      }

      // Sleep for 1 sec before checking for new blocks
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
};
