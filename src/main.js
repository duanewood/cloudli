// pinoDebug must be first
const pinoDebug = require('pino-debug')

const program = require('commander')
const config = require('config')
const chalk = require('chalk')
const Colors = require('./Colors')
const { initLogger, getLogger, confirm } = require('./commonutils')

const standardCommandPaths = [
  './elasticsearch/commands/elasticsearch',
  './firestore/commands/firestore'
]
const standardCommands = []
let firestoreUtils = null

/**
 * Cloudli Command Line Interface
 *
 * Uses commander package for processing commands.
 * Command handlers are loaded based on commands array below.
 *
 * Commands must export a function: addCommand(program, config)
 * that add appropriate subcommands.
 *
 *    @param {object} program - command line program object (see commander package)
 *    @param {object} config - configuration object - can be used by command for settings
 *
 * Command line uses subcommands based on command objects
 * Usage: node src/index.js [<subcommand> [<subcommand options> [--help]]] | --version | --help
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
 * Supports debug logging using debug module (https://github.com/visionmedia/debug).
 * Enable debug logging using:
 *
 *    export DEBUG=*
 *
 * To filter debug modules:
 *
 *    For all cloudlo module debug:  export DEBUG=cloudli:*
 *    For specific cloudli module debug (example):  export DEBUG=cloudli:traverseBatch
 *
 * Note: LEVEL must be set to 'debug' or higher for debug messages to be included.
 *
 * Modules with debug:
 *
 *    cloudli:delete
 *    cloudli:restore
 *    cloudli:traverseBatch
 *    cloudli:elasticsearch
 */

function runCommands(commands) {
  program.version('1.4.3')

  const logger = getLogger()

  try {
    commands.forEach(command => {
      // const commandModule = require(`${command}`)
      command.addCommand(program, config)
    })

    // error on unknown commands
    program.on('command:*', () => {
      logger.error(
        chalk.red(
          'Invalid command: %s\nSee --help for a list of available commands.'
        ),
        program.args.join(' ')
      )
      process.exit(1)
    })

    program.on('--help', () => {
      logger.info('')
      logger.info('Logging:')
      logger.info('  $ export LEVEL=info')
      logger.info(`    Level default is 'info'`)
      logger.info(
        `    Levels are: 'fatal', 'error', 'warn', 'info', 'debug', 'trace' or 'silent'`
      )
      logger.info('')
      logger.info('Debug Logging examples (LEVEL must be debug or higher):')
      logger.info('  $ export DEBUG=*')
      logger.info('  $ export DEBUG=cloudli:*')
      logger.info('  $ export DEBUG=cloudli:traverseBatch')
    })

    if (!process.argv.slice(2).length) {
      program.outputHelp()
    }

    // this will execute the appropriate command based on parameters
    program.parse(process.argv)
  } catch (error) {
    logger.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

function initStandardCommands() {
  standardCommandPaths.forEach(commandPath => {
    standardCommands.push(require(commandPath))
  })
}

function initGCloudCredentials(logger) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    logger.info(
      Colors.info(`Using Google Default Credentials: ${ process.env.GOOGLE_APPLICATION_CREDENTIALS }`)
    )
  } else {
    if (!config.has('firebase.keyFilename')) {
      logger.error(
        Colors.error(`Error: Missing firebase.keyFilename in config`)
      )
      process.exit(1)
    }
  
    const keyFilename = config.get('firebase.keyFilename')    
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilename
    logger.info(
      Colors.info(`Setting Google Default Credentials: ${ process.env.GOOGLE_APPLICATION_CREDENTIALS }`)
    )
  }
}

function init() {
  // get from config - default is true
  const prettyPrint = config.has('logger.prettyPrint')
    ? config.get('logger.prettyPrint')
    : true
  const logger = initLogger(pinoDebug, prettyPrint)
  initGCloudCredentials(logger)
  initStandardCommands()
}

function getFirestoreUtils() {
  if (!firestoreUtils) {
    const {
      getClient,
      initAdmin,
      getRefProp,
      traverseOptionsFromCommandOptions,
      traverseOptionsSummary
    } = require('./firestore/commands/utils')
    const TraverseBatch = require('./firestore/api/TraverseBatch')
    const FirestoreMapper = require('./firestore/api/FirestoreMapper')

    firestoreUtils = {
      TraverseBatch,
      FirestoreMapper,
      getClient,
      initAdmin,
      getRefProp,
      traverseOptionsFromCommandOptions,
      traverseOptionsSummary
    }
  }

  return firestoreUtils
}

init()
const logger = getLogger()

const esapi = require('./elasticsearch/api/esapi')
const { getIndexConfigsFromParams, formatTemplateString } = require('./elasticsearch/commands/utils')
const { esAction } = require('./elasticsearch/commands/elasticsearch')

const elasticsearch = {
  ...esapi,
  getIndexConfigsFromParams,
  formatTemplateString,
  esAction
}

module.exports = {
  runCommands,
  standardCommands,
  logger,
  Colors,
  confirm,
  getFirestoreUtils,
  elasticsearch
}
