const Colors = require('../../Colors')
const { logger } = require('../../commonutils')

const visit = async (db, doc, patchFns, verbose) => {
  let docData = doc.data()
  let patched = false
  for (const patchFn of patchFns) {
    const patchedDoc = patchFn(doc)
    if (patchedDoc) {
      if (verbose) {
        logger.info(Colors.info(`Patching ${doc.ref.path}`))
      }
      patched = true
      docData = patchedDoc
    }
  }

  if (patched) {
    const ref = db.doc(doc.ref.path)
    return ref.set(docData)
  }
}

module.exports = visit
