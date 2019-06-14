const docs = require('./docs')
const get = require('./get')
const backup = require('./backup')
const restore = require('./restore')
const deleteDocs = require('./deleteDocs')
const diff = require('./diff')
const validate = require('./validate')

/**
 * Firestore commands
 * 
 * @param {object} program - command line program object (see commander package)
 * @param {object} config - configuration object - contains 'test' configuration settings ( see node-config package)
 * @param {object} admin - firebase admin api object
 */
exports.addCommand = (program, config, admin) => {
  program
  .command('firestore-docs [docSetId]')
  .description('Gets firestore documents using a batch query with an optional docSet.  If docSetId is not specified, includes all documents in the database. The specified docSetId must be defined in config.')
  .option('-p, --path <path>', 'The path of the documents.  May be a collection or document.')
  .option('-c, --collectionId <id>', 'If specified, will only include docuements from collections with id.')
  .option('-r, --recursive', 'Include all sub-collections')
  .option('-s, --shallow', 'Only include immediate sub-collections')
  .option('-f, --filter <regex>', 'Filter results using the supplied regular expression regex')
  .option('-i, --idfilter <id>', 'Filter results to documents with id.  Cannot be used iwth --filter')
  .option('-m, --min', 'Minimal data returned - only include document ids in results')
  .option('-v, --verbose', 'Displays full documents of results.')
  .action((docset, options) => docs.getDocsAction(docset, options, config, admin))

  program
  .command('firestore-get <path>')
  .description('Gets firestore documents with a path.  The path may be for a collection or a document.')
  .option('-v, --verbose', 'Displays full documents of results.')
  .action((path, options) => get.getAction(path, options, config, admin))

  program
  .command('backup [docSetId]')
  .description(`Backs up firestore documents using a batch query with an optional docSet. If docSetId is not specified, includes all documents in the database. The specified docSetId must be defined in config.`)
  .option('-p, --path <path>', 'The path of the documents.  May be a collection or document.')
  .option('-c, --collectionId <id>', 'If specified, will only include docuements from collections with id.')
  .option('-r, --recursive', 'Include all sub-collections')
  .option('-s, --shallow', 'Only include immediate sub-collections')
  .option('-f, --filter <regex>', 'Filter results using the supplied regular expression regex')
  .option('-i, --idfilter <id>', 'Filter results to documents with id.  Cannot be used with --filter')
  .option('-b, --basePath <basePath>', 'Specifies the base backup path.  Overrides firestore.backupBasePath in config.')
  .option('-y, --bypassConfirm', 'Bypasses confirmation prompt. Required when non-interactive stdout.')
  .option('-v, --verbose', 'Displays document paths during backup.')
  .action((docSetId, options) => backup.backupAction(docSetId, options, config, admin))

  program
  .command('restore <basePath>')
  .alias('upload')
  .description(`Restores all documents (.json files) under basePath to equivalent paths in firestore.`)
  .action((basePath, options) => restore.restoreAction(basePath, options, config, admin))

  program
  .command('delete [docSetId]')
  .description(`Deletes firestore documents after backing up the files. If docSetId is not specified, includes all documents in the database. The specified docSetId must be defined in config.`)
  .option('-p, --path <path>', 'The path of the documents.  May be a collection or document.')
  .option('-c, --collectionId <id>', 'If specified, will only include docuements from collections with id.')
  .option('-r, --recursive', 'Include all sub-collections')
  .option('-s, --shallow', 'Only include immediate sub-collections')
  .option('-f, --filter <regex>', 'Filter results using the supplied regular expression regex')
  .option('-i, --idfilter <id>', 'Filter results to documents with id.  Cannot be used with --filter')
  .option('-b, --basePath <basePath>', 'Specifies the base backup path.  Overrides firestore.backupBasePath in config.')
  .option('-y, --bypassConfirm', 'Bypasses confirmation prompt. Required when non-interactive stdout.')
  .option('-v, --verbose', 'Displays document paths during delete.')
  .action((docSetId, options) => deleteDocs.deleteAction(docSetId, options, config, admin))

  program
  .command('diff <basePath> [docSetId]')
  .description(`Compares document files under basePath with firestore documents using a batch query with an optional docSet. If docSetId is not specified, includes all documents in the database. The specified docSetId must be defined in config.`)
  .option('-p, --path <path>', 'The path of the documents.  May be a collection or document.')
  .option('-c, --collectionId <id>', 'If specified, will only include docuements from collections with id.')
  .option('-r, --recursive', 'Include all sub-collections')
  .option('-s, --shallow', 'Only include immediate sub-collections')
  .option('-f, --filter <regex>', 'Filter results using the supplied regular expression regex')
  .option('-i, --idfilter <id>', 'Filter results to documents with id.  Cannot be used with --filter')
  .option('-y, --bypassConfirm', 'Bypasses confirmation prompt. Required when non-interactive stdout.')
  .option('-h, --html [htmlFilename]', 'Produce html and css file for difference.  Uses debug.outputPath from config for default directory. Default filename is timestamp.html')
  .action((basePath, docSetId, options) => diff.diffAction(basePath, docSetId, options, config, admin))

  program
  .command('validate [docSetId]')
  .description(`Validates firestore documents using a batch query with an optional docSet. If docSetId is not specified, includes all documents in the database. The specified docSetId must be defined in config.`)
  .option('-p, --path <path>', 'The path of the documents.  May be a collection or document.')
  .option('-c, --collectionId <id>', 'If specified, will only include docuements from collections with id.')
  .option('-r, --recursive', 'Include all sub-collections')
  .option('-s, --shallow', 'Only include immediate sub-collections')
  .option('-f, --filter <regex>', 'Filter results using the supplied regular expression regex')
  .option('-i, --idfilter <id>', 'Filter results to documents with id.  Cannot be used with --filter')
  .action((docSetId, options) => validate.validateAction(docSetId, options, config, admin))
}
