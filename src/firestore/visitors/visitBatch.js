/**
 * Default batch visitor for TraverseBatch.  Visits each file individually.
 *
 * @param {doc[]} toVisitDocs array of documents to visit
 * @param {function} visit function to call with each document
 * @param {function} tick function to call when each document is completed
 */

const visitBatch = async (toVisitDocs, visit, tick) => {
  return Promise.all(
    toVisitDocs.map(async doc => {
      return visit(doc).then(() => {
        tick(1)
      })
    })
  )
}

module.exports = visitBatch
