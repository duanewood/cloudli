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

  return traverseOptions
}

module.exports = {
  getClient,
  getRefProp,
  traverseOptionsFromCommandOptions
}