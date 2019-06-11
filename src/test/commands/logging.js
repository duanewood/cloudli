const chalk = require('chalk')
const { logger } = require('../../commonutils')

const testAction = async (options, config, admin) => {

  try {
    logger.info(chalk.green('Test Action Start'))
    logger.info(chalk.yellow('Test'))
    logger.info(chalk.blue('Info msg'))
    logger.debug(chalk.yellow('Debug msg'))
    logger.warn(chalk.yellow('Warn msg'))
    logger.error(chalk.red('Error msg'))
    logger.info(chalk.green('Test Action End'))
  } catch(error) {
    logger.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  testAction
}

