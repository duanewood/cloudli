const path = require('path')
const chalk = require('chalk')
const utils = require('./utils')
const admin = require('firebase-admin')
const TraverseBatch = require('../../firestore/api/TraverseBatch')
const esapi = require('../api/esapi')
const firestoreUtils = require('../../firestore/commands/utils')
const Colors = require('../../Colors')
const { logger, confirm } = require('../../commonutils')

async function loadIndexAction(index, options, config) {
  try {
    firestoreUtils.initAdmin(config)
    const indices = utils.getIndexConfigsFromParams(index, options, config)

    if (!process.stdout.isTTY && !options.bypassConfirm) {
      throw new Error('--bypassConfirm option required when redirecting output')
    }

    const verbose = !!options.verbose

    const indicesMsg = `[${indices
      .map(indexConfig => indexConfig.name)
      .join(', ')}]`
    logger.info(
      Colors.prep(`About to index documents for indices ${indicesMsg}.`)
    )
    const confirmed =
      options.bypassConfirm || (await confirm(Colors.warning(`Are you sure?`)))

    if (confirmed) {
      logger.info(
        Colors.start(`Starting indexing of documents for indices ${indicesMsg}`)
      )
      const client = firestoreUtils.getClient(config)
      await loadIndices(indices, config, client, verbose)
      logger.info(Colors.complete(`Completed indexing documents.`))
    }
  } catch (error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function loadIndices(indices, config, client, verbose) {
  return Promise.all(
    indices.map(async indexConfig => {
      const result = await loadIndex(indexConfig, config, client, verbose)
      return result
    })
  )
}

async function loadIndex(indexConfig, config, client, verbose) {
  const index = indexConfig.name
  const traverseOptions = firestoreUtils.getRefProp(
    config,
    indexConfig,
    'docSet'
  )
  if (!traverseOptions) {
    throw new Error(`Missing docSet in config: elasticsearch.indices.${index}`)
  }
  if (!traverseOptions.path) {
    throw new Error(`Missing path in docSet for elasticsearch.indices.${index}`)
  }

  try {
    await esapi.getWriteAliasIndices(index)
  } catch (err) {
    throw new Error(`Unable to get write alias ${index}_write: ` + err.message)
  }

  // TODO: consider using visitBatch to index multiple documents in one call
  const batchOptions = {
    visit: visitIndexer(indexConfig, verbose)
  }

  if (verbose) {
    logger.info(Colors.info(`Loading index ${index}`))
  }

  const projectId = await client.getProjectId()
  const traverseBatch = new TraverseBatch(
    client,
    projectId,
    traverseOptions.path,
    traverseOptions,
    batchOptions
  )
  return traverseBatch.execute()
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
    ? require(path.resolve(indexConfig.objectMapper))
    : null
  return async doc => {
    if (verbose) {
      logger.info(Colors.info(`Indexing ${doc.ref.path}`))
    }

    let rawDoc = doc.data()
    // merge in any documents from extendCollections
    if (indexConfig.extendCollections) {
      const db = admin.firestore()
      for (const col of indexConfig.extendCollections) {
        const extendDocRef = db.doc(`${col}/${doc.id}`)
        const extendDocSnap = await extendDocRef.get()
        if (extendDocSnap.exists) {
          if (verbose) {
            logger.info(Colors.info(`Extending ${doc.ref.path} with ${extendDocRef.path}`))
          }
          const extendDoc = extendDocSnap.data() 
          rawDoc = {
            ...rawDoc,
            ...extendDoc
          }
        }
      }
    }

    const docToIndex = mapper ? mapper(rawDoc) : rawDoc
    const id = doc.id
    if (id) {
      try {
        const result = await esapi.indexDocument(writeIndex, docToIndex, doc.id)
        return result  
      } catch (error) {
        logger.error(
          Colors.error(
            `Error indexing ${doc.ref.path}: ${error}`
          )
        )  
      }
    } else {
      logger.error(
        Colors.error(
          `Missing id for document ${doc.ref.path}. ${chalk.bold('Skipping')}`
        )
      )
    }
  }
}

module.exports = {
  loadIndexAction,
  loadIndices,
  loadIndex
}
