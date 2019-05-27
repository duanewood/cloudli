const TraverseBatch = require('../api/traverseBatch')
const visit = require('../visitors/showId')
const utils = require('./utils')

const getDocs = async (index, options, config, admin) => {
  const client = utils.getClient(config)
  const projectId = await client.getProjectId()
  // const path = null
  // const path = `bundles`
  // const path = `users/DXmnNRjncvWSO7hvsObrW7Vaq9V2`
  const path = `users/Q3Z2xGFNERRRnilZzM9VhY4LlNh1`
  // const path = `users`
  
  // const traverseBatch = new TraverseBatch(client, projectId, path, {   }, visit )
  // const traverseBatch = new TraverseBatch(client, projectId, path, { shallow: true }, visit )
  const traverseOptions = {
    shallow: true, 
    // collectionId: 'users',
    // filterRegex: '^bundles\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    // filterRegex: '^bundles\/[^/]+$' // note: [^/]+ matches one or more characters that are not forward slash
    // filterRegex: '^users\/[^/]+\/bundles\/[^/]+$'
    filterRegex: '^users\/[^/]+$'
    // filterRegex: '^users\/DXmnNRjncvWSO7hvsObrW7Vaq9V2$'
  }
  const traverseBatch = new TraverseBatch(client, projectId, path, traverseOptions, visit )
  return await traverseBatch.execute()    
}

module.exports = {
  getDocs
}