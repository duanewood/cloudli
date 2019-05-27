const chalk = require('chalk')
const jsome = require('jsome')

const visit = async (doc, verbose) => {
  console.log()
  console.log(chalk.yellow(doc.ref.path))
  if (verbose) {
    // console.log(chalk.blue(JSON.stringify(doc.data())))
    jsome(doc.data())
  }
}

module.exports = visit