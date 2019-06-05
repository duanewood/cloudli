const chalk = require('chalk')

const deleteVisitBatch = db => async (docRefs, tick) => {
  const batch = db.batch()
  docRefs.forEach(docRef => {
    const ref = db.doc(docRef.ref.path)
    batch.delete(ref, docRef.doc)
  })
  console.log(chalk.cyan(`deleteBatch: ${docRefs.length} files`))
  return batch.commit()
}

module.exports = deleteVisitBatch
