const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const TraverseBatch = require('../api/traverseBatch')
const DiffVisitor = require('../visitors/diff')
const utils = require('./utils')
const commonutils = require('../../commonutils')

const diffAction = async (basePath, docSetId, options, config, admin) => {

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

    const confirmed = await commonutils.confirm(`About to diff firestore documents with files under ${basePath}.`
                                    + ` Are you sure?`)
    if (confirmed) {
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
        console.log(chalk.yellow(`HTML diff results written to: ${htmlFilename}`))
      }
    }
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  diffAction
}
