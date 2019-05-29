const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const jsome = require('jsome')
const jsondiffpatch = require('jsondiffpatch')

const visit = async (doc, basePath) => {

  const filename = `${doc.id}.json`
  const docDir = doc.ref.path.slice(0, doc.ref.path.lastIndexOf('/'))
  const fullDir = path.join(basePath, docDir)
  const fullName = path.join(fullDir, filename)

  if (!fs.existsSync(fullName)) {
    console.log(chalk.red(`File '${fullName}' not found for document '${doc.ref.path}'`))
  } else {
    const fileDoc = fs.readJsonSync(fullName)
  
    // Diff the files.  The firestore doc (doc) is considered the "new" file. fileDoc is considered "old"
    try {
      const delta = jsondiffpatch.diff(fileDoc, doc.data())
      if (delta) {
        jsondiffpatch.console.log(delta)  
      } else {
        console.log(chalk.cyan(`Match: ${doc.ref.path}`))
      }
    } catch (error) {
      console.log(chalk.red(error.message))
      throw error
    }
  }
}

module.exports = visit