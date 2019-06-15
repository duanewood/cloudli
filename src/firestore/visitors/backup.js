const fs = require('fs-extra')
const path = require('path')
const Colors = require('../../Colors')
const { logger } = require('../../commonutils')

const visit = async (doc, basePath, verbose, addFile) => {
  if (verbose) {
    logger.info(Colors.info(doc.ref.path))  
  }

  const filename = `${doc.id}.json`
  const docDir = doc.ref.path.slice(0, doc.ref.path.lastIndexOf('/'))
  const fullDir = path.join(basePath, docDir)
  const fullName = path.join(fullDir, filename)

  fs.ensureDirSync(fullDir)
  fs.writeJsonSync(fullName, doc.data(), { spaces: 2 })
  addFile(doc.ref.path)
}

module.exports = visit