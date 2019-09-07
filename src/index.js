#!/usr/bin/env node

const { runCommands, standardCommands } = require('./main')

function main() {
  runCommands(standardCommands)
}

main()
