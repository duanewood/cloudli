const inquirer = require('inquirer')

/**
 * Gets the list of IndexConfig objects based on command line parameters.
 * If index is null or undefined, defaults to all indices in config.
 * Validates that the IndexConfig objects exist in config and all have a name.
 * 
 * @param {string} index optional name of the index
 * @param {object} options command line from commmander
 * @param {object} config config object from node-config
 * @return {array} array of IndexConfig objects
 */
function getIndexConfigsFromParams(index, options, config) {
  index = index || (config.has('elasticsearch.defaultIndex')
                    ? config.get('elasticsearch.defaultIndex') 
                    : '*')

  if (!config.has('elasticsearch.indices')) {
    throw new Error(`Missing indices in config`)
  }

  let indices = config.get('elasticsearch.indices')
  if (!Array.isArray(indices)) {
    throw new Erorr(`indices setting in config must be an array of obects`)
  }

  if (index !== '*') {
    const indexObj = indices.find(obj => obj.name && (obj.name === index))
    if (!indexObj) {
      throw new Error(`Index ${index} not found in config`)
    }  
    indices = [indexObj]
  }
  indices.forEach(indexObj => {
    if (!indexObj.name) {
      throw new Error(`Missing name property from config for one or more index config`)
    }  
  })

  return indices
}

/**
 * Displays a confirmation prompt
 * 
 * @param {string} prompt
 */
async function confirm(prompt) {
  return inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message: prompt,
    default: false
  }).then(answers => {
    if (answers.confirm) {
      return answers.confirm
    } else {
      return false
    }
  })
}

module.exports = {
  getIndexConfigsFromParams: getIndexConfigsFromParams,
  confirm: confirm
}