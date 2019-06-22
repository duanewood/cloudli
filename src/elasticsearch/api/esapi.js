const debug = require('debug')('bundle:elasticsearch')
const AWS = require('aws-sdk')
// const serviceAccount = require('../../../.keys/aws-elasticsearch.json')

let serviceAccount = null

/**
 * Elasticsearch APIs
 * 
 * Must call initApi with Service Account object before calling other APIs.
 * Service account object must include domain, region, id, and key.
 * 
 * Enable debug logging with DEBUG=bundle:elasticsearch
 */
const initApi = svcAcct => {
  serviceAccount = svcAcct
}

const indexDocument = async (index, document, id) => {
  return awsApi('PUT', index + '/_doc/' + id, JSON.stringify(document))
}

const deleteDocumentFromIndex = async (index, id) => {
  return awsApi('DELETE', index + '/_doc/' + id)
}

const createIndex = async (index, mappingJson) => {
  return awsApi('PUT', index, JSON.stringify(mappingJson))
}

const deleteIndex = async (index) => {
  return awsApi('DELETE', index)
}

const getReadAliasIndices = async (index) => {
  const aliasIndexString = await awsApi('GET', `_alias/${index}_read`)
  const aliasIndex = JSON.parse(aliasIndexString)
  return Object.keys(aliasIndex)
}

const getWriteAliasIndices = async (index) => {
  const aliasIndexString = await awsApi('GET', `_alias/${index}_write`)
  const aliasIndex = JSON.parse(aliasIndexString)
  return Object.keys(aliasIndex)
}

const createAliases = async (index, aliases) => {
  const body = 
    `{
      "actions": [
        {
          "add": {
            "index": "${index}",
            "aliases": [${ aliases.map(alias => `"${alias}"`).join(',') }]
          }          
        }
      ]
    }`

  return awsApi('POST', '_aliases', body)

}

/**
 * Changes the alias from pointing to fromIndices to pointing to toIndices.
 * 
 * @param {string} alias The alias to reassign
 * @param {array} fromIndices The array of from index names. May be empty.  If empty, the alias is added.
 * @param {array} toIndices The array of to index names.  Must not be empty.
 */
const changeAlias = async (alias, fromIndices, toIndices) => {
  const changeBody = 
    `{
      "actions": [
        ${ fromIndices && fromIndices.length > 0 &&
          `{
            "remove": {
              "indices": [${ fromIndices.map(index => `"${index}"`).join(',') }],
              "alias": "${alias}"
            }
          },
          `
        }
        ${ toIndices && toIndices.length > 0 &&
          `{
            "add": {
              "indices": [${ toIndices.map(index => `"${index}"`).join(',') }],
              "alias": "${alias}"
            }
          }`
        }
      ]
    }`

  return awsApi('POST', '_aliases', changeBody)
}

const reindex = async (fromIndex, toIndex) => {
  const body = {
    source: {
      index: fromIndex
    },
    dest: {
      index: toIndex
    }
  }
  return awsApi('POST', '_reindex', JSON.stringify(body))

}

const search = async (text, indexOrAlias, sourceFields) => {
  const body = `{
    "query": {
      "bool": {
        "must": {
          "multi_match" : {
            "query" : "${text}" 
          }
        }
      }      
    },
    ${ sourceFields ? `"_source": ${JSON.stringify(sourceFields)}, ` : '' }
    "highlight" : {
      "fields" : {
        "*" : {}
      }
    }
  }`

  return awsApi('POST', indexOrAlias + '/_search', body)
}

const awsApi = async (method, path, body, contentType) => {

  if (!serviceAccount) {
    throw new Error('AWS API is not initialized.  Call initApi before calling other APIs.')
  } else if (!serviceAccount.domain || !serviceAccount.region 
             || !serviceAccount.id || !serviceAccount.key) {
    throw new Error('Invalid AWS service account')
  }

  return new Promise((resolve, reject) => {
    const endpoint = new AWS.Endpoint(serviceAccount.domain)
    const request = new AWS.HttpRequest(endpoint, serviceAccount.region)
  
    request.method = method
    request.path += path
    
    if (body) {
      request.body = body
      request.headers['Content-Type'] = contentType || 'application/json'
    }
    request.headers['host'] = serviceAccount.domain
    if (method === 'DELETE' && body) {
      // Content-Length is only needed for DELETE requests that include a request
      request.headers['Content-Length'] = request.body.length
    }
  
    const credentials = new AWS.Credentials(serviceAccount.id, serviceAccount.key)
    const signer = new AWS.Signers.V4(request, 'es')
    signer.addAuthorization(credentials, new Date())
  
    const client = new AWS.HttpClient()
    client.handleRequest(request, null, (response) => {
      debug(`awsApi ${method} ${path}: ${response.statusCode} ${response.statusMessage}`)
      if (response.statusCode != 200 && response.statusCode != 201) {
        reject(new Error(`Error from AWS Api: ${method} ${path}: ${path}, error: ${response.statusCode} ${response.statusMessage}`))
        return
      }

      let responseBody = ''
      response.on('data', (chunk) => {
        responseBody += chunk
      })
      response.on('end', (chunk) => {
        debug(`awsApi ${method} ${path}: Received 'end' of response. responseBody: ${responseBody}`)
        resolve(responseBody)
      });
    }, (error) => {
      debug(`awsApi: ${method} ${path}: Error: ${error}`)
      reject(error)
    })  
  })
}

module.exports = {
  initApi,
  indexDocument,
  deleteDocumentFromIndex,
  createIndex,
  deleteIndex,
  getReadAliasIndices,
  getWriteAliasIndices,
  changeAlias,
  createAliases,
  reindex,
  search
}
