const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const TraverseBatch = require('../api/traverseBatch')
const deleteVisitBatch = require('../visitors/deleteVisitBatch')
const utils = require('./utils')
const { logger, confirm } = require('../../commonutils')
const { backupAction } = require('./backup')

const deleteAction = async (docSetId, options, config, admin) => {

  try {
    
    if (!process.stdout.isTTY && !options.bypassConfirm) {
      throw new Error('--bypassConfirm option required when redirecting output')
    }

    const confirmed = options.bypassConfirm || await confirm(`About to backup documents and then delete the documents.`
                                    + ` Are you sure?`)
    if (confirmed) {

      const backupOptions = {...options, bypassConfirm: true}
      await backupAction(docSetId, backupOptions, config, admin)

      console.log('')
      logger.info(chalk.green(`Starting delete`))
      const traverseOptions = utils.traverseOptionsFromCommandOptions(docSetId, options, config)
      const client = utils.getClient(config)
      const projectId = await client.getProjectId()
  
      const db = admin.firestore()
      const verbose = !!options.verbose
      const visitBatch = deleteVisitBatch(db, verbose)
      const batchOptions = {
        visitBatch
      }
      
      const path = traverseOptions.path || null
      const traverseBatch = new TraverseBatch(client, projectId, path, traverseOptions, batchOptions)
      await traverseBatch.execute()    
      logger.info(chalk.green(`Completed delete of ${TraverseBatch.progressBar.curr} documents`))
    }
  } catch(error) {
    logger.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  deleteAction
}
