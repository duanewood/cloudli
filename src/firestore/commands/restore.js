const debug = require('debug')('cloudli:restore')
const admin = require('firebase-admin')
const fs = require('fs-extra')
const path = require('path')
const { Observable, empty, of } = require('rxjs')
const { bufferTime, catchError, mergeMap, finalize } = require('rxjs/operators')
const Colors = require('../../Colors')
const utils = require('./utils')
const FirestoreMapper = require('../api/FirestoreMapper')
const { logger, confirm } = require('../../commonutils')

const restoreAction = async (basePath, options, config) => {
  try {
    const verbose = !!options.verbose

    if (!process.stdout.isTTY && !options.bypassConfirm) {
      throw new Error('--bypassConfirm option required when redirecting output')
    }

    logger.info(Colors.prep(`About to restore documents from ${basePath}`))
    const confirmed =
      options.bypassConfirm || (await confirm(Colors.warning(`Are you sure?`)))

    if (confirmed) {
      logger.info(Colors.start(`Starting restore documents from ${basePath}`))

      utils.initAdmin(config)
      const db = admin.firestore()

      const limits = {
        readJsonConcurrency: 5,
        batchWrite: 100,
        waitForBatchMs: 200,
        batchWriteConcurrency: 5
      }

      const normalizedBasePath = path.normalize(basePath)

      // observable of recursive traversal of files starting with basePath
      const file$ = files(normalizedBasePath).pipe(
        // read json and map for storage
        mergeMap(
          async file => {
            const json = await fs.readJson(file)
            // strip off basePath and trailing .json
            const docRefPath = file.slice(
              normalizedBasePath.length + 1,
              file.length - 5
            )
            if (verbose) {
              logger.info(Colors.info(docRefPath))
            }
            // FirestoreMapper handles converting things like Timestamps and GeoPoints
            return {
              file,
              docRefPath: docRefPath,
              doc: FirestoreMapper(json)
            }
          },
          undefined,
          limits.readJsonConcurrency
        ),

        // wait for up to batchWrite docs or waitForBatchMs, whichever comes first
        bufferTime(limits.waitForBatchMs, undefined, limits.batchWrite),

        // Don't continue processing if the timer in `bufferTime` was reached and
        // there are no buffered docs
        mergeMap(docs => {
          return docs.length > 0 ? of(docs) : empty()
        }),

        //  Write the documents to firestore in batches up to batchWriteConcurrency batches at a time
        mergeMap(
          async docs => {
            writeBatch(db, docs)
            return docs
          },
          undefined,
          limits.batchWriteConcurrency
        ),
        finalize(files => {
          logger.info(Colors.complete(`Completed restore`))
        }),
        catchError(async err => {
          logger.error(Colors.error(`Restore Error: ${err.message}`))
          return err
        })
      )
      file$.subscribe(docs => {
        debug(
          Colors.debug(
            'Processed: ' + docs.map(doc => doc.docRefPath).join(', ')
          )
        )
      })
    }
  } catch (error) {
    logger.error(Colors.error(`Error: ${error.message}`))
    process.exit(1)
  }
}

/**
 * Return observable of all json files in directories under dir
 * @param {string} dir the base directory
 */
const files = dir => {
  return new Observable(subscriber => {
    const visitFile = file => subscriber.next(file)
    getFiles(dir, visitFile)
      .then(() => subscriber.complete())
      .catch(err => {
        logger.error(Colors.error(`Error: ${err}`))
        subscriber.error(err)
      })
  })
}

const getFiles = async (dir, visit) => {
  return fs.readdir(dir).then(async files => {
    const jsonFiles = files.filter(file => file.endsWith('.json'))
    jsonFiles.forEach(file => visit(path.join(dir, file)))
    const subdirs = files.filter(file =>
      fs.statSync(path.join(dir, file)).isDirectory()
    )
    return Promise.all(
      subdirs.map(subdir => getFiles(path.join(dir, subdir), visit))
    )
  })
}

const writeBatch = async (db, files) => {
  const batch = db.batch()
  files.forEach(file => {
    const ref = db.doc(file.docRefPath)
    batch.set(ref, file.doc)
  })
  debug(Colors.debug(`writeBatch: ${files.length} files`))
  return batch.commit()
}

module.exports = {
  restoreAction
}
