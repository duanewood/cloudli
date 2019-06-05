"use strict"

const admin = require('firebase-admin')
const chalk = require("chalk")
const ProgressBar = require("progress")
const Snapshot = require("./snapshot")
const moment = require('moment')

/**
 * TraverseBatch allows batch processing of documents in a Firestore database.
 * The path can be a document or a collection and allows shallow or recursive traversal 
 * of descendent documents.
 * 
 * The supplied visit function is called for each selected document with a doc object.
 * The doc parameter to the function is a simulation of DocumentSnapshot
 * but only contains id, name, and ref.path properties, and data() funciton.
 * 
 * This code was adapted from the FirestoreDelete class in the google firebase-tools 
 * project on github.  
 * 
 * The approach is to use the runQuery api that takes a StructuredQuery and then iterate 
 * over the result in batches using a queueLoop (@see #_recursiveBatchVisit).  
 * 
 * Note that there are tunable parameters in _recursiveBatchVisit:
 * 
 *    readBatchSize - limit for query (1000)
 *    visitBatchSize - number to visit at one time (100)
 *    maxPendingVisits - max number of visit batches to run concurrently (original: 1)
 * 
 *    Note: Each visitBatch is a Promise.all of async visit calls so the potential promise count
 *          for visit calls can be up to visitBatchSize * maxPendingVisits.  These parameters
 *          were originally selected because the visitBatches were one call to delete a collection
 *          of document id's in the FirestoreDelete code.  Since each document is now visited 
 *          separately, the number of promises is higher.
 * 
 * @see https://github.com/firebase/firebase-tools/blob/master/src/firestore/delete.js
 * @see https://cloud.google.com/nodejs/docs/reference/firestore/1.3.x/v1.FirestoreClient#runQuery
 * @see https://cloud.google.com/nodejs/docs/reference/firestore/1.3.x/google.firestore.v1#.StructuredQuery
 */


/**
 * Construct a new Traverse Batch object
 *
 * @constructor
 * @param {object} FirestoreClient object
 * @param {string} project the Firestore project ID.
 * @param {string} path path to a document or collection.  If null or undefined, will include all root collections.
 * @param {boolean} options.recursive true if the traverse should be recursive.
 * @param {boolean} options.shallow true if the traverse should be shallow (non-recursive).
 * @param {boolean} options.min true will only return name, id, and ref.path in document snaphot for visit
 * @param {string} options.collectionId if set, will only include documents from collections with collectionId
 * @param {string} options.filterRegex if set, will only include documents with path that matches the regex.
 *                 WARNING: This filter is applied after receiving the results from the query
 *                          before calling visit function so consider performance / load considerations.
 *                          Use path and collectionId to filter the query and then apply filterRegex.
 * @param {function(doc)} visit async function called for each document.  
 *                        The doc parameter to the function is a simulation of DocumentSnapshot
 *                        but only contains id, name, and ref.path properties, and data() funciton.
 */
function TraverseBatch(client, project, path, options, visit) {
  this.client = client
  this.visit = visit
  this.project = project
  this.path = path
  this.recursive = Boolean(options.recursive)
  this.shallow = Boolean(options.shallow)
  this.min = Boolean(options.min)
  this.collectionId = options.collectionId
  this.filterRegex = options.filterRegex ? RegExp(options.filterRegex) : null
  
  // Remove any leading or trailing slashes from the path
  if (this.path) {
    this.path = this.path.replace(/(^\/+|\/+$)/g, "")
  }

  this.isDocumentPath = this._isDocumentPath(this.path)
  this.isCollectionPath = this._isCollectionPath(this.path)

  this.allDescendants = this.recursive
  this.parent = "projects/" + project + "/databases/(default)/documents"
}

/**
 * Validate all options, throwing an exception for any fatal errors.
 */
TraverseBatch.prototype._validateOptions = function() {
  if (this.recursive && this.shallow) {
    throw new Error(
      "Cannot pass recursive and shallow options together."
    )
  }

  if (this.isCollectionPath && !this.recursive && !this.shallow) {
    throw new Error(
      "Must pass recursive or shallow option when processing a collection."
    )
  }

  if (this.path) {
    var pieces = this.path.split("/")

    if (pieces.length === 0) {
      throw new Error("Path length must be greater than zero.")
    }
  
    var hasEmptySegment = pieces.some(function(piece) {
      return piece.length === 0
    })
  
    if (hasEmptySegment) {
      throw new Error("Path must not have any empty segments.")
    }  
  }
}

