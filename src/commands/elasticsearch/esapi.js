const AWS = require('aws-sdk')
const serviceAccount = require('../../../.keys/aws-elasticsearch.json')

const region = serviceAccount.region
const domain = serviceAccount.domain

/**
 * Elasticsearch APIs
 */

const indexDocument = async (index, document, id) => {
  // console.log(`indexDocument: ${index}, document: ${document}, id: ${id}`)
  return new Promise((resolve, reject) => {
    const endpoint = new AWS.Endpoint(domain)
    const request = new AWS.HttpRequest(endpoint, region)
  
    request.method = 'PUT'
    request.path += index + '/_doc/' + id
    request.body = JSON.stringify(document)
    request.headers['host'] = domain
    request.headers['Content-Type'] = 'application/json'
    // Content-Length is only needed for DELETE requests that include a request
    // request.headers['Content-Length'] = request.body.length
  
    const credentials = new AWS.Credentials(serviceAccount.id, serviceAccount.key)
    const signer = new AWS.Signers.V4(request, 'es')
    signer.addAuthorization(credentials, new Date())
  
    const client = new AWS.HttpClient()
    client.handleRequest(request, null, (response) => {
      // console.log(response.statusCode + ' ' + response.statusMessage)
      if (response.statusCode != 200 && response.statusCode != 201) {
        reject(new Error(`Error indexing document: index=${index}, error: ${response.statusCode} ${response.statusMessage}`))
        return
      }
      let responseBody = ''
      response.on('data', (chunk) => {
        responseBody += chunk
      })
      response.on('end', (chunk) => {
        // console.log('Response body: ' + responseBody)
        resolve(responseBody)
      })
    }, (error)=> {
      reject(error)
    })  
  })
}

const deleteIndex = async (index, id) => {
  return new Promise((resolve, reject) => {
    const endpoint = new AWS.Endpoint(domain)
    const request = new AWS.HttpRequest(endpoint, region)
  
    request.method = 'DELETE'
    request.path += index + '/_doc/' + id
    request.headers['host'] = domain
  
    const credentials = new AWS.Credentials(serviceAccount.id, serviceAccount.key)
    const signer = new AWS.Signers.V4(request, 'es')

    signer.addAuthorization(credentials, new Date())
  
    const client = new AWS.HttpClient()
    client.handleRequest(request, null, (response) => {
      console.log('DELETE: ' + response.statusCode + ' ' + response.statusMessage)
      let responseBody = ''
      response.on('data', (chunk) => {
        responseBody += chunk
      })
      response.on('end', (chunk) => {
        console.log('DELETE: Response body: ' + responseBody)
        resolve(responseBody)
      });
    }, (error) => {
      console.log('DELETE: Error: ' + error)
      reject(error)
    })  
  })
}

const createIndex = async (index, mappingJson) => {
  // console.log(`createIndex: ${index}`)
  return new Promise((resolve, reject) => {
    const endpoint = new AWS.Endpoint(domain)
    const request = new AWS.HttpRequest(endpoint, region)
  
    request.method = 'PUT'
    request.path += index
    request.body = JSON.stringify(mappingJson)
    request.headers['host'] = domain
    request.headers['Content-Type'] = 'application/json'
  
    const credentials = new AWS.Credentials(serviceAccount.id, serviceAccount.key)
    const signer = new AWS.Signers.V4(request, 'es')
    signer.addAuthorization(credentials, new Date())
  
    const client = new AWS.HttpClient()
    client.handleRequest(request, null, (response) => {
      console.log('PUT: ' + response.statusCode + ' ' + response.statusMessage)
      if (response.statusCode != 200 && response.statusCode != 201) {
        reject(new Error(`Error creating index: index=${index}, error: ${response.statusCode} ${response.statusMessage}`))
        return
      }

      let responseBody = ''
      response.on('data', (chunk) => {
        responseBody += chunk
      })
      response.on('end', (chunk) => {
        console.log('PUT: Response body: ' + responseBody)
        resolve(responseBody)
      });
    }, (error) => {
      console.log('PUT: Error: ' + error)
      reject(error)
    })  
  })
}

 module.exports = {
  indexDocument: indexDocument,
  deleteIndex: deleteIndex,
  createIndex: createIndex
 }