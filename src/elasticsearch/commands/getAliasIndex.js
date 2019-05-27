const chalk = require('chalk')
const esapi = require('../api/esapi')
const utils = require('./utils')

/**
 * Gets the current index that is tied to the 
 * <index name>_read and <index name>_write aliases.
 * 
 * The resulting index will be in the form <index name>_YYYYMMDDHHmm
 * 
 * @param {*} index The optional base <index name> (or * for all indices defined in config).  
 *                  If not supplied, defaults to all indices.
 * @param {*} options Command line options (see commmander) 
 * @param {*} config The config object.  Must contain "indices" element with name, path, objectMapper, indexMapping.
 * @param {*} admin The firebase admin object
 */
async function getAliasIndexAction(index, options, config, admin) {
  const indices = utils.getIndexConfigsFromParams(index, options, config)

  try {
    await getAliasIndices(indices)
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

/**
 * Gets the current index that is tied to the 
 * <index name>_read and <index name>_write aliases (for 1 or more indices)
 * 
 * The resulting index will be in the form <index name>_YYYYMMDDHHmm
 * 
 * @param {array} indices The array of IndexConfig objects based on the command line from config
 */
async function getAliasIndices(indices) {
  return Promise.all(indices.map(async indexConfig => {
    const index = indexConfig.name
    const readIndices = await esapi.getReadAliasIndices(index)
    const writeIndices = await esapi.getWriteAliasIndices(index)
    readIndices.forEach(i => {
      console.log(chalk.green(`Index for ${chalk.bold(index)} read alias: ${chalk.bold(i)}`))
    })
    writeIndices.forEach(i => {
      console.log(chalk.green(`Index for ${chalk.bold(index)} write alias: ${chalk.bold(i)}`))
    })
  }))
}

module.exports = {
  getAliasIndexAction,
  getAliasIndices
}