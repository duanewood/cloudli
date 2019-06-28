const chalk = require('chalk')
const esapi = require('../api/esapi')
const utils = require('./utils')
const commonutils = require('../../commonutils')
const createIndex = require('./createIndex')
const loadIndex = require('./loadIndex')
const firestoreUtils = require('../../firestore/commands/utils')
const Colors = require('../../Colors')
const { logger, confirm } = require('../../commonutils')

async function updateIndexReloadAction(index, options, config) {
  try {
    const indices = utils.getIndexConfigsFromParams(index, options, config)

    // validate that we have indexMapping for each index
    for (const indexConfig of indices) {
      if (!indexConfig.indexMapping ) {
        throw new Error(`Missing indexMapping property from config for index ${indexConfig.name}`)
      }  

      // make sure aliases exist
      try { 
        await esapi.getReadAliasIndices(indexConfig.name)
      } catch(err) {
        throw new Error(`${indexConfig.name}_read alias is required`)
      }

      try { 
        await esapi.getWriteAliasIndices(indexConfig.name) 
      } catch(err) {
        throw new Error(`${indexConfig.name}_write alias is required`)
      }
    }

    if (!process.stdout.isTTY && !options.bypassConfirm) {
      throw new Error('--bypassConfirm option required when redirecting output')
    }

    const verbose = !!options.verbose

    const indicesMsg = `[${indices.map(indexConfig => indexConfig.name).join(', ')}]`
    logger.info(Colors.prep(`About to create a new index and reload all objects for indices ${indicesMsg}.`))
    const confirmed = options.bypassConfirm || await confirm(Colors.warning(`Are you sure?`))

    if (confirmed) {
      logger.info(Colors.start(`Starting update index and reload documents for indices ${indicesMsg}`))
      await updateIndexReload(indices, config, verbose)
      logger.info(Colors.complete(`Completed update index and reload documents.`))
    }
  } catch(error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function updateIndexReload(indices, config, verbose) {
  const client = firestoreUtils.getClient(config)

  return Promise.all(indices.map(async indexConfig => {
    const index = indexConfig.name
    if (verbose) {
      logger.info(Colors.info(`Creating new index for ${index}`))
    }
    const newIndex = await createIndex.createIndex(index, indexConfig.indexMapping, false) // false = don't create aliases
    const writeIndices = await esapi.getWriteAliasIndices(indexConfig.name)

    try {
      if (verbose) {
        logger.info(Colors.info(`Changing write alias ${ chalk.bold(`${index}_write`) } from ${ 
                    chalk.bold(`[${writeIndices}]`) } to ${ chalk.bold(newIndex) }`))
      }  
      await esapi.changeAlias(`${index}_write`, writeIndices, [newIndex])
    } catch(error) {
      // attempt to cleanup newly created index, ignore errors
      try {
        await esapi.deleteIndex(newIndex)
      } catch(ignoreError) {
        logger.warn(Colors.warning(`WARNING: Error changing alias but unable to delete new index ${newIndex}`))
      }
      throw error
    }

    try {
      await loadIndex.loadIndex(indexConfig, config, client, verbose)
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
        logger.info(Colors.warning(`WARNING: New index created and loaded successfully but failed to delete old index: ${index}`))
      }
    }))

    logger.info(Colors.info(`New index '${chalk.bold(newIndex)}' created successfully, documents indexed, and read and write aliases pointed to new index.`))
    return newIndex
  }))
}

async function reindexAction(index, options, config) {
  try {
    const indices = utils.getIndexConfigsFromParams(index, options, config)

    // validate that we have indexMapping for each index
    for (const indexConfig of indices) {
      if (!indexConfig.indexMapping ) {
        throw new Error(`Missing indexMapping property from config for index ${indexConfig.name}`)
      }  

      // make sure aliases exist
      try { 
        await esapi.getReadAliasIndices(indexConfig.name)
      } catch(err) {
        throw new Error(`${indexConfig.name}_read alias is required`)
      }

      try { 
        await esapi.getWriteAliasIndices(indexConfig.name) 
      } catch(err) {
        throw new Error(`${indexConfig.name}_write alias is required`)
      }      
    }

    if (!process.stdout.isTTY && !options.bypassConfirm) {
      throw new Error('--bypassConfirm option required when redirecting output')
    }

    const verbose = !!options.verbose

    const indicesMsg = `[${indices.map(indexConfig => indexConfig.name).join(', ')}]`
    logger.info(Colors.prep(`About to reindex into a new index for indices ${indicesMsg}.`))
    const confirmed = options.bypassConfirm || await confirm(Colors.warning(`Are you sure?`))

    if (confirmed) {
      logger.info(Colors.start(`Starting reindex for ${indicesMsg}`))
      await reindex(indices, verbose)
      logger.info(Colors.complete(`Completed reindex.`))
    }
  } catch(error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

async function reindex(indices, verbose) {
  return Promise.all(indices.map(async indexConfig => {
    const index = indexConfig.name
    if (verbose) {
      logger.info(Colors.info(`Creating new index for ${index}`))
    }

    const newIndex = await createIndex.createIndex(index, indexConfig.indexMapping, false) // false = don't create aliases    
    const writeIndices = await esapi.getWriteAliasIndices(indexConfig.name)

    try {
      if (verbose) {
        logger.info(Colors.info(`Changing write alias ${ chalk.bold(`${index}_write`) } from ${ 
                    chalk.bold(`[${writeIndices}]`) } to ${ chalk.bold(newIndex) }`))
      }  
      await esapi.changeAlias(`${index}_write`, writeIndices, [newIndex])
    } catch(error) {
      // attempt to cleanup newly created index, ignore errors
      try {
        await esapi.deleteIndex(newIndex)
      } catch(ignoreError) {
        logger.warn(Colors.warning(`WARNING: Error changing alias but unable to delete new index ${newIndex}`))
      }
      throw error
    }

    try {
      if (verbose) {
        logger.info(Colors.info(`Reindexing from ${index}_read to ${index}_write`))
      }
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
        logger.warn(Colors.warning(`WARNING: Reindex success but failed to delete old index: ${index}`))
      }
    }))

    logger.info(Colors.info(`New index '${chalk.bold(newIndex)}' created successfully, documents reindexed, and read and write aliases pointed to new index.`))
    return newIndex
  }))
}

module.exports = {
  updateIndexReloadAction,
  updateIndexReload,
  reindexAction,
  reindex
}