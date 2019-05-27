const chalk = require('chalk')
const traverse = require('../../firestore/api/traverse')
const esapi = require('../api/esapi')
const utils = require('./utils')

async function loadIndexAction(index, options, config, admin) {
  try {
    const indices = utils.getIndexConfigsFromParams(index, options, config)

    const confirmed = await utils.confirm(`About to index documents for indices`
                                    + ` [${indices.map(indexConfig => indexConfig.name).join(', ')}].`
                                    + ` Are you sure?`)
    if (confirmed) {
      await loadIndices(indices, admin)
    }
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function loadIndices(indices, admin) {
  return Promise.all(indices.map(async indexConfig => {
    const result = await loadIndex(indexConfig, admin)
    return result
  }))
}

async function loadIndex(indexConfig, admin) {
  const db = admin.firestore()
  const index = indexConfig.name
  console.log(chalk.blue(`loadIndex(${index})`))
  return traverse.traverse(db, null, indexConfig.path, visitIndexer(indexConfig))
}

const visitIndexer = indexConfig => {
  const index = indexConfig.name
  const writeIndex = `${index}_write`
  const mapper = indexConfig.objectMapper 
                 ? require(`../objectMappers/${indexConfig.objectMapper}`) 
                 : null
  return async doc => {
    console.log(chalk.green(`visitIndexer: id: ${doc.id}, path: ${doc.ref.path}`))
    const docToIndex = mapper ? mapper(doc.data()) : doc.data()
    const id = docToIndex.id
    if (!id) {
      console.log(chalk.red(`visitIndexer - bad document: id: ${doc.id}, object.id: ${id}`))
    }
    return esapi.indexDocument(writeIndex, docToIndex, doc.id).catch(error => {
      throw error
    })
  }
}

module.exports = {
  loadIndexAction,
  loadIndices,
  loadIndex
}