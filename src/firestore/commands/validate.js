const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const TraverseBatch = require('../api/traverseBatch')
const validate = require('../visitors/validate')
const utils = require('./utils')
const commonutils = require('../../commonutils')
const SchemaValidator = require('../api/SchemaValidator')

const validateAction = async (docSetId, options, config, admin) => {

  try {
    
    const traverseOptions = utils.traverseOptionsFromCommandOptions(docSetId, options, config)

    const client = utils.getClient(config)
    const projectId = await client.getProjectId()

    if (!config.has('schemas')) {
      throw new Error(`Missing schemas object in config`)
    }
    const validator = new SchemaValidator(config.get('schemas'))
    if (!config.has('firestore.types')) {
      throw new Error(`Missing firestore.types array in config`)
    }
    const types = config.get('firestore.types')
    if (!Array.isArray(types) || types.length === 0) {
      throw new Error(`Missing firestore.types array in config`)
    }
    const visit = doc => validate(doc, types, validator)

    const batchOptions = {
      visit
    }
    
    const path = traverseOptions.path || null
    const traverseBatch = new TraverseBatch(client, projectId, path, traverseOptions, batchOptions)
    return await traverseBatch.execute()    
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  validateAction
}