/**
 * Applies filterRegex to the current Document.
 * 
 * @param {Document} doc the Document returned from a query.  Must contain name property. 
 * @return {boolean} true if filterRegex is set and matches the name of the current doc.
 *            The name is determined by stripping off the parent prefix (database prefix), if matches.
 */
TraverseBatch.prototype._filterDoc = function(doc) {
  if (!this.filterRegex) {
    return true    
  }

  const database = this.parent
  const path = database && doc.name.startsWith(database) ? doc.name.slice(database.length + 1) : doc.name
  return this.filterRegex.test(path)
}

/**
 * Determine if a path points to a document.
 *
 * @param {string} path a path to a Firestore document or collection.
 * @return {boolean} true if the path points to a document, false
 * if it points to a collection.
 */
TraverseBatch.prototype._isDocumentPath = function(path) {
  if (!path) {
    return false
  }

  var pieces = path.split("/")
  return pieces.length % 2 === 0
}

/**
 * Determine if a path points to a collection.
 *
 * @param {string} path a path to a Firestore document or collection.
 * @return {boolean} true if the path points to a collection, false
 * if it points to a document.
 */
TraverseBatch.prototype._isCollectionPath = function(path) {
  if (!path) {
    return false
  }

  return !this._isDocumentPath(path)
}

/**
 * Construct a StructuredQuery to find descendant documents of a collection.
 *
 * See:
 * https://firebase.google.com/docs/firestore/reference/rest/v1beta1/StructuredQuery
 *
 * @param {boolean} allDescendants true if subcollections should be included.
 * @param {number} batchSize maximum number of documents to target (limit).
 * @param {string=} startAfter document name to start after (optional).
 * @return {object} a StructuredQuery.
 */
TraverseBatch.prototype._collectionDescendantsQuery = function(
  allDescendants,
  batchSize,
  startAfter
) {
  var nullChar = String.fromCharCode(0)

  let startAt = this.parent + "/" + this.path + "/" + nullChar
  let endAt = this.parent + "/" + this.path + nullChar + "/" + nullChar  

  // const startOfToday = admin.firestore.Timestamp.fromDate(moment().startOf('day').toDate())

  var where = {
    compositeFilter: {
      op: "AND",
      filters: [
        {
          fieldFilter: {
            field: {
              fieldPath: "__name__"
            },
            op: "GREATER_THAN_OR_EQUAL",
            value: {
              referenceValue: startAt
            }
          }
        },
        {
          fieldFilter: {
            field: {
              fieldPath: "__name__"
            },
            op: "LESS_THAN",
            value: {
              referenceValue: endAt
            }
          }
        }
        // , {
        //   fieldFilter: {
        //     field: {
        //       fieldPath: "updateTimestamp"
        //     },
        //     op: "GREATER_THAN_OR_EQUAL",
        //     value: {              
        //       timestampValue: startOfToday
        //     }
        //   }
        // }
      ]
    }
  }

  var query = {
    structuredQuery: {
      where: where,
      limit: { value: batchSize },
      from: [
        {
          allDescendants: allDescendants
        }
      ],
      orderBy: [{ field: { fieldPath: "__name__" } }]
    }
  }

  if (this.min) {
    query.structuredQuery.select = {
      fields: [{ fieldPath: "__name__" }]
    }
  }

  if (this.collectionId) {
    query.structuredQuery.from[0].collectionId = this.collectionId
  }

  if (startAfter) {
    query.structuredQuery.startAt = {
      values: [{ referenceValue: startAfter }],
      before: false
    }
  }

  return query
}

/**
 * Construct a StructuredQuery to find descendant documents of a document.
 * The document itself will not be included
 * among the results.
 *
 * See:
 * https://firebase.google.com/docs/firestore/reference/rest/v1beta1/StructuredQuery
 *
 * @param {boolean} allDescendants true if subcollections should be included.
 * @param {number} batchSize maximum number of documents to target (limit).
 * @param {string=} startAfter document name to start after (optional).
 * @return {object} a StructuredQuery.
 */
