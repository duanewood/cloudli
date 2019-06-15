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
    const datetime = new Date().toISOString()
    const dateDirName = datetime.replace(/\:/g, '-')
    const backupPath = path.join(backupBasePath, dateDirName)

    if (!process.stdout.isTTY && !options.bypassConfirm) {
      throw new Error('--bypassConfirm option required when redirecting output')
    }

    const summary = utils.traverseOptionsSummary(traverseOptions)
    logger.info(Colors.prep(`About to backup documents to ${backupPath}.`))
    logger.info(Colors.prep('Documents include: ' + summary))
    const confirmed = options.bypassConfirm || await confirm(Colors.warning(`Are you sure?`))

    if (confirmed) {
      logger.info(Colors.start(`Starting backup of documents to ${backupPath}`))
      const client = utils.getClient(config)
      const projectId = await client.getProjectId()
  
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath)
      }
  
      const files = []

      const visit = doc => backup(doc, backupPath, verbose, file => files.push(file))
      const batchOptions = {
        visit
      }
      
      const traversePath = traverseOptions.path || null
      const traverseBatch = new TraverseBatch(client, projectId, traversePath, traverseOptions, batchOptions)
      await traverseBatch.execute()
      
      const summaryFilename = path.join(backupPath, 'backup-summary.md')
      const backupSummary = `# Backup ${datetime}\n\n**Backup includes**: ${summary}\n\n## Files\n\n${files.map(file => `- ${file}`).join('\n')}`
      await fs.writeFile(summaryFilename, backupSummary)

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
