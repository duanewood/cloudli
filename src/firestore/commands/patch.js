const admin = require('firebase-admin')
const path = require('path')
const Colors = require('../../Colors')
const TraverseBatch = require('../api/TraverseBatch')
const patchVisit = require('../visitors/patch')
const utils = require('./utils')
const { logger, confirm } = require('../../commonutils')
const { backupAction } = require('./backup')

const patchAction = async (patches, docSetId, options, config) => {
  try {
    if (!process.stdout.isTTY && !options.bypassConfirm) {
      throw new Error('--bypassConfirm option required when redirecting output')
    }

    const traverseOptions = utils.traverseOptionsFromCommandOptions(
      docSetId,
      options,
      config
    )

    const patchFns = getPatchFunctions(patches)

    logger.info(
      Colors.prep(
        `About to backup documents and then patch the documents using patches: ${patches}.`
      )
    )
    logger.info(
      Colors.prep(
        'Documents include: ' + utils.traverseOptionsSummary(traverseOptions)
      )
    )
    const confirmed =
      options.bypassConfirm || (await confirm(Colors.warning(`Are you sure?`)))

    if (confirmed) {
      const backupOptions = { ...options, bypassConfirm: true }
      await backupAction(docSetId, backupOptions, config)

      logger.info(Colors.start(`Starting patch`))
      const client = utils.getClient(config)
      const projectId = await client.getProjectId()

      utils.initAdmin(config)
      const db = admin.firestore()

      const verbose = !!options.verbose
      const visit = doc => patchVisit(db, doc, patchFns, verbose)
      const batchOptions = {
        visit
      }

      const path = traverseOptions.path || null
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
          `Completed patch of ${traverseBatch.progressBar.curr} documents`
        )
      )
    }
  } catch (error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

function getPatchFunctions(patches) {
  const patchNames = patches.split(',')
  const patchFunctions = patchNames.map(patchName => {
    try {
      return require(path.resolve(`./patches/${patchName}`))
    } catch (error) {
      logger.error(
        Colors.error(
          `Error: Unable to load patch ${patchName}, error: ${error}`
        )
      )
      process.exit(1)
    }
  })
  return patchFunctions
}

module.exports = {
  patchAction
}
