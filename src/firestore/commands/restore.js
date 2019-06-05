const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const backup = require('../visitors/backup')
const utils = require('./utils')
const commonutils = require('../../commonutils')
const FirestoreMapper = require('../api/FirestoreMapper')
const { Subject, Observable, empty, from, of } = require('rxjs')
const { bufferTime, catchError, mergeMap, scan, tap } = require('rxjs/operators')

const restoreAction = async (basePath, options, config, admin) => {
  try {

    const confirmed = await commonutils.confirm(`About to restore documents from ${basePath}.`
                                    + ` Are you sure?`)
    if (confirmed) {
      const db = admin.firestore()

      const limits = {
        readJsonConcurrency: 5,
        batchWrite: 12,
        waitForBatchMs: 200,
        batchWriteConcurrency: 2,
      }

      const normalizedBasePath = path.normalize(basePath)
      const file$ = files(normalizedBasePath).pipe(

        // read json and map for storage
        mergeMap(
          async file => {
            // strip off basePath and trailing .json
            const json = await fs.readJson(file)
            const docRefPath = file.slice(normalizedBasePath.length + 1, file.length - 5)
            console.log(chalk.yellow(`docRefPath: ${docRefPath}`))
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

        /**
         * Don't continue processing if the timer in `bufferTime` was reached and
         *   there are no buffered docs
         */
        mergeMap(docs => {
          return docs.length > 0 ? of(docs) : empty()
        }),

        /**
         * Set the companies accumulated in `bufferTime`.
         *   Also allow multiple batches to be set concurrently
         */
        mergeMap(
          async docs => {
            writeBatch(db, docs)
            return docs
          },
          undefined,
          limits.batchWriteConcurrency
        ),
        catchError(async err => {
          console.log(chalk.red(`Restore Error: ${err.message}`))
          return err
        }),
      )
      file$.subscribe(files => console.log(chalk.blue(files)))
    }
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

const files = dir => {
  return new Observable(subscriber => {
    const visitFile = file => subscriber.next(file)
    getFiles(dir, visitFile)
      .then(() => subscriber.complete())
      .catch(err => {
        console.error(chalk.red(`Error: ${err}`))
        subscriber.error
      })
  })
}

const getFiles = async (dir, visit) => {
  return fs.readdir(dir).then(async files => {
    const jsonFiles = files.filter(file => file.endsWith('.json'))
    jsonFiles.forEach(file => visit(path.join(dir, file)))
    const subdirs = files.filter(file => fs.statSync(path.join(dir, file)).isDirectory())
    return Promise.all(subdirs.map(subdir => getFiles(path.join(dir, subdir), visit)))
  })
}

const writeBatch = async (db, files) => {
  const batch = db.batch()
  files.forEach(file => {
    const ref = db.doc(file.docRefPath)
    batch.set(ref, file.doc)
  })
  console.log(chalk.cyan(`writeBatch: ${files.length} files`))
  return batch.commit()
}

module.exports = {
  restoreAction
}
