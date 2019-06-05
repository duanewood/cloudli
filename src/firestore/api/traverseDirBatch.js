const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const backup = require('../visitors/backup')
const commonutils = require('../../commonutils')
const FirestoreMapper = require('./FirestoreMapper')
// lib comes from: https://github.com/amsterdamharu/lib/blob/master/src/index.js
// const lib = require("lib")

const traverseDirBatch = async (dir, visitFile) => {
  await getFiles(dir, visitFile)
}

const getFiles = async (dir, visit) => {
  return fs.readdir(dir).then(async files => {
    const jsonFiles = files.filter(file => file.endsWith('.json'))
    jsonFiles.forEach(file => visit(path.join(dir, file)))
    const subdirs = files.filter(file => fs.statSync(path.join(dir, file)).isDirectory())
    return Promise.all(subdirs.map(subdir => getFiles(path.join(dir, subdir), visit)))
  })
}

// const traverseDirBatch = async (db, dir, visitFile) => {

//   let allFiles = []
//   const visit = files => { allFiles = allFiles.concat(files) }
//   await getFiles(dir, visit)
//   allFiles.forEach(file => visitFile(file))
//   return allFiles
// }

// const getFiles = async (dir, visit) => {
//   return fs.readdir(dir).then(async files => {
//     const jsonFiles = files.filter(file => file.endsWith('.json'))
//     const fullJsonFiles = jsonFiles.map(file => path.join(dir, file))
//     visit(fullJsonFiles)
//     const subdirs = files.filter(file => fs.statSync(path.join(dir, file)).isDirectory())
//     return Promise.all(subdirs.map(subdir => getFiles(path.join(dir, subdir), visit)))
//   })
// }


// const addFile = async (db, dir, file, collectionPath) => {
//   const json = fs.readJsonSync(path.join(dir, file))
//   const doc = FirestoreMapper(json)
//   const id = path.parse(file).name
//   try {
//     const docRef = db.collection(collectionPath).doc(id)
//     return docRef.set(doc)
//   } catch (error) {
//     return Promise.reject(error)
//   }
// }

// const Fail = function(reason) { this.reason=reason }
// const isFail = o => (o && o.constructor) === Fail
// const requestAsPromise = fullUri =>
//   new Promise(
//     (resolve,reject)=>
//       request({
//         url: fullUri
//       }, 
//       (err, res, body) => {
//         console.log("Request callback fired...");
//         if (err || res.statusCode !== 200) reject(err);
//         console.log("Success:",fullUri);
//         resolve([res,body]);
//       })
//   )
// const process = 
//   handleBatchResult =>
//   batchSize =>
//   maxFunction =>
//   urls =>
//     Promise.all(
//       urls.slice(0,batchSize)
//       .map(
//         url=>
//           maxFunction(requestAsPromise)(url)
//           .catch(err=>new Fail([err,url]))//catch reject and resolve with fail object
//       )
//     )
//     .then(handleBatch)
//     .catch(panic=>console.error(panic))
//     .then(//recursively call itself with next batch
//       _=>
//         process(handleBatchResult)(batchSize)(maxFunction)(urls.slice(batchSize))
//     );

// const handleBatch = results =>{//this will handle results of a batch
//   //maybe write successes to file but certainly write failed
//   //  you can retry later     
//   const successes = results.filter(result=>!isFail(result));
//   //failed are the requests that failed
//   const failed = results.filter(isFail);
//   //To get the failed urls you can do
//   const failedUrls = failed.map(([error,url])=>url);
// };

// const per_batch_1000_max_10_active = 
//   process (handleBatch) (1000) (lib.throttle(10));

// //start the process
// per_batch_1000_max_10_active(largeArrayOfUrls)
// .then(
//   result=>console.log("Process done")
//   ,err=>console.error("This should not happen:".err)
// )

module.exports = traverseDirBatch