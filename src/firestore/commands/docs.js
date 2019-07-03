const Colors = require('../../Colors')
const TraverseBatch = require('../api/TraverseBatch')
const showDoc = require('../visitors/showDoc')
const utils = require('./utils')
const { logger } = require('../../commonutils')

const getDocsAction = async (docSetId, options, config) => {
  try {
    const traverseOptions = utils.traverseOptionsFromCommandOptions(
      docSetId,
      options,
      config
    )

    logger.info(
      Colors.start(
        'Getting documents including: ' +
          utils.traverseOptionsSummary(traverseOptions)
      )
    )
    const client = utils.getClient(config)
    const projectId = await client.getProjectId()

    const path = traverseOptions.path || null
    const verbose = options.verbose || null
    const visit = doc => showDoc(doc, verbose)
    const batchOptions = { visit }
    const traverseBatch = new TraverseBatch(
      client,
      projectId,
      path,
      traverseOptions,
      batchOptions
    )
    await traverseBatch.execute()
    logger.info(
      Colors.complete(
        `Completed getting ${traverseBatch.progressBar.curr} documents`
      )
    )
  } catch (error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  getDocsAction
}