TraverseBatch.prototype._docDescendantsQuery = function(
  allDescendants,
  batchSize,
  startAfter
) {
  var query = {
    structuredQuery: {
      limit: { value: batchSize },
      from: [
        {
          allDescendants: allDescendants
        }
      ],
      orderBy: [{ field: { fieldPath: "__name__" } }]
    }
  }

  if (this.min) {
    query.structuredQuery.select = {
      fields: [{ fieldPath: "__name__" }]
    }
  }

  if (this.collectionId) {
    query.structuredQuery.from[0].collectionId = this.collectionId
  }

  if (startAfter) {
    query.structuredQuery.startAt = {
      values: [{ referenceValue: startAfter }],
      before: false
    }
  }

  return query
}

/**
 * Query for a batch of 'descendants' of a given path.
 *
 * For document format see:
 * https://firebase.google.com/docs/firestore/reference/rest/v1beta1/Document
 *
 * @param {boolean} allDescendants true if subcollections should be included,
 * @param {number} batchSize the maximum size of the batch.
 * @param {string=} startAfter the name of the document to start after (optional).
 * @return {Promise<object[]>} a promise for an array of documents.
 */
TraverseBatch.prototype._getDescendantBatch = function(
  allDescendants,
  batchSize,
  startAfter
) {
  let parent
  let structuredQuery
  if (this.isDocumentPath) {
    parent = this.parent + "/" + this.path
    structuredQuery = this._docDescendantsQuery(allDescendants, batchSize, startAfter).structuredQuery
  } else {
    parent = this.parent
    structuredQuery = this._collectionDescendantsQuery(
      allDescendants,
      batchSize,
      startAfter
    ).structuredQuery
  }

  return new Promise((resolve, reject) => {
    let docs = []
    this.client.runQuery({ parent, structuredQuery })
      .on('data', response => {
        if (response.document) {
          docs.push(response.document)
        }
      }).on('end', response => {
        resolve(docs)
      }).on('error', error => {
        reject(error)
      })
  })
}

/**
 * Progress bar shared by the class.
 * 
 * TODO: consider generalizing for callback (in visitor)
 */
TraverseBatch.progressBar = new ProgressBar(
  "Processed :current docs (:rate docs/s)",
  {
    total: Number.MAX_SAFE_INTEGER
  }
)

/**
 * Repeatedly query for descendants of a path and process them in batches
 *
 * @return {Promise} a promise for the entire operation.
 */
TraverseBatch.prototype._recursiveBatchVisit = function() {
  var self = this

  // Tunable visit parameters
  var readBatchSize = 1000  // delete was 7500
  var visitBatchSize = 100  // delete was 250 
  var maxPendingVisits = 1  // delete was 15
  var maxQueueSize = visitBatchSize * maxPendingVisits * 2

  // All temporary variables for the visit queue.
  var queue = []
  var numPendingVisits = 0
  var pagesRemaining = true
  var pageIncoming = false
  var lastDocName

  var failures = []
  var retried = {}

  var queueLoop = function() {
    if (queue.length == 0 && numPendingVisits == 0 && !pagesRemaining) {
      return true
    }

    if (failures.length > 0) {
      console.error("Found " + failures.length + " failed visits, failing.")
      return true
    }

    if (queue.length <= maxQueueSize && pagesRemaining && !pageIncoming) {
      pageIncoming = true

      self
        ._getDescendantBatch(self.allDescendants, readBatchSize, lastDocName)
        .then(function(docs) {
          pageIncoming = false

          if (docs.length == 0) {
            pagesRemaining = false
            return
          }

          if (self.filterRegex) {
            const filteredDocs = docs.filter(doc => self._filterDoc(doc))
            queue = queue.concat(filteredDocs)
          } else {
            queue = queue.concat(docs)
          }
          lastDocName = docs[docs.length - 1].name
        })
        .catch(function(e) {
          console.error("Failed to fetch page after " + lastDocName, e)
          pageIncoming = false
        })
    }

    if (numPendingVisits > maxPendingVisits) {
      return false
    }

    if (queue.length == 0) {
      return false
    }

    var toVisit = []
    var numToVisit = Math.min(visitBatchSize, queue.length)

    for (var i = 0; i < numToVisit; i++) {
      toVisit.push(queue.shift())
    }

    numPendingVisits++

    // Call the visit function in batches (toVisit array)
    //
    // TODO: consider having a configurable batchVisitor with this Promise.all - toVisit
    //       - could provide efficiencies for operations that could be processed in batches
    //       - default would do what is here
    //       - batchVisitor could take the visit function and could have default
    //       - Note: also update the call to visit for the top level document
    // TODO: consider sync, async options
    //      - could be more efficient for sync operations
    Promise.all(toVisit.map(async doc => {
      return self.visit(new Snapshot(doc, self.parent)).then(() => {
        TraverseBatch.progressBar.tick(1)
      })
    })).then(() =>  {
        numPendingVisits--
    }).catch(error => {
      console.error("Fatal error processing docs ")
      failures = failures.concat(toVisit)
      numPendingVisits--
    })

    return false
  }

  return new Promise((resolve, reject) => {
    var intervalId = setInterval(() => {
      if (queueLoop()) {
        clearInterval(intervalId)

        if (failures.length == 0) {
          resolve()
        } else {
          const failuresList = failures.map(failure => {
            return new Snapshot(failure, self.parent).ref.path
          }).join(', ')
          reject(new Error("Failed to process documents " + failuresList))
        }
      }
    }, 0)
  })
}

