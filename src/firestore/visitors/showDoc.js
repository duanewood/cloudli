const Colors = require('../../Colors')
const jsome = require('jsome')
const { logger } = require('../../commonutils')

const visit = async (doc, verbose) => {
  if (verbose) {
    logger.info(Colors.result(doc.ref.path))
    const data = doc.data()
    logger.info(jsome.getColoredString(doc.data()))
    logger.info('')
  } else {
    logger.info(Colors.info(doc.ref.path))
  }
}

module.exports = visit