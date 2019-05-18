const chalk = require('chalk')

const traverse = async (db, basePath, path, visit) => {
  console.log(chalk.blue(`traverse: basePath='${basePath}', path='${path}'`))
  const names = path.split('/*/')
  if (names.length === 1) {
    if (names[0].length === 0) {
      return []
    } else {
      const collectionPath = basePath ? `${basePath}/${names[0]}` : names[0]
      console.log(chalk.blue(`traverse 1-level: colRef: '${collectionPath}`))
      var collectionRef = db.collection(collectionPath)
      return collectionRef.get().then(snapshot => {
        return Promise.all(snapshot.docs.map(async doc => {
           return visit(doc)
        }))
      })
    }
  } else {
    const collectionPath = basePath ? `${basePath}/${names[0]}` : names[0]
    console.log(chalk.blue(`traverse recursive: path='${collectionPath}'`))
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

module.exports = traverse