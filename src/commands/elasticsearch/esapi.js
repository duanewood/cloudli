const AWS = require('aws-sdk')
const serviceAccount = require('../../../.keys/aws-elasticsearch.json')

const region = serviceAccount.region
const domain = serviceAccount.domain

/**
 * Elasticsearch APIs
 */
const indexDocument = async (index, document, id) => {
  return awsApi('PUT', index + '/_doc/' + id, JSON.stringify(document))
}

// const indexDocument = async (index, document, id) => {
//   // console.log(`indexDocument: ${index}, document: ${document}, id: ${id}`)
//   return new Promise((resolve, reject) => {
//     const endpoint = new AWS.Endpoint(domain)
//     const request = new AWS.HttpRequest(endpoint, region)
  
//     request.method = 'PUT'
//     request.path += index + '/_doc/' + id
//     request.body = JSON.stringify(document)
//     request.headers['host'] = domain
//     request.headers['Content-Type'] = 'application/json'
//     // Content-Length is only needed for DELETE requests that include a request
//     // request.headers['Content-Length'] = request.body.length
  
//     const credentials = new AWS.Credentials(serviceAccount.id, serviceAccount.key)
//     const signer = new AWS.Signers.V4(request, 'es')
//     signer.addAuthorization(credentials, new Date())
  
//     const client = new AWS.HttpClient()
//     client.handleRequest(request, null, (response) => {
//       // console.log(response.statusCode + ' ' + response.statusMessage)
//       if (response.statusCode != 200 && response.statusCode != 201) {
//         reject(new Error(`Error indexing document: index=${index}, error: ${response.statusCode} ${response.statusMessage}`))
//         return
//       }
//       let responseBody = ''
//       response.on('data', (chunk) => {
//         responseBody += chunk
//       })
//       response.on('end', (chunk) => {
//         // console.log('Response body: ' + responseBody)
//         resolve(responseBody)
//       })
//     }, (error)=> {
//       reject(error)
//     })  
//   })
// }

const deleteDocumentFromIndex = async (index, id) => {
  return awsApi('DELETE', index + '/_doc/' + id)
}

// const deleteDocumentFromIndex = async (index, id) => {
//   return new Promise((resolve, reject) => {
//     const endpoint = new AWS.Endpoint(domain)
//     const request = new AWS.HttpRequest(endpoint, region)
  
//     request.method = 'DELETE'
//     request.path += index + '/_doc/' + id
//     request.headers['host'] = domain
  
//     const credentials = new AWS.Credentials(serviceAccount.id, serviceAccount.key)
//     const signer = new AWS.Signers.V4(request, 'es')

//     signer.addAuthorization(credentials, new Date())
  
//     const client = new AWS.HttpClient()
//     client.handleRequest(request, null, (response) => {
//       console.log('DELETE: ' + response.statusCode + ' ' + response.statusMessage)
//       let responseBody = ''
//       response.on('data', (chunk) => {
//         responseBody += chunk
//       })
//       response.on('end', (chunk) => {
//         console.log('DELETE: Response body: ' + responseBody)
//         resolve(responseBody)
//       });
//     }, (error) => {
//       console.log('DELETE: Error: ' + error)
//       reject(error)
//     })  
//   })
// }

const createIndex = async (index, mappingJson) => {
  return awsApi('PUT', index, JSON.stringify(mappingJson))
}

const deleteIndex = async (index) => {
  return awsApi('DELETE', index)
}

// const createIndex = async (index, mappingJson) => {
//   // console.log(`createIndex: ${index}`)
//   return new Promise((resolve, reject) => {
//     const endpoint = new AWS.Endpoint(domain)
//     const request = new AWS.HttpRequest(endpoint, region)
  
//     request.method = 'PUT'
//     request.path += index
//     request.body = JSON.stringify(mappingJson)
//     request.headers['host'] = domain
//     request.headers['Content-Type'] = 'application/json'
  
//     const credentials = new AWS.Credentials(serviceAccount.id, serviceAccount.key)
//     const signer = new AWS.Signers.V4(request, 'es')
//     signer.addAuthorization(credentials, new Date())
  
//     const client = new AWS.HttpClient()
//     client.handleRequest(request, null, (response) => {
//       console.log('PUT: ' + response.statusCode + ' ' + response.statusMessage)
//       if (response.statusCode != 200 && response.statusCode != 201) {
//         reject(new Error(`Error creating index: index=${index}, error: ${response.statusCode} ${response.statusMessage}`))
//         return
//       }

//       let responseBody = ''
//       response.on('data', (chunk) => {
//         responseBody += chunk
//       })
//       response.on('end', (chunk) => {
//         console.log('PUT: Response body: ' + responseBody)
//         resolve(responseBody)
//       });
//     }, (error) => {
//       console.log('PUT: Error: ' + error)
//       reject(error)
//     })  
//   })
// }


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

const awsApi = async (method, path, body, contentType) => {
  return new Promise((resolve, reject) => {
    const endpoint = new AWS.Endpoint(domain)
    const request = new AWS.HttpRequest(endpoint, region)
  
    request.method = method
    request.path += path
    
    if (body) {
      request.body = body
      request.headers['Content-Type'] = contentType || 'application/json'
    }
    request.headers['host'] = domain
    if (method === 'DELETE' && body) {
      // Content-Length is only needed for DELETE requests that include a request
      request.headers['Content-Length'] = request.body.length
    }
  
    const credentials = new AWS.Credentials(serviceAccount.id, serviceAccount.key)
    const signer = new AWS.Signers.V4(request, 'es')
    signer.addAuthorization(credentials, new Date())
  
    const client = new AWS.HttpClient()
    client.handleRequest(request, null, (response) => {
      // console.log(`${method}: ${response.statusCode} ${response.statusMessage}`)
      if (response.statusCode != 200 && response.statusCode != 201) {
        reject(new Error(`Error from AWS Api: ${method} ${path}: ${path}, error: ${response.statusCode} ${response.statusMessage}`))
        return
      }

      let responseBody = ''
      response.on('data', (chunk) => {
        responseBody += chunk
      })
      response.on('end', (chunk) => {
        // console.log(`${method}: Response body: ${responseBody}`)
        resolve(responseBody)
      });
    }, (error) => {
      console.error(`${method}: Error: ${error}`)
      reject(error)
    })  
  })
}

 module.exports = {
  indexDocument: indexDocument,
  deleteDocumentFromIndex: deleteDocumentFromIndex,
  createIndex: createIndex,
  deleteIndex: deleteIndex,
  getReadAliasIndices: getReadAliasIndices,
  getWriteAliasIndices: getWriteAliasIndices,
  changeAlias: changeAlias,
  reindex: reindex
 }
