const fs = require('fs-extra')
const chalk = require('chalk')
const moment = require('moment')
const esapi = require('../api/esapi')
const utils = require('./utils')

async function createIndexAction(index, options, config, admin) {
  try {
    const indices = utils.getIndexConfigsFromParams(index, options, config)

    // validate that we have indexMapping for each index
    indices.forEach(indexConfig => {
      if (!indexConfig.indexMapping ) {
        throw new Error(`Missing indexMapping property from config for index ${indexConfig.name}`)
      }  
    })

    await createIndices(indices)
    
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function createIndices(indices) {
  return Promise.all(indices.map(async indexConfig => {
    return createIndex(indexConfig.name, indexConfig.indexMapping)
  }))
}

async function createIndex(index, indexMappingFile) {
  console.log(chalk.blue(`createIndex(${index})`))
  const indexMappingJson = fs.readJsonSync(indexMappingFile)
  const indexWithDateTime = `${index}_${moment().format('YYYYMMDDHHmm')}`
  await esapi.createIndex(indexWithDateTime, indexMappingJson)
  console.log(chalk.green(`Created index ${chalk.bold(indexWithDateTime)}`))
  return indexWithDateTime
}

module.exports = {
  createIndexAction,
  createIndices,
  createIndex
}