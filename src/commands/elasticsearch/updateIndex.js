const chalk = require('chalk')
const esapi = require('./esapi')
const utils = require('./utils')
const createIndex = require('./createIndex')
const loadIndex = require('./loadIndex')

async function updateIndexReloadAction(index, options, config, admin) {
  try {
    const indices = utils.getIndexConfigsFromParams(index, options, config)

    // validate that we have indexMapping for each index
    indices.forEach(indexConfig => {
      if (!indexConfig.indexMapping ) {
        throw new Error(`Missing indexMapping property from config for index ${indexConfig.name}`)
      }  
    })

    const confirmed = await utils.confirm(`About to create a new index and reload all objects for indices`
                                    + ` [${indices.map(indexConfig => indexConfig.name).join(', ')}].`
                                    + ` Are you sure?`)
    // get confirmation
    if (confirmed) {
      await updateIndexReload(indices, admin)
    }
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function updateIndexReload(indices, admin) {
  return Promise.all(indices.map(async indexConfig => {
    const index = indexConfig.name
    const newIndex = await createIndex.createIndex(index, indexConfig.indexMapping)
    const writeIndices = await esapi.getWriteAliasIndices(indexConfig.name)

    try {
      await esapi.changeAlias(`${index}_write`, writeIndices, [newIndex])
    } catch(error) {
      // attempt to cleanup newly created index, ignore errors
      try {
        await esapi.deleteIndex(newIndex)
      } catch(ignoreError) {
      }
      throw error
    }

    try {
      await loadIndex.loadIndex(indexConfig, admin)
    } catch(error) {
      try {
        // attempt to change write alias back to the original index
        // NOTE: new items may have been indexed against the new index and could be lost
        // If this fails, writes will occur against the new alias and reads against the old
        await esapi.changeAlias(`${index}_write`, [newIndex], writeIndices)
        await esapi.deleteIndex(newIndex)
      } catch(ignoreError) {
        throw new Error(`CRITICAL ERROR: Error loading new index '${newIndex}'` 
                        + ` and unable to change write alias back to original index: '${index}.`
                        + ` Index is in inconsistent state'.`
                        + ` Original error from loading new index: ${error.message}`)
      }
      throw error
    }
    
    let readIndices = []
    try {
      readIndices = await esapi.getReadAliasIndices(indexConfig.name)
      await esapi.changeAlias(`${index}_read`, readIndices, [newIndex])
    } catch(error) {
      throw new Error(`CRITICAL ERROR: The new index '${newIndex}'` 
      + ` was successfully created and loaded but the read alias could not be changed to the new index.`
      + ` Index is in inconsistent state'.  Corrective action is to`
      + ` change the read alias '${readIndices}' to point to the new index '${newIndex}'.`
      + ` Error from changing new index: ${error.message}`)
    }

    // all successful -> delete old indices
    await Promise.all(readIndices.map(async index => {
      try {
        await esapi.deleteIndex(index)
      } catch(ignoreError) {
        console.log(chalk.yellow(`WARNING: New index created and loaded successfully but failed to delete old index: ${index}`))
      }
    }))

    console.log(chalk.green(`New index '${chalk.blue.bold(newIndex)}' created successfully, documents indexed, and read and write aliases pointed to new index.`))
    return newIndex
  }))
}

async function reindexAction(index, options, config, admin) {
  try {
    const indices = utils.getIndexConfigsFromParams(index, options, config)

    // validate that we have indexMapping for each index
    indices.forEach(indexConfig => {
      if (!indexConfig.indexMapping ) {
        throw new Error(`Missing indexMapping property from config for index ${indexConfig.name}`)
      }  
    })

    const confirmed = await utils.confirm(`About to reindex into a new index for indices`
                                    + ` [${indices.map(indexConfig => indexConfig.name).join(', ')}].`
                                    + ` Are you sure?`)
    if (confirmed) {
      await reindex(indices)
    }
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function reindex(indices) {
  return Promise.all(indices.map(async indexConfig => {
    const index = indexConfig.name
    const newIndex = await createIndex.createIndex(index, indexConfig.indexMapping)
    const writeIndices = await esapi.getWriteAliasIndices(indexConfig.name)

    try {
      await esapi.changeAlias(`${index}_write`, writeIndices, [newIndex])
    } catch(error) {
      // attempt to cleanup newly created index, ignore errors
      try {
        await esapi.deleteIndex(newIndex)
      } catch(ignoreError) {
      }
      throw error
    }

    try {
      await esapi.reindex(`${index}_read`, `${index}_write`)
    } catch(error) {
      try {
        // attempt to change write alias back to the original index
        // NOTE: new items may have been indexed against the new index and could be lost
        // If this fails, writes will occur against the new alias and reads against the old
        await esapi.changeAlias(`${index}_write`, [newIndex], writeIndices)
        await esapi.deleteIndex(newIndex)
      } catch(ignoreError) {
        throw new Error(`CRITICAL ERROR: Error reindexing to new index '${newIndex}'` 
                        + ` and unable to change write alias back to original index: '${index}.`
                        + ` Index is in inconsistent state'.`
                        + ` Original error from loading new index: ${error.message}`)
      }
      throw error
    }
    
    let readIndices = []
    try {
      readIndices = await esapi.getReadAliasIndices(indexConfig.name)
      await esapi.changeAlias(`${index}_read`, readIndices, [newIndex])
    } catch(error) {
      throw new Error(`CRITICAL ERROR: The new index '${newIndex}'` 
      + ` was successfully created and loaded but the read alias could not be changed to the new index.`
      + ` Index is in inconsistent state'.  Corrective action is to`
      + ` change the read alias '${readIndices}' to point to the new index '${newIndex}'.`
      + ` Error from changing new index: ${error.message}`)
    }

    // all successful -> delete old indices
    await Promise.all(readIndices.map(async index => {
      try {
        await esapi.deleteIndex(index)
      } catch(ignoreError) {
        console.log(chalk.yellow(`WARNING: New index created and loaded successfully but failed to delete old index: ${index}`))
      }
    }))

    console.log(chalk.green(`New index '${chalk.blue.bold(newIndex)}' created successfully, documents reindexed, and read and write aliases pointed to new index.`))
    return newIndex
  }))
}

module.exports = {
  updateIndexReloadAction,
  updateIndexReload,
  reindexAction,
  reindex
}