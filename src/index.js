const admin = require('firebase-admin')
const program = require('commander')
const config = require('config')
const chalk = require('chalk')

/**
 * PlanBundle Command Line Interface
 * 
 * Uses commander package for processing commands.
 * Command handlers are loaded from ./commands/<commandname>
 * 
 * Commands must export a function: addCommand(program, config, admin)
 * that add appropriate subcommands.
 * 
 *    @param {object} program - command line program object (see commander package)
 *    @param {object} config - configuration object - can be used by command for settings
 *    @param {object} admin - firebase admin api object
 * 
 * Command line uses subcommands based on command objects
 * Usage: node src/index.js [<subcommand> [<subcommand parameters> [--help]]] | --version | --help
 */

const commands = ['test', 'elasticsearch']

function main() {
  var serviceAccount = require('../.keys/planbundle-60068-firebase-adminsdk-mt3dh-1404bc6bf4.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://planbundle-60068.firebaseio.com'
  })

  const firestore = admin.firestore()
  const settings = { timestampsInSnapshots: true }
  firestore.settings(settings)

  program
    .version('0.1.0')

  commands.forEach(command => {
    const commandModule = require(`./commands/${command}`)
    commandModule.addCommand(program, config, admin)
  })

  // this will execute the appropriate command based on parameters
  try {
    program.parse(process.argv)
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`))
  }
}

main()
