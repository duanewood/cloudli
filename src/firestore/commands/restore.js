const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const backup = require('../visitors/backup')
const utils = require('./utils')
const commonutils = require('../../commonutils')
const FirestoreMapper = require('../api/FirestoreMapper')

const restoreAction = async (basePath, options, config, admin) => {

  try {

    const confirmed = await commonutils.confirm(`About to restore documents from ${basePath}.`
                                    + ` Are you sure?`)
    if (confirmed) {
      const db = admin.firestore()
      return await restoreDir(db, basePath, null)
    }
  } catch(error) {
    console.error(chalk.red(`Error: ${error.message}`))
    process.exit(1)
  }
}

const restoreDir = async (db, dir, collectionPath) => {
  return fs.readdir(dir).then(async files => {
    const jsonFiles = files.filter(file => file.endsWith('.json'))
    const subdirs = files.filter(file => fs.statSync(path.join(dir, file)).isDirectory())
    await Promise.all(jsonFiles.map(file => addFile(db, dir, file, collectionPath)))
    return Promise.all(subdirs.map(subdir => restoreDir(db, path.join(dir, subdir), 
                                              collectionPath ? collectionPath + '/' + subdir : subdir)))
  })
}

const addFile = async (db, dir, file, collectionPath) => {
  const json = fs.readJsonSync(path.join(dir, file))
  const doc = FirestoreMapper(json)
  const id = path.parse(file).name
  try {
    const docRef = db.collection(collectionPath).doc(id)
    return docRef.set(doc)
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = {
  restoreAction
}
