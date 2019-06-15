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
 * @param {object} admin - firebase admin api object
 */
exports.addCommand = (program, config, admin) => {
  program
  .command('load-index [index]')
  .description('Load elasticsearch index from firestore')
  .option('-y, --bypassConfirm', 'Bypasses confirmation prompt. Required when non-interactive stdout.')
  .option('-v, --verbose', 'Display index and document paths during indexing.')
  .action((index, options) => esAction(config, () => loadIndex.loadIndexAction(index, options, config, admin)))

  program.command('create-index [index]')
  .description('Create elasticsearch index definition with the name <indexname>yyyyMMddHHmm')
  .action((index, options) => esAction(config, () => createIndex.createIndexAction(index, options, config, admin)))

  program.command('get-alias-index [index]')
  .description('Get the index name associated with the elasticsearch index')
  .action((index, options) => esAction(config, () => getAliasIndex.getAliasIndexAction(index, options, config, admin)))

  program.command('update-index-reload [index]')
  .description('Create a new index using the defined mapping and reloads all documents from the database for the index')
  .option('-y, --bypassConfirm', 'Bypasses confirmation prompt. Required when non-interactive stdout.')
  .option('-v, --verbose', 'Displays additional progress information.')
  .action((index, options) => esAction(config, () => updateIndex.updateIndexReloadAction(index, options, config, admin)))

  program.command('reindex [index]')
  .description('Create a new index using the defined mapping and reindexes all documents for the index')
  .option('-y, --bypassConfirm', 'Bypasses confirmation prompt. Required when non-interactive stdout.')
  .option('-v, --verbose', 'Displays additional progress information.')
  .action((index, options) => esAction(config, () => updateIndex.reindexAction(index, options, config, admin)))

  program.command('search <text> [index]')
  .description('Search elasticsearch for text in an index or all indexes')
  .option('-v, --verbose', 'Displays matching content in results.')
  .action((text, index, options) => esAction(config, () => searchIndex.searchIndexAction(text, index, options, config, admin)))
}

/**
 * Wrapper function to initialize esapi before calling the action for an elasticsearch command
 * 
 * @param {*} config the command line config object
 * @param {function} action the function to call after initializing the api
 */
const esAction = (config, action) => {
  try {
    if (!config || !config.has('elasticsearch.serviceAccountFilename')) {
      throw new Error(`Missing 'elasticsearch.serviceAccountFilename' entry in config`)
    }

    const serviceAccount = fs.readJsonSync(config.get('elasticsearch.serviceAccountFilename'))
    esapi.initApi(serviceAccount)
    action()
  } catch(error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}