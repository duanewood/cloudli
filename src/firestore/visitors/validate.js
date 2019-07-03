const jsome = require('jsome')
const Colors = require('../../Colors')
const { logger } = require('../../commonutils')

const visit = async (doc, types, schemaValidator) => {
  let type = null
  const path = doc.ref.path

  // find the type entry based on the document path
  for (let i = 0; !type && i < types.length; i++) {
    const typeEntry = types[i]
    if (typeof typeEntry !== 'object' || !typeEntry.type || !typeEntry.path) {
      throw new Error(
        `Invalid type definition in types array in config: ${JSON.stringify(
          typeEntry
        )}`
      )
    }
    const pathRegEx = RegExp(typeEntry.path)
    if (pathRegEx.test(path)) {
      type = typeEntry.type
    }
  }

  if (type) {
    const [valid, errors] = schemaValidator.validate(type, doc.data())
    if (valid) {
      logger.info(Colors.valid(`Valid: ${doc.ref.path}`))
    } else {
      logger.info(Colors.invalid(`Invalid: ${doc.ref.path}`))
      logger.info(Colors.invalid('Errors: '))
      jsome(errors)
    }
  } else {
    logger.error(Colors.warning(`No schema found for ${doc.ref.path}`))
  }
}

module.exports = visit
