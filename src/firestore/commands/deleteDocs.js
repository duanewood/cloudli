const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const TraverseBatch = require('../api/traverseBatch')
const deleteVisitBatch = require('../visitors/deleteVisitBatch')
const utils = require('./utils')
const commonutils = require('../../commonutils')
const { backupAction } = require('./backup')

const deleteAction = async (docSetId, options, config, admin) => {

  try {
    
    const confirmed = await commonutils.confirm(`About to backup documents and then delete the documents.`
                                    + ` Are you sure?`)
    if (confirmed) {

      const backupOptions = {...options, bypassConfirm: true}
      await backupAction(docSetId, backupOptions, config, admin)

      const traverseOptions = utils.traverseOptionsFromCommandOptions(docSetId, options, config)
      const client = utils.getClient(config)
      const projectId = await client.getProjectId()
  
      const db = admin.firestore()
      const visitBatch = deleteVisitBatch(db)
      const batchOptions = {
        visitBatch
      }
      
      const path = traverseOptions.path || null
      const traverseBatch = new TraverseBatch(client, projectId, path, traverseOptions, batchOptions)
      return await traverseBatch.execute()    
    }
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  deleteAction
}
