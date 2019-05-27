const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const jsome = require('jsome')

const visit = async (doc, basePath) => {
  console.log()
  console.log(chalk.yellow(doc.ref.path))

  const filename = `${doc.id}.json`
  const docDir = doc.ref.path.slice(0, doc.ref.path.lastIndexOf('/'))
  const fullDir = path.join(basePath, docDir)
  const fullName = path.join(fullDir, filename)

  fs.ensureDirSync(fullDir)
  fs.writeJsonSync(fullName, doc.data(), { spaces: 2 })
  // jsome(doc.data())
}

module.exports = visit