const firestore = require('@google-cloud/firestore')
const chalk = require('chalk')

/**
 * Test for the firebase client api
 * 
 * @param {object} program - command line program object (see commander package)
 * @param {object} config - configuration object - contains 'test' configuration settings ( see node-config package)
 * @param {object} admin - firebase admin api object
 */
exports.addCommand = (program, config, admin) => {
  program
  .command('client <id>')
  .description('get a document')
  .action((id, options) => {
    if (!config.has('firebase.keyFilename')) {
      console.error(chalk.red(`Error: Missing firebase.keyFilename in config`))
      process.exit(1)
    }  

    const client = new firestore.v1.FirestoreClient({
      keyFilename: '.keys/planbundle-60068-firebase-adminsdk-mt3dh-1404bc6bf4.json'
    })
            
    getDocument(id, client)
  })
}

const getDocument = async (id, client) => {
  const projectId = await client.getProjectId()
  const formattedName = `projects/${projectId}/databases/(default)/documents/bundles/${id}`
  client.getDocument({name: formattedName})
  .then(responses => {
    const response = responses[0]
    console.log(response)
  })
  .catch(err => {
    console.error(err)
  })  
}


const displayMessage = (msg, loud) => {
  console.log(chalk.green(loud ? msg.toUpperCase() : msg))
}