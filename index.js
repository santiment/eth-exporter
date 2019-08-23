const { formatters } = require('web3-core-helpers')
const { Exporter } = require('san-exporter')
const Web3 = require('web3')
const _ = require('lodash')

async function getTimestamp(web3, blockNumber, blockTimestamps) {
  if (!blockTimestamps[blockNumber]) {
    blockTimestamps[blockNumber] = (await web3.parity.getBlockHeaderByNumber(blockNumber)).timestamp
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

    this.isConnected = false
  }

  /**
   * @param {string} value
   */
  set parityNode(value) {
    if (this._parityNode != value) {
      this._parityNode = value
      this.web3 = new Web3(this._parityNode)

      this.web3.extend({
        property: "parity",
        methods: [{
          name: "getBlockHeaderByNumber",
          call: "parity_getBlockHeaderByNumber",
          params: 1,
          inputFormatter: [formatters.inputDefaultBlockNumberFormatter],
          outputFormatter: formatters.outputBlockFormatter
        }]
      })
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
    if (this.isConnected) return

    await this.exporter.connect()
    await this.initLastProcessedBlock()

    this.isConnected = true
  }

  /**
   * Decodes an event given an ABI
   *
   * @param {array} abi The ABI describing the data in the event
   * @param {object} event The event that needs to be decoded
   *
   * @returns The decoded event data or `null` if the data can't be decoded
   */
  decodeEvent(abi, event) {
    try {
      const names = abi.map(field => field.name)
      let result = this.web3.eth.abi.decodeLog(abi, event.data, _.slice(event.topics, 1));

      result = _.pick(result, names)

      result.contract = event.address
      result.transactionHash = event.transactionHash
      result.timestamp = event.timestamp
      result.blockNumber = event.blockNumber

      return result
    } catch (e) {
      console.error(`Error decoding ${JSON.stringify(event)}: ${e}`)
      return null
    }
  }

  /**
   *
   * @param {array} topics A list of topics to monitor
   * @param {array} abi The ABI of the events that will be used to decode them
   * @param {function} eventHandler An optional function for additionally processing the events
   */
  async extractEventsWithAbi(topics, abi, eventHandler) {
    this.extractEvents(topics, event => {
      const decodedEvent = this.decodeEvent(abi, event)

      if (!decodedEvent) return

      if (eventHandler) {
        return eventHandler(decodedEvent)
      }

      return decodedEvent
    })
  }

  /**
   * Streams the events from the ETH blockchain matching a given list of topics.
   * Invokes the `eventHandler` for each found event. The handler should return
   * the parsed event, which should be stored further in the pipeline. If the
   * handler returns `null`, nothing will be stored in the pipeline.
   *
   * @param {array} topics An array of topics to listen for
   * @param {function} eventHandler A function which will be invoked to process each event
   */
  async extractEvents(topics, eventHandler) {
    if (!this.isConnected) {
      await this.connect()
    }

    while (true) {
      const currentBlock = await this.web3.eth.getBlockNumber() - this.confirmations
      console.info(`Fetching transfer events for interval ${this.lastProcessedPosition.blockNumber}:${currentBlock}`)

      while (this.lastProcessedPosition.blockNumber < currentBlock) {
        const fromBlock = this.lastProcessedPosition.blockNumber + 1
        const toBlock = Math.min(this.lastProcessedPosition.blockNumber + this.blockInterval, currentBlock)

        let events = (await processBlocks(
          this.web3,
          this.lastProcessedPosition.primaryKey,
          fromBlock,
          toBlock,
          topics)
        ).map(eventHandler)

        events = _.compact(events)

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
