const { ETHExporter } = require('..')
const contractAbi = require('./compound_abi.json')

const exporter = new ETHExporter("compound-events")

const metrics = require('san-exporter/metrics')

exporter.extractEventsWithAbi(contractAbi, [], [], metrics)
