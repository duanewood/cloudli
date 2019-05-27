const chalk = require('chalk')

const visit = async (doc, verbose) => {
  console.log(chalk.green(doc.ref.path))
  if (verbose) {
    console.log(chalk.blue(JSON.stringify(doc.data())))
  }
}

module.exports = visit