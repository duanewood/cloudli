const fs = require('fs-extra')
const path = require('path')
const Colors = require('../../Colors')
const TraverseBatch = require('../api/TraverseBatch')
const DiffVisitor = require('../visitors/diff')
const utils = require('./utils')
const { logger, confirm } = require('../../commonutils')

const diffAction = async (basePath, docSetId, options, config) => {

  try {
    if (!fs.existsSync(basePath)) {
      throw new Error(`${basePath}' does not exist.`)
    }

    if (!fs.statSync(basePath).isDirectory()) {
      throw new Error(`${basePath}' is not a directory.`)      
    }

    let htmlFilename
    if (options.html) {
      let dir
      let name
      let ext
      if (options.htmlFilename) {
        const parsed = path.parse(options.htmlFilename)
        dir = parsed.dir
        name = parsed.name
        ext = parsed.ext
      }
      if (!dir) {
        if (config.has('debug.outputPath')) {
          dir = config.get('debug.outputPath')
        } else {
          dir = '.'
        }
      }

      if (!name) {
        name = new Date().toISOString().replace(/\:/g, '-')
      }

      if (!ext) {
        ext = '.html'
      }

      htmlFilename = path.format({ dir, name, ext })
    }

    const traverseOptions = utils.traverseOptionsFromCommandOptions(docSetId, options, config)

    if (!process.stdout.isTTY && !options.bypassConfirm) {
      throw new Error('--bypassConfirm option required when redirecting output')
    }

    logger.info(Colors.prep(`About to diff firestore documents with files under ${basePath}.`))
    logger.info(Colors.prep('Documents include: ' + utils.traverseOptionsSummary(traverseOptions)))
    const confirmed = options.bypassConfirm || await confirm(Colors.warning(`Are you sure?`))

    if (confirmed) {
      logger.info(Colors.start(`Starting diff of documents in ${basePath}`))

      const client = utils.getClient(config)
      const projectId = await client.getProjectId()
  
      const path = traverseOptions.path || null
      // const visit = doc => diff(doc, basePath, htmlFilename)
      const visitor = new DiffVisitor(basePath, htmlFilename)
      const visit = doc => visitor.visit(doc)
      const batchOptions = { visit }
      const traverseBatch = new TraverseBatch(client, projectId, path, traverseOptions, batchOptions)
      await traverseBatch.execute()
      await visitor.visitFileSystem()
      visitor.close()
      if (htmlFilename) {
        logger.info(Colors.result(`HTML diff results written to: ${htmlFilename}`))
      }
      logger.info(Colors.complete(`Completed diff`))
    }
  } catch(error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  diffAction
}
