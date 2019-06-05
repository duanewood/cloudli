const chalk = require('chalk')
// const traverse = require('../../firestore/api/traverse')
const TraverseBatch = require('../../firestore/api/traverseBatch')
const esapi = require('../api/esapi')
const commonutils = require('../../commonutils')
const firestoreUtils = require('../../firestore/commands/utils')

async function loadIndexAction(index, options, config, admin) {
  try {
    const indices = utils.getIndexConfigsFromParams(index, options, config)

    const confirmed = await commonutils.confirm(`About to index documents for indices`
                                    + ` [${indices.map(indexConfig => indexConfig.name).join(', ')}].`
                                    + ` Are you sure?`)
    if (confirmed) {
      const client = firestoreUtils.getClient(config)
      await loadIndices(indices, config, admin, client)
    }
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function loadIndices(indices, config, admin, client) {
  return Promise.all(indices.map(async indexConfig => {
    const result = await loadIndex(indexConfig, config, admin, client)
    return result
  }))
}

async function loadIndex(indexConfig, config, admin, client) {
  const db = admin.firestore()
  const index = indexConfig.name
  const traverseOptions = firestoreUtils.getRefProp(config, indexConfig, 'docSet')
  if (!traverseOptions) {
    throw new Error(`Missing docSet in config: elasticsearch.indices.${indexConfig.name}`)
  }
  if (!traverseOptions.path) {
    throw new Error(`Missing path in docSet for elasticsearch.indices.${indexConfig.name}`)
  }

  // TODO: consider using visitBatch to index multiple documents in one call
  const batchOptions = {
    visit: visitIndexer(indexConfig)
  }

  console.log(chalk.blue(`loadIndex(${index})`))
  // return traverse.traverse(db, null, indexConfig.path, visitIndexer(indexConfig))
  const projectId = await client.getProjectId()
  const traverseBatch = new TraverseBatch(client, projectId, traverseOptions.path, 
                                          traverseOptions, batchOptions)
  return await traverseBatch.execute()
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