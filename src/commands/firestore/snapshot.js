const FirestoreParser = require('firestore-parser')

/**
 * A wrapper object that similates a Firestore DocumentSnapshot from a 
 * Firestore REST service Document.
 * 
 * Only supports:
 * - id - the id of the docuument
 * - ref.path - the path to the document
 * - data() - returns the document data
 * 
 * @param {Document} doc the REST service Document
 *          @see https://cloud.google.com/nodejs/docs/reference/firestore/1.3.x/google.firestore.v1.html#.Document
 * @param {string} [database] the optional path to the root documents of the database
 * 
 * For DocumentSnapshot, @see https://firebase.google.com/docs/reference/js/firebase.firestore.DocumentSnapshot
 */
function Snapshot(doc, database) {
  this.fields = doc.fields
  this.name = doc.name

  const lastSlash = doc.name.lastIndexOf('/')
  const start = lastSlash < 0 ? 0 : lastSlash + 1
  this.id = doc.name.slice(start)


  const path = database && doc.name.startsWith(database) ? doc.name.slice(database.length + 1) : doc.name
  this.ref = { path }
}

Snapshot.prototype.data = function() {
  return FirestoreParser(this.fields)
}

module.exports = Snapshot