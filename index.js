const { formatters } = require('web3-core-helpers')
const { Exporter } = require('san-exporter')
const Web3 = require('web3')
const _ = require('lodash')

const USE_PARITY_BLOCK_HEADERS = process.env.USE_PARITY_BLOCK_HEADERS == "1" || process.env.USE_PARITY_BLOCK_HEADERS == "true"

function findJSONInterface(web3, abi, topic) {
  return abi.find((jsonInterface) =>
    jsonInterface.type == "event" && web3.eth.abi.encodeEventSignature(jsonInterface) == topic
  )
}

function topicsFromAbi(web3, abi) {
  return abi
    .filter((jsonInterface) => jsonInterface.type == "event")
    .map((jsonInterface) => web3.eth.abi.encodeEventSignature(jsonInterface))
}

async function getTimestamp(web3, blockNumber, blockTimestamps) {
  if (!blockTimestamps[blockNumber]) {
    if (USE_PARITY_BLOCK_HEADERS) {
      blockTimestamps[blockNumber] = (await web3.parity.getBlockHeaderByNumber(blockNumber)).timestamp
    } else {
      blockTimestamps[blockNumber] = (await web3.eth.getBlock(blockNumber)).timestamp
    }
  }

  return blockTimestamps[blockNumber]
}

async function processBlocks(web3, primaryKeyStart, fromBlock, toBlock, topics, address) {
  const blockTimestamps = {}

  const events = (await web3.eth.getPastLogs({
    fromBlock: web3.utils.numberToHex(fromBlock),
    toBlock: web3.utils.numberToHex(toBlock),
    topics: topics,
    address: address
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
      const jsonInterface = findJSONInterface(this.web3, abi, event.topics[0])
      let result = this.web3.eth.abi.decodeLog(jsonInterface.inputs, event.data, _.slice(event.topics, 1));

      event["name"] = jsonInterface.name
      event["decoded"] = JSON.stringify(result)

      return event
    } catch (e) {
      console.error(`Error decoding ${JSON.stringify(event)}: ${e}`)
      return null
    }
  }

  /**
   *
   * @param {array} abi The ABI of the events that will be used to decode them
   * @param {array} topics A list of topics to monitor. If not specified all the events will be watched
   * @param {array} address A contract address or a list of contract addresses to filter the events
   * @param {function} eventHandler An optional function for additionally processing the events
   */
  async extractEventsWithAbi(abi, topics, address, eventHandler) {
    if (!topics) {
      topics = [topicsFromAbi(this.web3, abi)]
    }

    return this.extractEvents(topics, address, event => {
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
  async extractEvents(topics, address, eventHandler) {
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
          topics,
          address)
        ).map(eventHandler)

        events = _.compact(events)

        console.info(`Storing and setting primary keys ${events.length} messages for blocks ${fromBlock}:${toBlock}`)
        await this.exporter.sendDataWithKey(events, "primaryKey")

        this.lastProcessedPosition.blockNumber = toBlock
        this.lastProcessedPosition.primaryKey += events.length
        await this.exporter.savePosition(this.lastProcessedPosition)
      }

      // Sleep for 1 sec before checking for new blocks
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
};
