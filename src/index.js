const fs = require('fs-extra')
const path = require('path')
const admin = require('firebase-admin')
const pino = require('pino')()

const PUBLIC_BUNDLE_DATA_PATH = './data/public-bundles'
const PUBLIC_BUNDLES_COLLECTION = 'public-bundles'
const USER_BUNDLE_DATA_PATH = './data/users'
const USER_COLLECTION = 'users'
const BACKUP_BASE_PATH = './backups'


main()

function main() {
  var serviceAccount = require('../.keys/TestProject-511552424481')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  var db = admin.firestore()  
  setupData(db)
}

async function setupData(db) {
  try {
    // Uncomment the following lines to make changes
    // TODO: implement CLI commands for these
    
    //await deleteData(db, 'public-bundles')
    //await deleteUsers(db)
    //await addPublicBundles(db)
    //await addUserBundles(db)
    //await backup(db, BACKUP_BASE_PATH)

    pino.info('Setup data complete')
  } catch (error) {
    pino.error(error, 'Setup data error')
  }
}

function backup(db, backupBasePath) {
  // create a backup directory with timestamp under backupPath
  var dateDirName = new Date().toISOString().replace(/\:/g, '-')
  const backupDir = path.join(backupBasePath, dateDirName)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir)
  }

  return backupPublicBundles(db, backupDir).then( () => {
    return backupAllUserBundles(db, backupDir)
  })
}

function backupPublicBundles(db, backupDir) {
  const dir = path.join(backupDir, 'public-bundles')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  var collectionRef = db.collection(PUBLIC_BUNDLES_COLLECTION)
  return collectionRef.get().then(snapshot => {
    return Promise.all(snapshot.docs.map(doc => {
      return fs.writeJson(path.join(dir, doc.id + '.json'), doc.data())
    }))
  })
}

function backupAllUserBundles(db, backupDir) {
  const dir = path.join(backupDir, 'users')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  var userCollectionRef = db.collection(USER_COLLECTION)
  return userCollectionRef.select().get().then(snapshot => {
    return Promise.all(snapshot.docs.map(doc => {
      return backupUserBundles(db, dir, doc.id)
    }))
  })
}

function backupUserBundles(db, backupDir, userId) {
  const userBackupDir = path.join(backupDir, userId)
  if (!fs.existsSync(userBackupDir)) {
    fs.mkdirSync(userBackupDir)
  }

  const userBundlesBackupDir = path.join(userBackupDir, 'bundles')
  if (!fs.existsSync(userBundlesBackupDir)) {
    fs.mkdirSync(userBundlesBackupDir)
  }

  var collectionRef = db.collection(USER_COLLECTION + '/' + userId + '/bundles')
  return collectionRef.get().then(snapshot => {
    return Promise.all(snapshot.docs.map(doc => {
      return fs.writeJson(path.join(userBundlesBackupDir, doc.id + '.json'), doc.data())
    }))
  })
}

function addUserBundles(db) {
  return fs.readdir(USER_BUNDLE_DATA_PATH).then( files => {
    files.map(file => {
      return path.join(USER_BUNDLE_DATA_PATH, file)
    }).filter(file => {
      return fs.statSync(file).isDirectory()
    }).map(file => {
      return addUserBundlesFromDir(db, path.join(file, 'bundles'), path.basename(file))
    })
  })
}

function addUserBundlesFromDir(db, dir, userId) {
  return fs.readdir(dir).then(files => {
    var userRef = db.collection(USER_COLLECTION).doc(userId)
    userRef.set({})
    return Promise.all(files.filter(file => file.endsWith('.json')).map(file => addUserBundle(db, dir, file, userId)))
  })
}

function addUserBundle(db, dir, file, userId) {
  return fs.readJson(path.join(dir, file)).then(json => {
    var bundleRef = db.collection(USER_COLLECTION + '/' + userId + '/bundles').doc(json.id)
    bundleRef.set(json)
  })
}
  
function addPublicBundles(db) {
  return fs.readdir(PUBLIC_BUNDLE_DATA_PATH).then( files => {
    return Promise.all(files.filter(file => file.endsWith('.json')).map( file => addPublicBundle(db, file)))
  })
}

function addPublicBundle(db, file) {
  return fs.readJson(PUBLIC_BUNDLE_DATA_PATH + '/' + file).then(json => {
    var bundleRef = db.collection(PUBLIC_BUNDLES_COLLECTION).doc(json.id)
    bundleRef.set(json);
  })
}
  

  // fs.readdir('./data/public-bundles', (err, files) => {
  //   files.forEach(file => {
  //     console.log(file);
  //   });
  // })
  
  // get bundles from filesystem
  // var bundle = JSON.parse(fs.readFileSync('./bundles/bundle1.json', 'utf8'));


function deleteData(db, path) {
  return deleteCollection(db, path, 100).then(() => {
    pino.info('Deleted collection ' + path)
  })
}

function deleteUsers(db) {
  var collectionRef = db.collection(USER_COLLECTION);
  var query = collectionRef.select()
  return new Promise((resolve, reject) => {
    query.get()
    .then((snapshot) => {
        // When there are no documents left, we are done
        if (snapshot.size == 0) {
            resolve()
            return
        }
  
        Promise.all(snapshot.docs.map(doc => {
          return deleteCollection(db, USER_COLLECTION + '/' + doc.id + '/bundles', 100)
        })).then( () => {

          return deleteCollection(db, USER_COLLECTION, 100)
        }).then( () => {
          resolve()
        })
    })
    .catch(reject);  
  });
}


function deleteCollection(db, collectionPath, batchSize) {
  var collectionRef = db.collection(collectionPath);
  var query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
      deleteQueryBatch(db, query, batchSize, resolve, reject);
  });
}

function deleteQueryBatch(db, query, batchSize, resolve, reject) {
  query.get()
      .then((snapshot) => {
          // When there are no documents left, we are done
          if (snapshot.size == 0) {
              return 0;
          }

          // Delete documents in a batch
          var batch = db.batch();
          snapshot.docs.forEach((doc) => {
              batch.delete(doc.ref);
          });

          return batch.commit().then(() => {
              return snapshot.size;
          });
      }).then((numDeleted) => {
          if (numDeleted === 0) {
              resolve();
              return;
          }

          // Recurse on the next process tick, to avoid
          // exploding the stack.
          process.nextTick(() => {
              deleteQueryBatch(db, query, batchSize, resolve, reject);
          });
      })
      .catch(reject);
}


// read file

// var bundle = JSON.parse(fs.readFileSync('./bundles/bundle1.json', 'utf8'));

/*
var fs = require('fs');
var obj;
fs.readFile('file', 'utf8', function (err, data) {
  if (err) throw err;
  obj = JSON.parse(data);
});
*/

// duanewood@gmail.com uid: YGYEX1XCeTP9LSBcJ2POZqRiB6A2

// var bundleRef = db.collection('bundles').doc('44ED5985-B0E9-494B-8DFF-B838FF2E7F13')
// var setBundle = bundleRef.set(bundle);

// pino.info('set bundle', setBundle)

/*
var aTuringRef = db.collection('users').doc('aturing')

var setAlan = aTuringRef.set({
    'first': 'Alan',
    'middle': 'Mathison',
    'last': 'Turing',
    'born': 1912
});
  

var addDoc = db.collection('cities').add({
  name: 'Tokyo',
  country: 'Japan'
}).then(ref => {
  console.log('Added document with ID: ', ref.id);
});

*/