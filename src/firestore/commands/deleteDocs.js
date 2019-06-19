const admin = require('firebase-admin')
const fs = require('fs-extra')
const path = require('path')
const Colors = require('../../Colors')
const TraverseBatch = require('../api/TraverseBatch')
const deleteVisitBatch = require('../visitors/deleteVisitBatch')
const utils = require('./utils')
const { logger, confirm } = require('../../commonutils')
const { backupAction } = require('./backup')

const deleteAction = async (docSetId, options, config) => {

  try {
    
    if (!process.stdout.isTTY && !options.bypassConfirm) {
      throw new Error('--bypassConfirm option required when redirecting output')
    }

    const traverseOptions = utils.traverseOptionsFromCommandOptions(docSetId, options, config)

    logger.info(Colors.prep(`About to backup documents and then delete the documents.`))
    logger.info(Colors.prep('Documents include: ' + utils.traverseOptionsSummary(traverseOptions)))
    const confirmed = options.bypassConfirm || await confirm(Colors.warning(`Are you sure?`))
                                
    if (confirmed) {

      const backupOptions = {...options, bypassConfirm: true}
      await backupAction(docSetId, backupOptions, config)

      logger.info(Colors.start(`Starting delete`))
      const client = utils.getClient(config)
      const projectId = await client.getProjectId()
  
      utils.initAdmin(config)
      const db = admin.firestore()
      const verbose = !!options.verbose
      const visitBatch = deleteVisitBatch(db, verbose)
      const batchOptions = {
        visitBatch
      }
      
      const path = traverseOptions.path || null
      const traverseBatch = new TraverseBatch(client, projectId, path, traverseOptions, batchOptions)
      await traverseBatch.execute()    
      logger.info(Colors.complete(`Completed delete of ${traverseBatch.progressBar.curr} documents`))
    }
  } catch(error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  deleteAction
}
