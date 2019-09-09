const { ETHExporter } = require('..')
const contractAbi = require('./compound_abi.json')

const exporter = new ETHExporter("compound-events")

exporter.extractEventsWithAbi(contractAbi)
