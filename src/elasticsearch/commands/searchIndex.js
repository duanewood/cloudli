const chalk = require('chalk')
const get = require('lodash.get')
const isPlainObject = require('lodash.isplainobject')
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
 */
async function searchIndexAction(text, index, options, config) {

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

    const search = indexConfig.search ? indexConfig.search : {}

    const searchConfig = {
      title: 'id: ${_id}',
      verboseDetails: '${_source}',
      ...search
    }

    logger.info(Colors.prep(`Searching index '${index}' for '${text}'`))
    const results = await esapi.search(text, index, searchConfig.sourceFields)
    displayResults(index, JSON.parse(results), verbose, searchConfig)
  }))
}

function displayResults(index, results, verbose, searchConfig) {
  if (results.hits.total === 0) {
    logger.info(Colors.warning(`${index}: No matches`))
  } else {
    logger.info(Colors.info(`${index}: Found ${results.hits.total} matches`))

    results.hits.hits.forEach(hit => {
      const source = hit._source
      const title = format(searchConfig.title, hit)
      if (verbose) {
        logger.info('')
        const verboseDetails = format(searchConfig.verboseDetails, hit)
        logger.info(Colors.info(chalk.bold.underline(title)))
        logger.info(Colors.info(verboseDetails))
        
        if (hit.highlight) {
          for (let [key, highlightStrings] of Object.entries(hit.highlight)) {
            highlightStrings.forEach(highlight => {
              highlightToConsole(key, highlight)
            })
          }
        }
      } else {
        logger.info(Colors.info(title))
      }
    })
  }
}

function highlightToConsole(key, highlight) {
  logger.info('')
  logger.info(Colors.highlightKey(key))
  const chalkString = highlight.replace(/<em>(.*?)<\/em>/g, (match, p1) => Colors.highlight(p1))
  logger.info(chalkString)
}

/**
 * Formats a template string containing substitution parameters in the form ${name}
 * 
 * @param {string} template the template string containing substitution parameters in the form ${name}.
 *                          name may be a nested name.  For example, ${item[0].product.name}
 * @param {object} vars the object to use for substitution.  name is resolved within vars.  
 *                          If any of the substitution values is an object, JSON.stringify will be
 *                          used for the substitution.
 * @return {string} the formatted string.  
 */
const format = (template, vars) => template.replace(/\${(.*?)}/g, (_, v) => {
  const value = get(vars, v, v)
  if (isPlainObject(value)) {
    return JSON.stringify(value, null, 2)
  } else {
    return value
  }
})

module.exports = {
  searchIndexAction,
  searchIndices
}