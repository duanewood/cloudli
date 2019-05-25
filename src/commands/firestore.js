const firestore = require('@google-cloud/firestore')
const chalk = require('chalk')
const TraverseBatch = require('./firestore/traverseBatch')

/**
 * Test for the firebase client api
 * 
 * @param {object} program - command line program object (see commander package)
 * @param {object} config - configuration object - contains 'test' configuration settings ( see node-config package)
 * @param {object} admin - firebase admin api object
 */
exports.addCommand = (program, config, admin) => {
  program
  .command('docs')
  .description('gets all document ids')
  .action((options) => {
    if (!config.has('firebase.keyFilename')) {
      console.error(chalk.red(`Error: Missing firebase.keyFilename in config`))
      process.exit(1)
    }  

    const client = new firestore.v1.FirestoreClient({
      keyFilename: config.get('firebase.keyFilename')
    })
            
    getDocuments(client).catch(error => {
      console.error(chalk.red(`Error: ${error.message}`))
      process.exit(1)  
    })
  })
}

const getDocuments = async (client) => {
  const projectId = await client.getProjectId()
  // const path = null
  const path = `users`
  // const path = `users/DXmnNRjncvWSO7hvsObrW7Vaq9V2`
  // const path = `users/Q3Z2xGFNERRRnilZzM9VhY4LlNh1`
  
  // const traverseBatch = new TraverseBatch(client, projectId, path, {   }, visit )
  // const traverseBatch = new TraverseBatch(client, projectId, path, { shallow: true }, visit )
  const traverseBatch = new TraverseBatch(client, projectId, path, { recursive: true }, visit )
  return await traverseBatch.execute()    
}

const visit = async doc => {
  // console.log(chalk.green(JSON.stringify(doc)))
  console.log(chalk.green(doc.ref.path))
  // console.log(chalk.blue(JSON.stringify(doc.data())))
}