const chalk = require('chalk')
const { logger } = require('../../commonutils')

const deleteVisitBatch = (db, verbose) => async (docRefs, tick) => {
  const batch = db.batch()
  docRefs.forEach(docRef => {
    const ref = db.doc(docRef.ref.path)
    if (verbose) {
      logger.info(chalk.green(`Deleting ${docRef.ref.path}`))  
    }
    batch.delete(ref, docRef.doc)
  })

  logger.debug(chalk.cyan(`Deleting ${docRefs.length} files`))
  return batch.commit()
}

module.exports = deleteVisitBatch
