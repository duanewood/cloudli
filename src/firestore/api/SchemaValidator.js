const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const Ajv = require('ajv')

class SchemaValidator {
  constructor(schemasConfig) {
    this.schemaValidators = {}
    this.loadSchemas(schemasConfig)
  }

  loadSchemas(schemasConfig) {
    this.ajv = new Ajv()
    if (!schemasConfig || (typeof schemasConfig !== 'object') || Array.isArray(schemasConfig)) {
      throw new Error(`Missing schemas object in config`)
    }

    for (let [type, schemaConfig] of Object.entries(schemasConfig)) {
      if (!schemaConfig.schemaId) {
        throw new Error(`Missing schemaId in schemas.${type} in config`)
      }

      const schemaFiles = schemaConfig.schemaFiles
      if (!schemaFiles || !Array.isArray(schemaFiles)) {
        throw new Error(`Missing schemaFiles array in schemas.${type} in config`)
      }
      for (let i = 0; i < schemaFiles.length; i++) {
        const schema = fs.readJsonSync(schemaFiles[i])
        this.ajv.addSchema(schema)
      }

      this.schemaValidators[type] = { schemaId: schemaConfig.schemaId }
    }

    for (let [type, schemaValidator] of Object.entries(this.schemaValidators)) {
      const validate = this.ajv.getSchema(schemaValidator.schemaId)
      schemaValidator.validate = validate
    }
  }

  validate(type, obj) {
    const validator = this.schemaValidators[type]
    if (!validator) {
      throw new Error(`Missing validator for schemas.${type}`)
    }

    const valid = validator.validate(obj)
    return [valid, validator.validate.errors]
  }
}

module.exports = SchemaValidator