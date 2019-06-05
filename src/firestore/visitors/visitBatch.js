const visitBatch = async (toVisitDocs, visit, tick) => {
  return Promise.all(toVisitDocs.map(async doc => {
    return visit(doc).then(() => {
      tick(1)
    })
  }))
}

module.exports = visitBatch