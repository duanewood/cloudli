const inquirer = require('inquirer')
const pino = require('pino')
const prettifier = require('./chalk-prettier')

/**
 * Displays a confirmation prompt
 * 
 * @param {string} prompt
 */
module.exports.confirm = async function confirm(prompt) {
  return inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message: prompt,
    default: false
  }).then(answers => {
    if (answers.confirm) {
      return answers.confirm
    } else {
      return false
    }
  })
}

module.exports.initLogger = function initLogger(pinoDebug, pretty) {
  const prettyPrint = (pretty === undefined) ? process.stdout.isTTY : pretty
  // logger = pino({ prettyPrint, prettifier })
  const logger = pino({ prettyPrint, prettifier, level: process.env.LEVEL || 'info' })
  pinoDebug(logger)

  // Note: To map debug messages to pino levels:
  //
  // pinoDebug(logger, {
  //   auto: true, // default
  //   map: {
  //     'example:server': 'info',
  //     'express:router': 'debug',
  //     '*': 'trace' // everything else - trace
  //   }
  // })

  module.exports.logger = logger
  return logger
}

module.exports.getLogger = function getLogger() {
  return module.exports.logger
}
