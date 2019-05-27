const chalk = require('chalk')

const traverse = async (db, basePath, path, visit) => {
  // console.log(chalk.blue(`traverse: basePath='${basePath}', path='${path}'`))
  const names = path.split('/*/')
  if (names.length === 1) {
    if (names[0].length === 0) {
      return []
    } else {
      const collectionPath = basePath ? `${basePath}/${names[0]}` : names[0]
      // console.log(chalk.blue(`traverse 1-level: colRef: '${collectionPath}`))
      var collectionRef = db.collection(collectionPath)
      return collectionRef.get().then(snapshot => {
        return Promise.all(snapshot.docs.map(async doc => {
           return visit(doc)
        }))
      })
    }
  } else {
    const collectionPath = basePath ? `${basePath}/${names[0]}` : names[0]
    // console.log(chalk.blue(`traverse recursive: path='${collectionPath}'`))
    var collectionRef = db.collection(collectionPath)
    return collectionRef.get().then(snapshot => {
      return Promise.all(snapshot.docs.map(doc => {
        const remaining = names.slice(1).join('/*/')
        return traverse(db, `${collectionPath}/${doc.id}`, remaining, visit)
      })).then(results => {
        return [].concat(...results)
      })
    })
  }
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

// async function traverseBatch(db, basePath, path, visit) {
//   // console.log(chalk.blue(`traverse: basePath='${basePath}', path='${path}'`))
//   const names = path.split('/*/')
//   if (names.length === 1) {
//     if (names[0].length === 0) {
//       return []
//     } else {
//       const collectionPath = basePath ? `${basePath}/${names[0]}` : names[0]
//       // console.log(chalk.blue(`traverse 1-level: colRef: '${collectionPath}`))

//       // TODO: start rewrite to batch processing
//       var collectionRef = db.collection(collectionPath)
//       return collectionRef.get().then(snapshot => {
//         return Promise.all(snapshot.docs.map(async doc => {
//            return visit(doc)
//         }))
//       })
//       // TODO: end rewrite
//     }
//   } else {
//     const collectionPath = basePath ? `${basePath}/${names[0]}` : names[0]
//     // console.log(chalk.blue(`traverse recursive: path='${collectionPath}'`))

//     // TODO: start rewrite to batch processing
//     var collectionRef = db.collection(collectionPath)
//     return collectionRef.get().then(snapshot => {
//       return Promise.all(snapshot.docs.map(doc => {
//         const remaining = names.slice(1).join('/*/')
//         return traverseBatch(db, `${collectionPath}/${doc.id}`, remaining, visit)
//       })).then(results => {
//         return [].concat(...results)
//       })
//     })
//     // TODO: end rewrite
//   }
// }

// const visitBatch = visit => async docs => {
//   docs.forEach(doc => {
//     visit(doc)
//   })  
// }

// // TODO: write this
// const recurseBatch = visit => async docs => {
//   docs.forEach(doc => {
//     visit(doc)
//   })  
// }


// function processCollection(db, collectionPath, batchSize, visitBatch) {
//   const collectionRef = db.collection(collectionPath)
//   const query = collectionRef.orderBy('__name__').limit(batchSize)

//   return new Promise((resolve, reject) => {
//     processQueryBatch(db, query, batchSize, visitBatch, resolve, reject, visitBatch)
//   })
// }

// function processQueryBatch(db, query, batchSize, resolve, reject, visitBatch) {
//   query.get()
//   .then(snapshot => {
//     // When there are no documents left, we are done
//     if (snapshot.size == 0) {
//       return 0
//     }

//     return visitBatch(snapshot.docs).then(() => {
//       return snapshot.size
//     })
//   }).then((numProcessed => {
//     if (numProcessed === 0) {
//       resolve()
//       return
//     }

//     // Recurse on the next process tick, to avoid
//     // exploding the stack
//     process.nextTick(() => {
//       processQueryBatch(db, query, batchSize, resolve, reject, visitBatch)
//     })
//   }).catch(reject)
// }


module.exports = {
  traverse,
  visitLogger,
  visit
}
