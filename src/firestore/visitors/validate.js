const chalk = require('chalk')
const jsome = require('jsome')

const visit = async (doc, types, schemaValidator) => {
  let type = null
  const path = doc.ref.path
  for (let i = 0; !type && i < types.length; i++) {
    const typeEntry = types[i]
    if ((typeof typeEntry !== 'object') || !typeEntry.type || !typeEntry.path) {
      throw new Error(`Invalid type definition in types array in config: ${JSON.stringify(typeEntry)}`)
    }

    const pathRegEx = RegExp(typeEntry.path)
    if (pathRegEx.test(path)) {
      type = typeEntry.type
    }
  }
  if (type) {
    const [valid, errors] = schemaValidator.validate(type, doc.data())
    if (valid) {
      console.log(chalk.green(doc.ref.path))
    } else {
      console.log(chalk.red(doc.ref.path))
      console.log()
      console.log(chalk.red('Errors: '))
      jsome(errors)
    }
  } else {
    console.log(chalk.yellow(`No schema found for ${doc.ref.path}`))
  }
}

module.exports = visit