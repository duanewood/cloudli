const chalk = require('chalk')
const utils = require('./utils')
const TraverseBatch = require('../../firestore/api/TraverseBatch')
const esapi = require('../api/esapi')
const commonutils = require('../../commonutils')
const firestoreUtils = require('../../firestore/commands/utils')
const Colors = require('../../Colors')
const { logger, confirm } = require('../../commonutils')

async function loadIndexAction(index, options, config) {
  try {
    const indices = utils.getIndexConfigsFromParams(index, options, config)

    if (!process.stdout.isTTY && !options.bypassConfirm) {
      throw new Error('--bypassConfirm option required when redirecting output')
    }

    const verbose = !!options.verbose

    const indicesMsg = `[${indices.map(indexConfig => indexConfig.name).join(', ')}]`
    logger.info(Colors.prep(`About to index documents for indices ${indicesMsg}.`))
    const confirmed = options.bypassConfirm || await confirm(Colors.warning(`Are you sure?`))

    if (confirmed) {
      logger.info(Colors.start(`Starting indexing of documents for indices ${indicesMsg}`))
      const client = firestoreUtils.getClient(config)
      await loadIndices(indices, config, client, verbose)
      logger.info(Colors.complete(`Completed indexing documents.`))
    }
  } catch(error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function loadIndices(indices, config, client, verbose) {
  return Promise.all(indices.map(async indexConfig => {
    const result = await loadIndex(indexConfig, config, client, verbose)
    return result
  }))
}

async function loadIndex(indexConfig, config, client, verbose) {
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
    visit: visitIndexer(indexConfig, verbose)
  }

  if (verbose) {
    logger.info(Colors.info(`Loading index ${index}`))
  }

  const projectId = await client.getProjectId()
  const traverseBatch = new TraverseBatch(client, projectId, traverseOptions.path, 
                                          traverseOptions, batchOptions)
  return await traverseBatch.execute()
}

/**
 * Creates a visitor for TraverseBatch using the specified index configuration
 * 
 * @param {object} indexConfig the indexConfig entry for the index from config
 * @param {boolean} verbose true to display index and document names
 */
const visitIndexer = (indexConfig, verbose) => {
  const index = indexConfig.name
  const writeIndex = `${index}_write`
  const mapper = indexConfig.objectMapper 
                 ? require(`../objectMappers/${indexConfig.objectMapper}`) 
                 : null
  return async doc => {
    if (verbose) {
      logger.info(Colors.info(`Indexing ${doc.ref.path}`))
    }
    const docToIndex = mapper ? mapper(doc.data()) : doc.data()
    const id = docToIndex.id
    if (id) {
      return esapi.indexDocument(writeIndex, docToIndex, doc.id)
    } else {
      logger.error(Colors.error(`Missing id for document ${doc.ref.path}. ${chalk.bold('Skipping')}`))
    }
  }
}

module.exports = {
  loadIndexAction,
  loadIndices,
  loadIndex
}