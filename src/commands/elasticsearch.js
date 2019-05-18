const fs = require('fs-extra')
const chalk = require('chalk')
const traverse = require('../util/traverse')
const esapi = require('./elasticsearch/esapi')
var moment = require('moment')

/**
 * Elasticsearch indexing commands
 * 
 * @param {object} program - command line program object (see commander package)
 * @param {object} config - configuration object - contains 'elasticsearch' configuration settings
 * @param {object} admin - firebase admin api object
 */
exports.addCommand = (program, config, admin) => {
  program
  .command('load-index [index]')
  .description('load elasticsearch index from firestore')
  .action((index, options) => loadIndexAction(index, options, config, admin))

  program.command('create-index <index>')
  .description('create elasticsearch index definition with the name <indexname>yyyyMMddHHmm')
  .action((index, options) => createIndexAction(index, options, config, admin))
}

async function loadIndexAction(index, options, config, admin) {
  try {
    index = index || (config.has('elasticsearch.defaultIndex')
                      ? config.get('elasticsearch.defaultIndex') 
                      : '*')
    if (!config.has('elasticsearch.indices')) {
      throw new Error(`Missing indices in config`)
    }

    const indices = config.get('elasticsearch.indices')
    if (!Array.isArray(indices)) {
      throw new Erorr(`indices setting in config must be an array of obects`)
    }
    if (index === '*') {
      indices.forEach(indexObj => {
        if (!indexObj || !indexObj.name || !indexObj.path) {
          throw new Error(`Invalid indices in config`)
        }  
      })

      await loadIndex(indices, admin)
    } else {
      // find the named index
      const indexObj = indices.find(obj => obj.name && (obj.name === index))
      if (!indexObj || !indexObj.name || !indexObj.path) {
        throw new Error(`Missing index '${index}' in config`)
      }
      await loadIndex([indexObj], admin)
    }
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function loadIndex(indices, admin) {
  const db = admin.firestore()
  return Promise.all(indices.map(async indexConfig => {
    const index = indexConfig.name
    console.log(chalk.blue(`loadIndex(${index})`))
    await traverse(db, null, indexConfig.path, visitIndexer(indexConfig))


    // const logger = []
    // const ids = await traverse.traverse(db, null, indexObj.path, visitLogger(logger))
    // ids.forEach(id => {
    //   console.log(chalk.yellow(`Result id: ${id}`))
    // })
    // logger.forEach(msg => {
    //   console.log(chalk.blue(msg))
    // })
    // return ids
  }))
}

const visitLogger = logger => async doc => {
  console.log(chalk.green(`visitLogger: id: ${doc.id}, path: ${doc.ref.path}`))
  logger.push(`Logger: visit id: ${chalk.bold(doc.id)}`)
  return doc.id
}

async function visit(doc) {
  console.log(chalk.green(`Visit: id: ${doc.id}, path: ${doc.ref.path}`))
  return doc.id
}

const visitIndexer = indexConfig => {
  const index = indexConfig.name
  const writeIndex = `${index}_write`
  const mapper = indexConfig.objectMapper 
                 ? require(`./elasticsearch/objectMappers/${indexConfig.objectMapper}`) 
                 : null
  return async doc => {
    console.log(chalk.green(`visitIndexer: id: ${doc.id}, path: ${doc.ref.path}`))
    const docToIndex = mapper ? mapper(doc.data()) : doc.data()
    const id = docToIndex.id
    if (!id) {
      console.log(chalk.red(`visitIndexer - bad document: id: ${doc.id}, object.id: ${id}`))
    }
    return esapi.indexDocument(writeIndex, docToIndex, doc.id).catch(error => {
      // console.log(chalk.red(`Error in indexDocument: ${error.message}`))
      throw error
    })
  }
}

async function createIndexAction(index, options, config, admin) {
  try {
    index = index || (config.has('elasticsearch.defaultIndex')
                      ? config.get('elasticsearch.defaultIndex') 
                      : '*')
    if (!config.has('elasticsearch.indices')) {
      throw new Error(`Missing indices in config`)
    }

    const indices = config.get('elasticsearch.indices')
    if (!Array.isArray(indices)) {
      throw new Erorr(`indices setting in config must be an array of obects`)
    }
    
    if (index === '*') {
      indices.forEach(indexObj => {
        if (!indexObj || !indexObj.name || !indexObj.indexMapping ) {
          throw new Error(`Invalid indices in config`)
        }  
      })

      await createIndices(indices)
    } else {
      // find the named index
      const indexObj = indices.find(obj => obj.name && (obj.name === index))
      if (!indexObj || !indexObj.name || !indexObj.indexMapping) {
        throw new Error(`Missing or incomplete index '${index}' in config`)
      }
      await createIndices([indexObj])
    }
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function createIndices(indices) {
  return Promise.all(indices.map(async indexConfig => {
    const index = indexConfig.name
    console.log(chalk.blue(`createIndices(${index})`))
    const indexMappingJson = fs.readJsonSync(indexConfig.indexMapping)

    const indexWithDateTime = `${index}_${moment().format('YYYYMMDDHHmm')}`
    await esapi.createIndex(indexWithDateTime, indexMappingJson)
    console.log(chalk.green(`Created index ${chalk.bold(indexWithDateTime)}`))
  }))
}

