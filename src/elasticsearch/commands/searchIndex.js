const chalk = require('chalk')
const esapi = require('../api/esapi')
const utils = require('./utils')
const Colors = require('../../Colors')
const { logger } = require('../../commonutils')

/**
 * Searches one or more indices for text.
 * 
 * @param {string} text The text to search for
 * @param {*} index The optional base <index name> (or * for all indices defined in config).  
 *                  If not supplied, defaults to all indices.
 * @param {*} options Command line options (see commmander) 
 * @param {*} config The config object.  Must contain "indices" element with name, path, objectMapper, indexMapping.
 * @param {*} admin The firebase admin object
 */
async function searchIndexAction(text, index, options, config, admin) {

  try {
    const indices = utils.getIndexConfigsFromParams(index, options, config)
    await searchIndices(text, indices, !!options.verbose)
  } catch(error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

/**
 * Gets the current index that is tied to the 
 * 
 * @param {string} text The text to search for
 * @param {array} indices The array of IndexConfig objects based on the command line from config
 * @param {boolean} verbose Indicates whether to include document search results
 */
async function searchIndices(text, indices, verbose) {
  return Promise.all(indices.map(async indexConfig => {
    const index = `${indexConfig.name}_read`
    logger.info(Colors.prep(`Searching index '${index}' for '${text}'`))
    const results = await esapi.search(text, index)
    displayResults(JSON.parse(results), verbose)
  }))
}

function displayResults(results, verbose) {
  if (results.hits.total === 0) {
    logger.info(Colors.warning(`No matches`))
  } else {
    logger.info(Colors.info(`Found ${results.hits.total} matches`))
    results.hits.hits.forEach(hit => {
      const bundle = hit._source
      if (verbose) {
        logger.info('')
        logger.info(Colors.info(chalk.bold.underline(`Bundle: '${bundle.name || ""}' (${bundle.id})`)))
        logger.info(Colors.info(`Author: ${bundle.authorUser.displayName || ""}`))
        
        if (hit.highlight) {
          for (let [key, highlightStrings] of Object.entries(hit.highlight)) {
            highlightStrings.forEach(highlight => {
              highlightToConsole(key, highlight)
            })
          }
        }
      } else {
        logger.info(Colors.info(`Bundle: '${bundle.name || ""}' (${bundle.id})`))
      }
    })
  }
}

function highlightToConsole(key, highlight) {
  logger.info('')
  logger.info(Colors.highlightKey(key))
  const chalkString = highlight.replace(/<em>([\s\S]*)<\/em>/g, (match, p1) => Colors.highlight(p1))
  logger.info(chalkString)
}

module.exports = {
  searchIndexAction,
  searchIndices
}