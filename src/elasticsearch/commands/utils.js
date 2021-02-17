const get = require('lodash.get')
const isPlainObject = require('lodash.isplainobject')
const esapi = require('../api/esapi')

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
  index =
    index ||
    (config.has('elasticsearch.defaultIndex')
      ? config.get('elasticsearch.defaultIndex')
      : '*')

  if (!config.has('elasticsearch.indices')) {
    throw new Error(`Missing indices in config`)
  }

  let indices = config.get('elasticsearch.indices')
  if (!Array.isArray(indices)) {
    throw new Error(`indices setting in config must be an array of objects`)
  }

  if (index !== '*') {
    const indexObj = indices.find(obj => obj.name && obj.name === index)
    if (!indexObj) {
      throw new Error(`Index ${index} not found in config`)
    }
    indices = [indexObj]
  }
  indices.forEach(indexObj => {
    if (!indexObj.name) {
      throw new Error(
        `Missing name property from config for one or more index configs`
      )
    }
  })

  const envIndices = indices.map(indexObj => ({
    ...indexObj,
    name: esapi.getEnvIndexName(indexObj.name)
  }))

  return envIndices
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
const formatTemplateString = (template, vars) =>
  template.replace(/\${(.*?)}/g, (_, v) => {
    const value = get(vars, v, v)
    if (isPlainObject(value)) {
      return JSON.stringify(value, null, 2)
    } else {
      return value
    }
  })

module.exports = {
  getIndexConfigsFromParams,
  formatTemplateString
}
