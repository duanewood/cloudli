const chalk = require('chalk')

/**
 * Example command that adds parameters and has config parameters in config
 * 
 * @param {object} program - command line program object (see commander package)
 * @param {object} config - configuration object - contains 'test' configuration settings ( see node-config package)
 * @param {object} admin - firebase admin api object
 */
exports.addCommand = (program, config, admin) => {
  program
  .command('message [msg]')
  .description('display a message')
  .option('-l, --loud', 'display loud message (all caps)')
  .action((msg, options) => {
    const loud = options.loud || (config.has('test.defaultLoud') ? !!config.get('test.defaultLoud') : false)
    msg = msg || (config.has('test.defaultMessage') ? config.get('test.defaultMessage') : 'Hello, world')
    displayMessage(msg, loud)
  })
}

const displayMessage = (msg, loud) => {
  console.log(chalk.green(loud ? msg.toUpperCase() : msg))
}