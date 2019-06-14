const fs = require('fs-extra')
const path = require('path')
const Colors = require('../../Colors')
const TraverseBatch = require('../api/TraverseBatch')
const backup = require('../visitors/backup')
const utils = require('./utils')
const { logger, confirm } = require('../../commonutils')

const backupAction = async (docSetId, options, config, admin) => {

  try {
    
    const traverseOptions = utils.traverseOptionsFromCommandOptions(docSetId, options, config)

    const backupBasePath = options.basePath 
                      || (config.has('firestore.backupBasePath') ? config.get('firestore.backupBasePath') : null)
                      || './backups'
                      
    const verbose = !!options.verbose

    // create a backup directory with timestamp under backupPath
    const dateDirName = new Date().toISOString().replace(/\:/g, '-')
    const backupPath = path.join(backupBasePath, dateDirName)

    if (!process.stdout.isTTY && !options.bypassConfirm) {
      throw new Error('--bypassConfirm option required when redirecting output')
    }

    logger.info(Colors.prep(`About to backup documents to ${backupPath}.`))
    logger.info(Colors.prep('Documents include: ' + utils.traverseOptionsSummary(traverseOptions)))
    const confirmed = options.bypassConfirm || await confirm(Colors.warning(`Are you sure?`))

    if (confirmed) {
      logger.info(Colors.start(`Starting backup of documents to ${backupPath}`))
      const client = utils.getClient(config)
      const projectId = await client.getProjectId()
  
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath)
      }
  
      const visit = doc => backup(doc, backupPath, verbose)
      const batchOptions = {
        visit
      }
      
      const path = traverseOptions.path || null
      const traverseBatch = new TraverseBatch(client, projectId, path, traverseOptions, batchOptions)
      await traverseBatch.execute()    
      logger.info(Colors.complete(`Completed backup of ${traverseBatch.progressBar.curr} documents`))
    }
  } catch(error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  backupAction
}
