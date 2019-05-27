const loadIndex = require('./loadIndex')
const getAliasIndex = require('./getAliasIndex')
const createIndex = require('./createIndex')
const updateIndex = require('./updateIndex')

/**
 * Elasticsearch indexing commands
 * 
 * @param {object} program - command line program object (see commander package)
 * @param {object} config - configuration object - contains 'elasticsearch' configuration settings
 * @param {object} admin - firebase admin api object
 */
exports.addCommand = (program, config, admin) => {
  program
  .command('load-index [index]')
  .description('Load elasticsearch index from firestore')
  .action((index, options) => loadIndex.loadIndexAction(index, options, config, admin))

  program.command('create-index [index]')
  .description('Create elasticsearch index definition with the name <indexname>yyyyMMddHHmm')
  .action((index, options) => createIndex.createIndexAction(index, options, config, admin))

  program.command('get-alias-index [index]')
  .description('Get the index name associated with the elasticsearch index')
  .action((index, options) => getAliasIndex.getAliasIndexAction(index, options, config, admin))

  program.command('update-index-reload [index]')
  .description('Creates a new index using the defined mapping and reloads all documents from the database for the index')
  .action((index, options) => updateIndex.updateIndexReloadAction(index, options, config, admin))

  program.command('reindex [index]')
  .description('Creates a new index using the defined mapping and reindexes all documents for the index')
  .action((index, options) => updateIndex.reindexAction(index, options, config, admin))
}
