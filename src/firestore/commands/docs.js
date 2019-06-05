const chalk = require('chalk')
const TraverseBatch = require('../api/traverseBatch')
const showDoc = require('../visitors/showDoc')
const utils = require('./utils')

const getDocsAction = async (docSetId, options, config, admin) => {

  try {
    
    const traverseOptions = utils.traverseOptionsFromCommandOptions(docSetId, options, config)
    const client = utils.getClient(config)
    const projectId = await client.getProjectId()

    const path = traverseOptions.path || null
    const verbose = options.verbose || null
    const visit = doc => showDoc(doc, verbose)
    const batchOptions = { visit }
    const traverseBatch = new TraverseBatch(client, projectId, path, traverseOptions, batchOptions )
    return await traverseBatch.execute()    

  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  getDocsAction
}
