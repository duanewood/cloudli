const debug = require('debug')('bundle:delete')
const Colors = require('../../Colors')
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

  debug(Colors.debug(`Deleting ${docRefs.length} files`))
  return batch.commit().then(() => {
    tick(docRefs.length)
  })
}

module.exports = deleteVisitBatch
