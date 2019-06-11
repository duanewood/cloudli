#!/usr/bin/env node

// pinoDebug must be first - 
const pinoDebug = require('pino-debug')

const admin = require('firebase-admin')
const program = require('commander')
const config = require('config')
const chalk = require('chalk')
const { initLogger, getLogger } = require('./commonutils')

/**
 * PlanBundle Command Line Interface
 * 
 * Uses commander package for processing commands.
 * Command handlers are loaded based on commands array below.
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
 * 
 * Logging uses pino:  https://github.com/pinojs/pino
 * 
 * Set log level using:
 * 
 *    export LEVEL=info
 * 
 * The default level is info.
 * Available levels are: 'fatal', 'error', 'warn', 'info', 'debug', 'trace' or 'silent'
 * 
 * Supports debug logging using debug module (https://github.com/visionmedia/debug)
 * Enable debug logging using:
 * 
 *    export DEBUG=*
 * 
 * For bundle specific modules:
 * 
 *    For all bundle module debug:  export DEBUG=bundle:*
 *    For specific bundle module debug (example):  export DEBUG=bundle:traverseBatch
 */

const commands = [
  './elasticsearch/commands/elasticsearch', 
  './firestore/commands/firestore',
  './test/commands/test'
]

function main() {
  program
    .version('0.1.0')

  // get from config - default is true
  const prettyPrint = config.has('logger.prettyPrint') ? config.get('logger.prettyPrint') : true
  initLogger(pinoDebug, prettyPrint)
  const logger = getLogger()

  if (!config.has('firebase.keyFilename')) {
    logger.error(chalk.red(`Error: Missing firebase.keyFilename in config`))
    process.exit(1)
  }

  if (!config.has('firebase.databaseURL')) {
    logger.error(chalk.red(`Error: Missing firebase.databaseURL in config`))
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

  commands.forEach(command => {
    const commandModule = require(`${command}`)
    commandModule.addCommand(program, config, admin)
  })

  // error on unknown commands
  program.on('command:*', () => {
    logger.error(chalk.red('Invalid command: %s\nSee --help for a list of available commands.'), program.args.join(' '))
    process.exit(1)
  })

  program.on('--help', () => {
    logger.info('')
    logger.info('Logging:')
    logger.info('  $ export LEVEL=info')
    logger.info(`    Level default is 'info'`)
    logger.info(`    Levels are: 'fatal', 'error', 'warn', 'info', 'debug', 'trace' or 'silent'`)
    logger.info('')
    logger.info('Debug Logging examples (LEVEL must be debug or higher):')
    logger.info('  $ export DEBUG=*')  
    logger.info('  $ export DEBUG=bundle:*')  
    logger.info('  $ export DEBUG=bundle:traverseBatch')  
  })  

  if (!process.argv.slice(2).length) {
    program.outputHelp()
  }

  // this will execute the appropriate command based on parameters
  try {
    program.parse(process.argv)
  } catch (error) {
    logger.error(chalk.red(`Error: ${error.message}`))
  }
}

main()
