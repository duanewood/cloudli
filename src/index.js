#!/usr/bin/env node

const admin = require('firebase-admin')
const program = require('commander')
const config = require('config')
const chalk = require('chalk')

/**
 * PlanBundle Command Line Interface
 * 
 * Uses commander package for processing commands.
 * Command handlers are loaded from ./commands/<commandname>
 * 
 * Commands must export a function: addCommand(program, config, admin)
 * that add appropriate subcommands.
 * 
 *    @param {object} program - command line program object (see commander package)
 *    @param {object} config - configuration object - can be used by command for settings
 *    @param {object} admin - firebase admin api object
 * 
 * Command line uses subcommands based on command objects
 * Usage: node src/index.js [<subcommand> [<subcommand parameters> [--help]]] | --version | --help
 */

const commands = ['./elasticsearch/commands/elasticsearch', './firestore/commands/firestore']

function main() {
  if (!config.has('firebase.keyFilename')) {
    console.error(chalk.red(`Error: Missing firebase.keyFilename in config`))
    process.exit(1)
  }

  if (!config.has('firebase.databaseURL')) {
    console.error(chalk.red(`Error: Missing firebase.databaseURL in config`))
    process.exit(1)
  }

  const keyFilename = config.get('firebase.keyFilename')
  const databaseURL = config.get('firebase.databaseURL')
  const serviceAccount = require('../' + keyFilename)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL
  })

  const firestore = admin.firestore()
  const settings = { timestampsInSnapshots: true }
  firestore.settings(settings)

  program
    .version('0.1.0')

  // error on unknown commands
  program.on('command:*', () => {
    console.error(chalk.red('Invalid command: %s\nSee --help for a list of available commands.'), program.args.join(' '))
    process.exit(1)
  })

  commands.forEach(command => {
    const commandModule = require(`${command}`)
    commandModule.addCommand(program, config, admin)
  })

  // this will execute the appropriate command based on parameters
  try {
    program.parse(process.argv)
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`))
  }
}

main()
