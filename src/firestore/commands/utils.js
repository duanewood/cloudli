const firestore = require('@google-cloud/firestore')
const chalk = require('chalk')

const getClient = config => {
  if (!config.has('firebase.keyFilename')) {
    console.error(chalk.red(`Error: Missing firebase.keyFilename in config`))
    process.exit(1)
  }  

  const client = new firestore.v1.FirestoreClient({
    keyFilename: config.get('firebase.keyFilename')
  })

  return client
}

const traverseOptionsFromCommandOptions = (docSetId, options, config) => {
  let traverseOptions = {}
  if (docSetId) {  
    if (options.path || options.collectionId || options.recursive || options.shallow 
                     || options.filterRegex) {
      throw new Error(`The optional docset cannot be specified with any of these options: path, collectionId, recursive, shallow, filterRegex`)
    }

    if (!config.has(`firestore.docSets.${docSetId}`)) {
      throw new Error(`Missing docSet ${docSetId} in config`)
    }
    docSet = config.get(`firestore.docSets.${docSetId}`)
    traverseOptions = { ...docSet }
  }

  if (options.path) {
    traverseOptions.path = options.path
  }

  if (options.collectionId) {
    traverseOptions.collectionId = options.collectionId
  }

  if (options.recursive) {
    traverseOptions.recursive = true
    if (options.shallow) {
      throw new Error(`Recursive and shallow options cannot be specified together`)
    }
  }

  if (options.shallow) {
    traverseOptions.shallow = true
  }

  if (options.filter) {
    traverseOptions.filterRegex = options.filter
  }
  
  if (options.min) {
    traverseOptions.min = true
  }

  return traverseOptions
}

module.exports = {
  getClient,
  traverseOptionsFromCommandOptions
}