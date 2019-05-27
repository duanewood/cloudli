const chalk = require('chalk')
const TraverseBatch = require('../api/traverseBatch')
const showDoc = require('../visitors/showDoc')
const utils = require('./utils')

const getDocsAction = async (docSetId, options, config, admin) => {

  try {
    
    const traverseOptions = utils.traverseOptionsFromCommandOptions(docSetId, options, config)
    const client = utils.getClient(config)
    const projectId = await client.getProjectId()

    const path = traverseOptions.path || null
    const verbose = options.verbose || null
    const visit = verbose => doc => showDoc(doc, verbose)
    const traverseBatch = new TraverseBatch(client, projectId, path, traverseOptions, visit(verbose) )
    return await traverseBatch.execute()    

  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

module.exports = {
  getDocsAction
}


// const path = null
// const path = `bundles`
// const path = `users/DXmnNRjncvWSO7hvsObrW7Vaq9V2`
// const path = `users/Q3Z2xGFNERRRnilZzM9VhY4LlNh1`
// const path = `users`

// const traverseBatch = new TraverseBatch(client, projectId, path, {   }, visit )
// const traverseBatch = new TraverseBatch(client, projectId, path, { shallow: true }, visit )
// const traverseOptions = {
//   shallow: true, 
//   // collectionId: 'users',
//   // filterRegex: '^bundles\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
//   // filterRegex: '^bundles\/[^/]+$' // note: [^/]+ matches one or more characters that are not forward slash
//   // filterRegex: '^users\/[^/]+\/bundles\/[^/]+$'
//   filterRegex: '^users\/[^/]+$'
//   // filterRegex: '^users\/DXmnNRjncvWSO7hvsObrW7Vaq9V2$'
// }

