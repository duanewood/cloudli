const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const TraverseBatch = require('../api/traverseBatch')
const diff = require('../visitors/diff')
const utils = require('./utils')
const commonutils = require('../../commonutils')

const diffAction = async (basePath, docSetId, options, config, admin) => {

  try {
    if (!fs.existsSync(basePath)) {
      throw new Error(`${basePath}' does not exist.`)
    }

    if (!fs.statSync(basePath).isDirectory()) {
      throw new Error(`${basePath}' is not a directory.`)      
    }

    const traverseOptions = utils.traverseOptionsFromCommandOptions(docSetId, options, config)

    const confirmed = await commonutils.confirm(`About to diff firestore documents with files under ${basePath}.`
                                    + ` Are you sure?`)
    if (confirmed) {
      const client = utils.getClient(config)
      const projectId = await client.getProjectId()
  
      const path = traverseOptions.path || null
      const visit = doc => diff(doc, basePath)
      const traverseBatch = new TraverseBatch(client, projectId, path, traverseOptions, visit)
      return await traverseBatch.execute()    
    }
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  diffAction
}
