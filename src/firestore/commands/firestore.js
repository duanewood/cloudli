const docs = require('./docs')
const get = require('./get')
const backup = require('./backup')
const restore = require('./restore')
const deleteDocs = require('./deleteDocs')
const diff = require('./diff')
const patch = require('./patch')
const validate = require('./validate')

/**
 * Firestore commands
 *
 * @param {object} program - command line program object (see commander package)
 * @param {object} config - configuration object - contains 'test' configuration settings ( see node-config package)
 */
exports.addCommand = (program, config) => {
  program
    .command('fire:docs [docSetId]')
    .alias('docs')
    .addHelpText(
      'after', 
      '\nGets firestore documents using a batch query with an optional docSet. If docSetId is not specified, includes all documents in the database. The specified docSetId must be defined in config.'
    )
    .option(
      '-p, --path <path>',
      'The path of the documents.  May be a collection or document.'
    )
    .option(
      '-c, --collectionId <id>',
      'If specified, will only include documents from collections with id.'
    )
    .option('-r, --recursive', 'Include all sub-collections')
    .option('-s, --shallow', 'Only include immediate sub-collections')
    .option(
      '-f, --filter <regex>',
      'Filter results using the supplied regular expression regex'
    )
    .option(
      '-i, --idfilter <id>',
      'Filter results to documents with id.  Cannot be used with --filter'
    )
    .option(
      '-m, --min',
      'Minimal data returned - only include document ids in results'
    )
    .option('-v, --verbose', 'Displays full documents of results.')
    .action((docset, options) => docs.getDocsAction(docset, options, config))

  program
    .command('fire:get <path>')
    .alias('get')
    .addHelpText(
      'after', 
      '\nGets specific firestore documents with a path. The path may be for a collection or a document.'
    )
    .option('-v, --verbose', 'Displays full documents of results.')
    .action((path, options) => get.getAction(path, options, config))

  program
    .command('fire:backup [docSetId]')
    .alias('backup')
    .addHelpText(
      'after', 
      '\nBacks up firestore documents using a batch query with an optional docSet. If docSetId is not specified, includes all documents in the database. \nThe specified docSetId must be defined in config.'
    )
    .option(
      '-p, --path <path>',
      'The path of the documents.  May be a collection or document.'
    )
    .option(
      '-c, --collectionId <id>',
      'If specified, will only include documents from collections with id.'
    )
    .option('-r, --recursive', 'Include all sub-collections')
    .option('-s, --shallow', 'Only include immediate sub-collections')
    .option(
      '-f, --filter <regex>',
      'Filter results using the supplied regular expression regex'
    )
    .option(
      '-i, --idfilter <id>',
      'Filter results to documents with id.  Cannot be used with --filter'
    )
    .option(
      '-b, --basePath <basePath>',
      'Specifies the base backup path.  Overrides firestore.backupBasePath in config.'
    )
    .option(
      '-y, --bypassConfirm',
      'Bypasses confirmation prompt. Required when non-interactive stdout.'
    )
    .option('-v, --verbose', 'Displays document paths during backup.')
    .action((docSetId, options) =>
      backup.backupAction(docSetId, options, config)
    )

  program
    .command('fire:restore <basePath>')
    .alias('restore')
    .addHelpText(
      'after',
      `\nRestores all documents (.json files) under basePath to equivalent paths in firestore.`
    )
    .option(
      '-y, --bypassConfirm',
      'Bypasses confirmation prompt. Required when non-interactive stdout.'
    )
    .option('-v, --verbose', 'Displays files during restore.')
    .action((basePath, options) =>
      restore.restoreAction(basePath, options, config)
    )

  program
    .command('fire:upload <basePath>')
    .alias('upload')
    .addHelpText(
      'after',
      `\nUploads (restores) all documents (.json files) under basePath to equivalent paths in firestore.`
    )
    .option(
      '-y, --bypassConfirm',
      'Bypasses confirmation prompt. Required when non-interactive stdout.'
    )
    .option('-v, --verbose', 'Displays files during restore.')
    .action((basePath, options) =>
      restore.restoreAction(basePath, options, config)
    )

  program
    .command('fire:delete [docSetId]')
    .alias('delete')
    .addHelpText(
      'after', 
      '\nDeletes firestore documents after backing up the files. If docSetId is not specified, includes all documents in the database. The specified docSetId must be defined in config.'
    )
    .option(
      '-p, --path <path>',
      'The path of the documents.  May be a collection or document.'
    )
    .option(
      '-c, --collectionId <id>',
      'If specified, will only include documents from collections with id.'
    )
    .option('-r, --recursive', 'Include all sub-collections')
    .option('-s, --shallow', 'Only include immediate sub-collections')
    .option(
      '-f, --filter <regex>',
      'Filter results using the supplied regular expression regex'
    )
    .option(
      '-i, --idfilter <id>',
      'Filter results to documents with id.  Cannot be used with --filter'
    )
    .option(
      '-b, --basePath <basePath>',
      'Specifies the base backup path.  Overrides firestore.backupBasePath in config.'
    )
    .option(
      '-y, --bypassConfirm',
      'Bypasses confirmation prompt. Required when non-interactive stdout.'
    )
    .option(
      '-v, --verbose',
      'Displays document paths during backup and delete.'
    )
    .action((docSetId, options) =>
      deleteDocs.deleteAction(docSetId, options, config)
    )

  program
    .command('fire:patch <patches> [docSetId]')
    .alias('patch')
    .addHelpText(
      'after', 
      '\nPatches firestore documents using patches after backing up the files. The patches parameter is one or more patches separated by commas.  The patch function modules must be in the directory ./patches, in js modules named <patchname>.js. If docSetId is not specified, includes all documents in the database. The specified docSetId must be defined in config.'
    )
    .option(
      '-p, --path <path>',
      'The path of the documents.  May be a collection or document.'
    )
    .option(
      '-c, --collectionId <id>',
      'If specified, will only include documents from collections with id.'
    )
    .option('-r, --recursive', 'Include all sub-collections')
    .option('-s, --shallow', 'Only include immediate sub-collections')
    .option(
      '-f, --filter <regex>',
      'Filter results using the supplied regular expression regex'
    )
    .option(
      '-i, --idfilter <id>',
      'Filter results to documents with id.  Cannot be used with --filter'
    )
    .option(
      '-b, --basePath <basePath>',
      'Specifies the base backup path.  Overrides firestore.backupBasePath in config.'
    )
    .option(
      '-y, --bypassConfirm',
      'Bypasses confirmation prompt. Required when non-interactive stdout.'
    )
    .option(
      '-v, --verbose',
      'Displays document paths during backup and delete.'
    )
    .action((patches, docSetId, options) =>
      patch.patchAction(patches, docSetId, options, config)
    )

  program
    .command('fire:diff <basePath> [docSetId]')
    .alias('diff')
    .addHelpText(
      'after', 
      '\nCompares document files under basePath with firestore documents using a batch query with an optional docSet. If docSetId is not specified, includes all documents in the database. The specified docSetId must be defined in config.'
    )
    .option(
      '-p, --path <path>',
      'The path of the documents.  May be a collection or document.'
    )
    .option(
      '-c, --collectionId <id>',
      'If specified, will only include documents from collections with id.'
    )
    .option('-r, --recursive', 'Include all sub-collections')
    .option('-s, --shallow', 'Only include immediate sub-collections')
    .option(
      '-f, --filter <regex>',
      'Filter results using the supplied regular expression regex'
    )
    .option(
      '-i, --idfilter <id>',
      'Filter results to documents with id.  Cannot be used with --filter'
    )
    .option(
      '-y, --bypassConfirm',
      'Bypasses confirmation prompt. Required when non-interactive stdout.'
    )
    .option(
      '-w, --html [htmlFilename]',
      'Produce (web) html and css file for difference.  Uses debug.outputPath from config for default directory. Default filename is timestamp.html'
    )
    .action((basePath, docSetId, options) =>
      diff.diffAction(basePath, docSetId, options, config)
    )

  program
    .command('fire:validate [docSetId]')
    .alias('validate')
    .addHelpText(
      'after', 
      '\nValidates firestore documents using a batch query with an optional docSet. If docSetId is not specified, includes all documents in the database. The specified docSetId must be defined in config.'
    )
    .option(
      '-p, --path <path>',
      'The path of the documents.  May be a collection or document.'
    )
    .option(
      '-c, --collectionId <id>',
      'If specified, will only include documents from collections with id.'
    )
    .option('-r, --recursive', 'Include all sub-collections')
    .option('-s, --shallow', 'Only include immediate sub-collections')
    .option(
      '-f, --filter <regex>',
      'Filter results using the supplied regular expression regex'
    )
    .option(
      '-i, --idfilter <id>',
      'Filter results to documents with id.  Cannot be used with --filter'
    )
    .action((docSetId, options) =>
      validate.validateAction(docSetId, options, config)
    )
}
