const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const { logger } = require('../../commonutils')

const visit = async (doc, basePath, verbose) => {
  if (verbose) {
    logger.info(chalk.green(doc.ref.path))  
  }

  const filename = `${doc.id}.json`
  const docDir = doc.ref.path.slice(0, doc.ref.path.lastIndexOf('/'))
  const fullDir = path.join(basePath, docDir)
  const fullName = path.join(fullDir, filename)

  fs.ensureDirSync(fullDir)
  fs.writeJsonSync(fullName, doc.data(), { spaces: 2 })
}

module.exports = visit