const docCollectionIdRegex = new RegExp('(?:^.*\/|^)([^/]+)\/[^/]+$')

/**
 * Visits everything under a given path. If the path represents
 * a document the document is processed and then all descendants
 * are processed.
 *
 * @return {Promise} a promise for the entire operation.
 */
TraverseBatch.prototype._visitPath = function() {
  var self = this
  var initialVisit
  if (this.isDocumentPath) {

    // if there is a collectionId, don't visit if the parent collection is not
    if (self.collectionId) {
      const results = docCollectionIdRegex.exec(this.path)
      if (!results || results.length < 2 || results[1] !== this.collectionId) {
        initialVisit = Promise.resolve()
      }
    }
    
    if (!initialVisit) {
      initialVisit = this.client.getDocument({ name: this.parent + "/" + this.path })
        .then(responses => {
          const doc = responses[0]

          // if there is a filterRegex, only visit if matches
          if (self._filterDoc(doc)) {
            return self.visit(new Snapshot(doc, self.parent)).then(() => {
              TraverseBatch.progressBar.tick(1)
            })  
          } else {
            return Promise.resolve()
          }
        }).catch(err => {
          console.log("visitPath:initialVisit:error", err)
          if (self.allDescendants) {
            // On a recursive visit, we are insensitive to
            // failures of the initial visit
            return Promise.resolve()
          }

          // For a shallow visit, this error is fatal.
          return Promise.reject(new Error("Unable to process " + chalk.cyan(this.path)))
        })
    }
  } else {
    initialVisit = Promise.resolve()
  }

  return initialVisit.then(() => {
    if (this.isDocumentPath && !this.shallow && !this.recursive) {
      return Promise.resolve()
    } else {
      return self._recursiveBatchVisit()
    }
  })
}

/**
 * Visit an entire database by finding and visiting each collection.
 *
 * @return {Promise} a promise for all of the operations combined.
 */
TraverseBatch.prototype.visitDatabase = function() {
  var self = this
  return this.client.listCollectionIds({ parent: this.parent })
    .catch(function(err) {
      console.error("visitDatabase:listCollectionIds:error")
      return Promise.reject(new Error("Unable to list collection IDs"))
    })
    .then(function([collectionIds]) {
      var promises = []

      console.info(
        "Visiting the following collections: " +
          collectionIds.join(", ")
      )

      for (var i = 0; i < collectionIds.length; i++) {
        var collectionId = collectionIds[i]
        // var visitOp = new TraverseBatch(self.client, self.project, collectionId, {
        //   recursive: true
        // }, self.visit)

        const options = {
          shallow: self.shallow,
          recursive: self.recursive,
          min: self.min,
          filterRegex: self.filterRegex,
        }

        if (self.collectionId) {
          options.collectionId = self.collectionId
        }

        var visitOp = new TraverseBatch(self.client, self.project, collectionId, options, self.visit)

        promises.push(visitOp.execute())
      }

      return Promise.all(promises)
    })
}

/**
 * Check if a path has any children. Useful for determining
 * if visiting a path will affect more than one document.
 *
 * @return {Promise<boolean>} a promise that retruns true if the path has
 * children and false otherwise.
 */
TraverseBatch.prototype.checkHasChildren = function() {
  return this._getDescendantBatch(true, 1).then(function(docs) {
    return docs.length > 0
  })
}

/**
 * Run the visit operation.
 */
TraverseBatch.prototype.execute = function() {
  var self = this
  if (self.path) {
    return self._visitPath().then(() => {
      TraverseBatch.progressBar.render(undefined, true) // force update of progress bar
      console.log()
    })
  } else {
    return self.visitDatabase()
  }
}

module.exports = TraverseBatch
