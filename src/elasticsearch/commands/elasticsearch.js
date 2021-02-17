const fs = require('fs-extra')
const esapi = require('../api/esapi')
const loadIndex = require('./loadIndex')
const getAliasIndex = require('./getAliasIndex')
const createIndex = require('./createIndex')
const updateIndex = require('./updateIndex')
const searchIndex = require('./searchIndex')
const Colors = require('../../Colors')
const { logger } = require('../../commonutils')

/**
 * Elasticsearch commands
 *
 * @param {object} program - command line program object (see commander package)
 * @param {object} config - configuration object - contains 'elasticsearch' configuration settings
 */
const addCommand = (program, config) => {
  program
    .command('es:load-index [index]')
    .alias('load-index')
    .description('Load elasticsearch index from firestore.')
    .option(
      '-y, --bypassConfirm',
      'Bypasses confirmation prompt. Required when non-interactive stdout.'
    )
    .option(
      '-v, --verbose',
      'Display index and document paths during indexing.'
    )
    .action((index, options) =>
      esAction(config, () => loadIndex.loadIndexAction(index, options, config))
    )

  program
    .command('es:create-index [index]')
    .alias('create-index')
    .description(
      'Create elasticsearch index definition with the name <indexname>yyyyMMddHHmmss, along with read and write aliases'
    )
    .action((index, options) =>
      esAction(config, () =>
        createIndex.createIndexAction(index, options, config)
      )
    )

  program
    .command('es:get-aliases [index]')
    .alias('get-aliases')
    .description('Get the index aliases for the elasticsearch index')
    .action((index, options) =>
      esAction(config, () =>
        getAliasIndex.getAliasIndexAction(index, options, config)
      )
    )

  program
    .command('es:create-reload-index [index]')
    .alias('create-reload-index')
    .description(
      'Create a new index using the defined mapping and loads documents from firestore for the index'
    )
    .option(
      '-y, --bypassConfirm',
      'Bypasses confirmation prompt. Required when non-interactive stdout.'
    )
    .option('-v, --verbose', 'Displays additional progress information.')
    .action((index, options) =>
      esAction(config, () =>
        updateIndex.updateIndexReloadAction(index, options, config)
      )
    )

  program
    .command('es:reindex [index]')
    .alias('reindex')
    .description(
      'Create a new index using the defined mapping and reindexes all documents for the index'
    )
    .option(
      '-y, --bypassConfirm',
      'Bypasses confirmation prompt. Required when non-interactive stdout.'
    )
    .option('-v, --verbose', 'Displays additional progress information.')
    .action((index, options) =>
      esAction(config, () => updateIndex.reindexAction(index, options, config))
    )

  program
    .command('es:search <text> [index]')
    .alias('search')
    .description('Search elasticsearch for text in an index or all indexes')
    .option('-v, --verbose', 'Displays matching content in results.')
    .action((text, index, options) =>
      esAction(config, () =>
        searchIndex.searchIndexAction(text, index, options, config)
      )
    )
}

/**
 * Wrapper function to initialize esapi before calling the action for an elasticsearch command
 *
 * @param {*} config the command line config object
 * @param {function} action the function to call after initializing the api
 */
const esAction = async (config, action) => {
  try {
    if (!config || !config.has('elasticsearch.serviceAccountFilename')) {
      throw new Error(
        `Missing 'elasticsearch.serviceAccountFilename' entry in config`
      )
    }

    const serviceAccount = fs.readJsonSync(
      config.get('elasticsearch.serviceAccountFilename')
    )

    let prefixName = ''
    if (config.has('elasticsearch.indexPrefix')) {
      prefixName = config.get('elasticsearch.indexPrefix')
    }
    if (prefixName !== '') {
      logger.info(Colors.prep(`Using environment index prefix '${prefixName}'`))
    }

    esapi.initApi(serviceAccount, prefixName)
    await action()
  } catch (error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  addCommand,
  esAction
}
