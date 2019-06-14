const Colors = require('../../Colors')
const showDoc = require('../visitors/showDoc')
const apiutils = require('../api/apiutils')
const { logger } = require('../../commonutils')

const getAction = async (path, options, config, admin) => {

  try {
    const db = admin.firestore()
    const visit = doc => showDoc(doc, options.verbose)

    if (apiutils.isCollectionPath(path)) {
      logger.info(Colors.start(`Getting documents in collection ${path}`))
      const collectionRef = db.collection(path)
      await collectionRef.get().then(snapshot => {
        if (snapshot.empty) {
          return Promise.reject(new Error(`Collection '${path}' not found`))
        }
        return Promise.all(snapshot.docs.map(async doc => {
           return visit(doc)
        }))
      })
      logger.info(Colors.complete(`Completed getting documents`))
    } else { // documentPath
      logger.info(Colors.start(`Getting document ${path}`))
      const docRef = db.doc(path)
      await docRef.get().then(async doc => {
        if (!doc.exists) {
          return Promise.reject(new Error(`Document '${path}' not found`))
        }
        return visit(doc)
      })
      logger.info(Colors.complete(`Completed getting document`))
    }
  } catch(error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  getAction
}

