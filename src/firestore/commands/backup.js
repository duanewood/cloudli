const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const TraverseBatch = require('../api/traverseBatch')
const backup = require('../visitors/backup')
const utils = require('./utils')
const commonutils = require('../../commonutils')

const backupAction = async (docSetId, options, config, admin) => {

  try {
    
    const traverseOptions = utils.traverseOptionsFromCommandOptions(docSetId, options, config)

    const backupBasePath = options.basePath 
                      || (config.has('firestore.backupBasePath') ? config.get('firestore.backupBasePath') : null)
                      || './backups'

    // create a backup directory with timestamp under backupPath
    const dateDirName = new Date().toISOString().replace(/\:/g, '-')
    const backupPath = path.join(backupBasePath, dateDirName)

    const confirmed = options.bypassConfirm || await commonutils.confirm(`About to backup documents to ${backupPath}.`
                                    + ` Are you sure?`)
    if (confirmed) {
  
      const client = utils.getClient(config)
      const projectId = await client.getProjectId()
  
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath)
      }
  
      const visit = doc => backup(doc, backupPath)
      const batchOptions = {
        visit
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
  backupAction
}
