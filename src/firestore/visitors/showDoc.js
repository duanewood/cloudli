const chalk = require('chalk')
const jsome = require('jsome')
const { logger } = require('../../commonutils')

const visit = async (doc, verbose) => {
  if (verbose) {
    logger.info(chalk.yellow(doc.ref.path))
    logger.info(jsome.getColoredString(doc.data()))
    logger.info('')
  } else {
    logger.info(chalk.green(doc.ref.path))
  }
}

module.exports = visit