const chalk = require('chalk')
const showDoc = require('../visitors/showDoc')
const apiutils = require('../api/apiutils')
const { logger } = require('../../commonutils')

const getAction = async (path, options, config, admin) => {

  try {
    const db = admin.firestore()
    const visit = doc => showDoc(doc, options.verbose)

    if (apiutils.isCollectionPath(path)) {
      const collectionRef = db.collection(path)
      return collectionRef.get().then(snapshot => {
        return Promise.all(snapshot.docs.map(async doc => {
           return visit(doc)
        }))
      })
    } else { // documentPath
      const docRef = db.doc(path)
      return docRef.get().then(async doc => {
        return visit(doc)
      })
    }
  } catch(error) {
    logger.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  getAction
}

