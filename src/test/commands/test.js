const logging = require('./logging')

/**
 * Test commands
 *
 * @param {object} program - command line program object (see commander package)
 * @param {object} config - configuration object - contains 'test' configuration settings ( see node-config package)
 * @param {object} admin - firebase admin api object
 */
exports.addCommand = (program, config, admin) => {
  program
    .command('test')
    .description('Performs development experiments.')
    .option('-v, --verbose', 'Displays additional information.')
    .action(options => logging.testAction(options, config, admin))
}
