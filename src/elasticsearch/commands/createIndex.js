const fs = require('fs-extra')
const chalk = require('chalk')
const moment = require('moment')
const utils = require('./utils')
const esapi = require('../api/esapi')
const Colors = require('../../Colors')
const { logger } = require('../../commonutils')

async function createIndexAction(index, options, config) {
  try {
    const indices = utils.getIndexConfigsFromParams(index, options, config)

    // validate that we have indexMapping for each index
    indices.forEach(indexConfig => {
      if (!indexConfig.indexMapping ) {
        throw new Error(`Missing indexMapping property from config for index ${indexConfig.name}`)
      }  
    })

    const addAliases = !!options.addAliases

    const indicesMsg = `[${indices.map(indexConfig => indexConfig.name).join(', ')}]`
    logger.info(Colors.start(`Starting create indices for ${indicesMsg}`))
    await createIndices(indices, addAliases)
    logger.info(Colors.complete(`Completed create indices.`))    
  } catch(error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function createIndices(indices, addAliases) {
  return Promise.all(indices.map(async indexConfig => {
    return createIndex(indexConfig.name, indexConfig.indexMapping, addAliases)
  }))
}

async function createIndex(index, indexMappingFile, addAliases) {
  const indexMappingJson = fs.readJsonSync(indexMappingFile)
  const indexWithDateTime = `${index}_${moment().format('YYYYMMDDHHmmss')}`
  await esapi.createIndex(indexWithDateTime, indexMappingJson)
  if (addAliases) {
    const readAlias = `${index}_read`
    const writeAlias = `${index}_write`
    await esapi.createAliases(indexWithDateTime, [readAlias, writeAlias])
    logger.info(Colors.info(`Created index ${chalk.bold(indexWithDateTime)} and aliases ${chalk.bold(readAlias)} and ${chalk.bold(writeAlias)}`))
  } else {
    logger.info(Colors.info(`Created index ${chalk.bold(indexWithDateTime)}`))
  }
  return indexWithDateTime
}

module.exports = {
  createIndexAction,
  createIndices,
  createIndex
}