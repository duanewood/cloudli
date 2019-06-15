const firestore = require('@google-cloud/firestore')
const Colors = require('../../Colors')
const { isDocumentPath } = require('../api/apiutils')
const { logger } = require('../../commonutils')

const getClient = config => {
  if (!config.has('firebase.keyFilename')) {
    logger.error(Colors.error(`Error: Missing firebase.keyFilename in config`))
    process.exit(1)
  }  

  const client = new firestore.v1.FirestoreClient({
    keyFilename: config.get('firebase.keyFilename')
  })

  return client
}

/**
 * Gets a property from an object that may optionally be a reference to property in the config.
 * If a reference is used the reference property will be {baseProp}Ref.  The value of the reference 
 * property will be the full path to the referenced property in config.
 * 
 * @param {Config} config The config object (from node-config).  @see https://github.com/lorenwest/node-config
 * @param {object} obj The object containing property baseProp or {baseProp}Ref
 * @param {*} baseProp The name path to the base property in obj.  Will look for baseProp or {baseProp}Ref.
 * @return the value of the resolved property or null if not found
 */
const getRefProp = (config, obj, baseProp) => {
  const refProp = baseProp + 'Ref'
  if (obj[baseProp] && obj[refProp]) {
    throw new Error(`Invalid property: '${baseProp}' and '${refProp}' cannot be used together`)
  }

  if (obj[baseProp]) {
    return obj[baseProp]
  } else if (obj[refProp]) {
    const ref = obj[refProp]
    if (config.has(ref)) {
      return config.get(ref)
    } else {
      throw new Error(`Missing referenced config property '${ref}' referenced from ${refProp}`)
    }
  } else {
    return null
  }
}

const traverseOptionsFromCommandOptions = (docSetId, options, config) => {
  let traverseOptions = {}
  if (docSetId) {  
    if (options.path || options.collectionId || options.recursive || options.shallow) { 
      throw new Error(`The optional docSetId cannot be specified with any of these options: path, collectionId, recursive, shallow`)
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
      throw new Error(`recursive and shallow options cannot be specified together`)
    }
  }

  if (options.shallow) {
    traverseOptions.shallow = true
  }

  if (options.filter) {
    if (options.idfilter) {
      throw new Error(`filter and idfilter options cannot be specified together`)
    }
    traverseOptions.filterRegex = options.filter
  }
  
  if (options.idfilter) {
    traverseOptions.filterRegex = `^.*\/${options.idfilter}$`
  }

  if (options.min) {
    traverseOptions.min = true
  }

  // If path is not specified, then starts with all root collections.
  // If shallow is not specified, make recursive, which will default to all files.
  // Also, add an indicator that allFiles are selected for informational purposes.
  if (!traverseOptions.path && !traverseOptions.shallow) {
    traverseOptions.recursive = true
    traverseOptions.allFiles = true
  } else if (!traverseOptions.path && traverseOptions.recursive) {
    traverseOptions.allFiles = true
  }

  return traverseOptions
}

const traverseOptionsSummary = (traverseOptions) => {
  let summary = ''
  if (traverseOptions.allFiles) {
    summary = `All documents in the database`
  } else if (traverseOptions.path) {
    if (isDocumentPath(traverseOptions.path)) {
      summary += `The document '${traverseOptions.path}'`
      if (traverseOptions.recursive) {
        summary += ' and all documents in all collections under the document (recursive).'
      } else if (traverseOptions.shallow) {
        summary += ' and all documents in the collections directly under the document (shallow).'
      } else {
        summary += '.'
      }
    } else {
      summary += `All documents in the collection '${traverseOptions.path}'`
      if (traverseOptions.recursive) {
        summary += ' and all documents in all collections under the collection (recursive).'
      } else {
        // Note: when path is a collection, it is inherently shallow if not recursive
        summary += '.'
      }
    }
  }

  if (traverseOptions.collectionId) {
    if (traverseOptions.filterRegex) {
      summary += ` Only documents with collection id '${traverseOptions.collectionId}' and matching regex '${traverseOptions.filterRegex}' will be included.`
    } else {
      summary += ` Only documents with collection id '${traverseOptions.collectionId}'.`
    }
  } else if (traverseOptions.filterRegex) {
    summary += ` Only documents with a path matching regex '${traverseOptions.filterRegex}' will be included.`
  }
  if (traverseOptions.min) {
    summary += ' Only path and id are returned.'
  }

  return summary
}

module.exports = {
  getClient,
  getRefProp,
  traverseOptionsFromCommandOptions,
  traverseOptionsSummary
}