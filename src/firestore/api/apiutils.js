/**
 * Determine if a path points to a document.
 *
 * @param {string} path a path to a Firestore document or collection.
 * @return {boolean} true if the path points to a document, false
 * if it points to a collection.
 */
const isDocumentPath = path => {
  if (!path) {
    return false
  }

  var pieces = path.split('/')
  return pieces.length % 2 === 0
}

/**
 * Determine if a path points to a collection.
 *
 * @param {string} path a path to a Firestore document or collection.
 * @return {boolean} true if the path points to a collection, false
 * if it points to a document.
 */
const isCollectionPath = path => {
  if (!path) {
    return false
  }

  return !isDocumentPath(path)
}

module.exports = {
  isDocumentPath,
  isCollectionPath
}

